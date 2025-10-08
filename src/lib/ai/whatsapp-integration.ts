import 'dotenv/config';
import { whatsappAgent } from './agent';
import { processWithOrchestrator } from './orchestrator';

/**
 * Sistema Integrador do WhatsApp com IA - Marketplace B2B
 * 
 * Integra o agente Groq com o sistema de webhook do WhatsApp.
 * Sistema para empresas de delivery fazerem pedidos para fornecedores via WhatsApp.
 * Conecta empresas com fornecedores parceiros através de IA conversacional.
 */

/**
 * Processa mensagem do WhatsApp usando o agente inteligente
 */
export async function processWhatsAppMessage(
  message: string,
  companyId: string,
  customerPhone: string,
  customerName?: string
): Promise<string> {
  try {
    console.log(`[WhatsApp AI] Mensagem recebida da empresa ${customerName || customerPhone}: "${message}"`);
    const lower = message.trim().toLowerCase();
    // Saudações simples: não acionar agente nem tools
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|e ai|e aí)$/i.test(lower)) {
      return `Olá ${customerName?.split(' ')[0] || ''}! Posso listar o catálogo para você. Diga por exemplo: "listar produtos" ou o nome de algo que procura.`.trim();
    }
    
    // Contexto otimizado para marketplace B2B
    const contextualPrompt = `Empresa: ${customerName || customerPhone}
Msg: "${message}"

Params: companyId="${companyId}", phone="${customerPhone}", name="${customerName || 'Empresa'}"

Responda como assistente de compras B2B. Use ferramentas quando necessário.`;

    // Usa o agente Groq otimizado para conversação B2B
    // Primeiro passa pela orquestração determinística (intents e fuzzy)
    const orchestrated = await processWithOrchestrator(message, companyId, customerPhone, customerName || '');
    if (orchestrated) {
      return orchestrated;
    }
    // Fallback (teoricamente não atinge pois orchestrator sempre retorna string)
    const result = await whatsappAgent.generate({ prompt: contextualPrompt });
    const response = result.text.trim();
    
    console.log(`[WhatsApp AI] Resposta gerada: "${response}"`);

    return response;
    
  } catch (error) {
    console.error('[WhatsApp AI] Erro ao processar mensagem:', error);
    
    // Fallback response amigável
    return 'Desculpe, estou enfrentando algumas dificuldades técnicas no momento. Pode tentar novamente em alguns instantes? 🤖';
  }
}

/**
 * Função de teste para desenvolvimento
 */
export async function testWhatsAppAI() {
  console.log('\n=== TESTE DO WHATSAPP AI B2B ===\n');
  
  const testCases = [
    {
      message: 'Olá',
      description: 'Saudação básica'
    },
    {  
      message: 'Quais serviços estão disponíveis?',
      description: 'Solicitação de catálogo B2B'
    },
    {
      message: 'Preciso de 10kg de ingredientes',
      description: 'Adição ao carrinho B2B'
    },
    {
      message: 'Ver meu carrinho',
      description: 'Visualizar carrinho'
    },
    {
      message: 'Finalizar pedido',
      description: 'Finalização B2B'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.description} ---`);
    console.log(`Empresa: "${testCase.message}"`);
    
    try {
      const response = await processWhatsAppMessage(
        testCase.message,
        'test-company-id',
        '5511999999999',
        'Empresa Teste'
      );
      
      console.log(`Bot: "${response}"`);
      
    } catch (error) {
      console.error(`Erro: ${error}`);
    }
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== FIM DOS TESTES ===\n');
}

/**
 * Sistema de análise de intents (opcional - o agente já faz isso naturalmente)
 */
export function analyzeIntent(message: string): {
  intent: string;
  confidence: number;
  entities?: Record<string, unknown>;
} {
  const msg = message.toLowerCase().trim();
  
  // Intents básicos para fallback se necessário
  if (/^(oi|olá|hello|ola)/i.test(msg)) {
    return { intent: 'GREETING', confidence: 0.9 };
  }
  
  if (/(serviço|produto|catalogo|lista|tem|fornece|oferece)/i.test(msg)) {
    return { intent: 'VIEW_SERVICES', confidence: 0.8 };
  }
  
  if (/(adicionar|quero|pedir|comprar|preciso|solicitar|\d+.*)/i.test(msg)) {
    return { intent: 'ADD_TO_CART', confidence: 0.7 };
  }
  
  if (/(carrinho|pedido|ver|mostrar)/i.test(msg)) {
    return { intent: 'VIEW_CART', confidence: 0.7 };
  }
  
  if (/(finalizar|confirmar|fechar|concluir)/i.test(msg)) {
    return { intent: 'FINALIZE_ORDER', confidence: 0.8 };
  }
  
  return { intent: 'UNKNOWN', confidence: 0.1 };
}

/**
 * Sistema de logs estruturados para análise
 */
export function logConversation(
  customerPhone: string,
  customerMessage: string,
  botResponse: string,
  metadata?: Record<string, unknown>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    customer: customerPhone,
    message: customerMessage,
    response: botResponse,
    intent: analyzeIntent(customerMessage),
    metadata: metadata || {},
  };
  
  // Em produção, salvar no banco de dados ou sistema de logs
  console.log('[Conversation Log]', JSON.stringify(logEntry, null, 2));
}