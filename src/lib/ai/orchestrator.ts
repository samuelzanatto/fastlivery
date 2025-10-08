import Fuse from 'fuse.js';
import { getSupplierServices, addServiceToCart, viewCart, removeFromCart, finalizeOrder } from './agent';
import { processWhatsAppMessage as processLLM } from './agent';
import { appendHistory, setCatalog, getRecentCatalog, setLastAddedItem, setPendingAction, peekPendingAction, consumePendingAction, summarizeRecentHistory, getSession } from './memory';

// Intent definitions
export type OrchestratorIntent =
  | 'GREETING'
  | 'LIST_PRODUCTS'
  | 'ADD_TO_CART'
  | 'REMOVE_FROM_CART'
  | 'VIEW_CART'
  | 'FINALIZE_ORDER'
  | 'UNKNOWN';

interface OrchestratorResult {
  handled: boolean;
  response: string;
}

const greetingRegex = /^(oi|olá|ola|bom dia|boa tarde|boa noite|e ai|e aí|hey)\b/i;
const listRegex = /(listar|lista|cat[aá]logo|produtos|serviços|servicos)\b/i;
// Inclui variações conjugadas comuns: adicione, adicionar, adiciona, põe, por, coloca, incluir
const addRegex = /(adicione|adicionar|adiciona|add|colocar|coloca|incluir|por|p[oô]e)\b/i;
const removeRegex = /(remover|tirar|excluir|apagar|retirar|remova|limpar carrinho|esvaziar)/i;
// Removido 'meu' para evitar captura de frases de adicionar com '... ao meu carrinho'
const viewCartRegex = /((^|\s)(ver|mostrar)\s.*carrinho|carrinho$)/i;
// Inclui variações imperativas: feche, finalize, conclua
const finalizeRegex = /((finalizar|finalize|fechar|feche|concluir|conclua|confirmar|confirmar|confirmar).*pedido|fazer pedido|fechar pedido|feche o pedido|finalize o pedido)/i;

function detectIntent(message: string): OrchestratorIntent {
  const msg = message.toLowerCase();
  if (greetingRegex.test(msg)) return 'GREETING';
  if (finalizeRegex.test(msg)) return 'FINALIZE_ORDER';
  if (removeRegex.test(msg)) return 'REMOVE_FROM_CART';
  if (addRegex.test(msg)) return 'ADD_TO_CART';
  if (viewCartRegex.test(msg)) return 'VIEW_CART';
  if (listRegex.test(msg)) return 'LIST_PRODUCTS';
  return 'UNKNOWN';
}

interface AddParseResult { quantity?: number; term?: string }
function parseAddMessage(message: string): AddParseResult {
  // extrai primeiro número como quantity e resto como termo aproximado
  const numberMatch = message.match(/(\d+[\.,]?\d*)/);
  let quantity: number | undefined;
  if (numberMatch) {
    quantity = parseInt(numberMatch[1].replace(/\D/g, ''), 10);
    if (Number.isNaN(quantity) || quantity <= 0) quantity = undefined;
  }
  // Remove verbo adicionar e números para extrair termo
  let term: string | undefined = message.toLowerCase()
    .replace(addRegex, '')
    .replace(/\d+[\.,]?\d*/g, '')
    .replace(/no meu carrinho|no carrinho|ao carrinho|carrinho/g, '')
    .trim();
  if (!term || term.length === 0) term = undefined;
  return { quantity, term };
}

interface FuzzyResult<T> { item: T | null; score: number | null }
async function fuzzyFindService<T extends { id: string; name: string }>(services: T[], rawTerm?: string): Promise<FuzzyResult<T>> {
  if (!rawTerm) return { item: null, score: null };
  const fuse = new Fuse(services, { keys: ['name'], threshold: 0.6, ignoreLocation: true });
  const result = fuse.search(rawTerm);
  if (!result.length) return { item: null, score: null };
  return { item: result[0].item, score: result[0].score ?? null };
}

export async function orchestrateMessage(
  message: string,
  companyId: string,
  phone: string,
  customerName: string
): Promise<OrchestratorResult> {
  const intent = detectIntent(message);

  try {
    switch (intent) {
      case 'GREETING':
        return { handled: true, response: `Olá ${customerName.split(' ')[0]}! Posso listar produtos. Diga: "listar produtos" ou algo como: "adicionar 5 coca".` };
      case 'LIST_PRODUCTS': {
        const cached = getRecentCatalog(companyId, phone);
        const services = cached || await getSupplierServices(companyId);
        if (!cached) setCatalog(companyId, phone, services);
        if (services.length === 0) {
          return { handled: true, response: 'Nenhum produto disponível no momento ou sem parcerias ativas.' };
        }
        const top = services.slice(0, 10)
          .map(s => {
            type Full = { pricePerUnit?: number };
            type Cached = { price?: number };
            const maybeFull = s as Full;
            const maybeCached = s as Cached;
            const price = typeof maybeFull.pricePerUnit === 'number'
              ? maybeFull.pricePerUnit
              : (typeof maybeCached.price === 'number' ? maybeCached.price : undefined);
            return `- ${s.name}${typeof price === 'number' ? ` (R$ ${price.toFixed(2)})` : ''}`;
          })
          .join('\n');
        return { handled: true, response: `Catálogo inicial (até 10 itens):\n${top}\n\nPeça algo: "adicionar 3 Nome do Produto".` };
      }
      case 'VIEW_CART': {
        const cart = await viewCart(companyId, phone);
        if (cart.items.length === 0) return { handled: true, response: 'Seu carrinho está vazio.' };
        const lines = cart.items.map(i => `• ${i.serviceName} x${i.quantity} = R$ ${(i.total).toFixed(2)}`);
        return { handled: true, response: `Carrinho (${cart.itemCount} unid, total R$ ${cart.total.toFixed(2)}):\n${lines.join('\n')}\n\nPara remover: "remover 1 Nome" ou "limpar carrinho".` };
      }
      case 'ADD_TO_CART': {
        const { quantity, term } = parseAddMessage(message);
        // Caso sem termo: usar último item listado ou pendingAction
        if (!term) {
          const session = getSession(companyId, phone);
          // 1) pendingAction de ADD aguardando confirmação
          const pending = peekPendingAction(companyId, phone);
          if (pending && pending.type === 'ADD') {
            const addResult = await addServiceToCart(companyId, phone, pending.candidateId, pending.quantity || quantity || 1);
            setLastAddedItem(companyId, phone, { id: pending.candidateId, name: pending.candidateName, quantity: pending.quantity || quantity || 1 });
            consumePendingAction(companyId, phone);
            return { handled: true, response: addResult.message };
          }
          // 2) último item listado (se catálogo recente e único resultado anterior)
          if (session.lastListedServices && session.lastListedServices.length === 1) {
            const only = session.lastListedServices[0];
            const addResult = await addServiceToCart(companyId, phone, only.id, quantity || 1);
            setLastAddedItem(companyId, phone, { id: only.id, name: only.name, quantity: quantity || 1 });
            return { handled: true, response: addResult.message + ' (deduzi pelo último item listado).'};
          }
          return { handled: true, response: 'Preciso do nome do produto. Ex: "adicionar 2 coca". Ou liste com "listar produtos".' };
        }
        // tenta usar catálogo cacheado se termo casa parcialmente
        let services = await getSupplierServices(companyId, term);
        if (services.length === 0) {
          const cached = getRecentCatalog(companyId, phone);
            if (cached) {
              const fuseCache = new Fuse(cached, { keys: ['name'], threshold: 0.5, ignoreLocation: true });
              const fromCache = fuseCache.search(term).slice(0, 5).map(r => r.item);
              if (fromCache.length > 0) {
                // buscar detalhes completos desses ids
                const names = fromCache.map(c => c.name.toLowerCase());
                services = await getSupplierServices(companyId); // full
                services = services.filter(s => names.includes(s.name.toLowerCase()))
              }
            }
        }
        if (services.length === 0) return { handled: true, response: `Não encontrei produtos para "${term}". Tente listar novamente ou use outro nome.` };
        const { item: match, score } = await fuzzyFindService(services, term);
        if (!match) return { handled: true, response: 'Não consegui mapear o produto com segurança. Envie parte mais específica do nome ou liste produtos.' };
        const confidence = score !== null ? (1 - score) : 0; // score menor = melhor
        const qty = quantity || 1;
        if (confidence < 0.45) {
          setPendingAction(companyId, phone, { type: 'ADD', candidateId: match.id, candidateName: match.name, quantity: qty });
            return { handled: true, response: `Você quis dizer "${match.name}"? Responda "sim" para confirmar ou envie o nome correto.` };
        }
        const addResult = await addServiceToCart(companyId, phone, match.id, qty);
        setLastAddedItem(companyId, phone, { id: match.id, name: match.name, quantity: qty });
        return { handled: true, response: addResult.message + (addResult.cart ? ` Total estimado: R$ ${addResult.cart.total.toFixed(2)}.` : '') };
      }
      case 'REMOVE_FROM_CART': {
        const lower = message.toLowerCase();
        if (/limpar carrinho|esvaziar/.test(lower)) {
          const res = await removeFromCart(companyId, phone, undefined, undefined, true);
            return { handled: true, response: res.message };
        }
        // parse quantity + term
        const numberMatch = message.match(/(\d+)/);
        const qty = numberMatch ? parseInt(numberMatch[1], 10) : undefined;
        const term: string | undefined = lower
          .replace(removeRegex, '')
          .replace(/do carrinho|do meu carrinho|carrinho/g, '')
          .replace(/\d+/g, '')
          .trim();
        if (!term || term.length === 0) return { handled: true, response: 'Informe o item a remover. Ex: "remover 1 coca" ou "limpar carrinho".' };
        const cart = await viewCart(companyId, phone);
        if (cart.items.length === 0) return { handled: true, response: 'Carrinho já está vazio.' };
        const { item: match, score } = await fuzzyFindService(cart.items.map(i => ({ id: i.serviceId, name: i.serviceName })), term);
        if (!match) return { handled: true, response: 'Não identifiquei esse item no carrinho. Use "ver carrinho" para confirmar nomes.' };
        const confidence = score !== null ? (1 - score) : 0;
        if (confidence < 0.45) {
          setPendingAction(companyId, phone, { type: 'REMOVE', candidateId: match.id, candidateName: match.name, quantity: qty });
          return { handled: true, response: `Confirmar remoção de "${match.name}"? Responda "sim" para confirmar.` };
        }
        const res = await removeFromCart(companyId, phone, match.id, qty, false);
        return { handled: true, response: res.message };
      }
      case 'FINALIZE_ORDER': {
        const cart = await viewCart(companyId, phone);
        if (cart.items.length === 0) return { handled: true, response: 'Carrinho vazio. Adicione itens antes de finalizar.' };
  const confirm = /(confirm|sim|finalizar|finalize|fechar|feche|concluir|conclua)/.test(message.toLowerCase());
        if (!confirm) {
          return { handled: true, response: 'Confirme digitando: "finalizar pedido" ou "confirmar pedido".' };
        }
        const result = await finalizeOrder(companyId, phone, customerName);
        return { handled: true, response: result.message };
      }
      default:
        return { handled: false, response: '' };
    }
  } catch (err) {
    console.error('[Orchestrator] erro:', err);
    return { handled: true, response: 'Erro ao processar sua solicitação. Tente novamente.' };
  }
}

// Fallback integrando com o agente LLM apenas se não tratado
export async function processWithOrchestrator(
  message: string,
  companyId: string,
  phone: string,
  customerName: string
) {
  // Tratamento de confirmações simples "sim" / "não"
  const lower = message.trim().toLowerCase();
  if (/(^|\b)(sim|isso|confirmo|ok)(\b|$)/.test(lower)) {
    const pending = peekPendingAction(companyId, phone);
    if (pending) {
      if (pending.type === 'ADD') {
        const addResult = await addServiceToCart(companyId, phone, pending.candidateId, pending.quantity || 1);
        consumePendingAction(companyId, phone);
        setLastAddedItem(companyId, phone, { id: pending.candidateId, name: pending.candidateName, quantity: pending.quantity || 1 });
        appendHistory(companyId, phone, { timestamp: Date.now(), user: message, bot: addResult.message, intent: 'ADD_TO_CART' });
        return addResult.message;
      }
      if (pending.type === 'REMOVE') {
        const removeResult = await removeFromCart(companyId, phone, pending.candidateId, pending.quantity, false);
        consumePendingAction(companyId, phone);
        appendHistory(companyId, phone, { timestamp: Date.now(), user: message, bot: removeResult.message, intent: 'REMOVE_FROM_CART' });
        return removeResult.message;
      }
    }
  }
  if (/(^|\b)(nao|não|negativo)(\b|$)/.test(lower)) {
    const pending = peekPendingAction(companyId, phone);
    if (pending) {
      consumePendingAction(companyId, phone);
      const msg = 'Ok, ação cancelada. Você pode tentar novamente especificando melhor.';
      appendHistory(companyId, phone, { timestamp: Date.now(), user: message, bot: msg, intent: 'UNKNOWN' });
      return msg;
    }
  }
  const pre = await orchestrateMessage(message, companyId, phone, customerName);
  if (pre.handled) {
    // salvar histórico básico (resposta determinística)
    try { appendHistory(companyId, phone, { timestamp: Date.now(), user: message, bot: pre.response, intent: detectIntent(message) }); } catch {}
    return pre.response;
  }
  // fallback LLM (mantém comportamento atual)
  const historySnippet = summarizeRecentHistory(companyId, phone, 6);
  const enriched = historySnippet
    ? `${historySnippet}\n\nUsuário agora: ${message}`
    : message;
  const llm = await processLLM(enriched, companyId, phone, customerName);
  try { appendHistory(companyId, phone, { timestamp: Date.now(), user: message, bot: llm, intent: 'UNKNOWN' }); } catch {}
  return llm;
}
