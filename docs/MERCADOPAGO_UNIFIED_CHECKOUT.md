# Fluxo Unificado Mercado Pago (Payment Brick)

## Visão Geral
Implementamos um fluxo unificado de pagamento usando o Payment Brick do Mercado Pago para suportar:
- PIX transparente (QR Code direto)
- Cartão de crédito / débito com captura direta
- Fallback automático para Checkout Pro quando necessário

Endpoint unificado: `POST /api/payments/mercadopago`

## Contrato de Resposta
| type           | Uso                                    | Campos relevantes                     |
|----------------|-----------------------------------------|----------------------------------------|
| `pix_payment`  | PIX transparente                        | `qr_code`, `qr_code_base64`, `ticket_url`, `status`, `order_number` |
| `card_payment` | Pagamento com cartão direto             | `status` (`approved`, `in_process`, `rejected`), `id` (payment id MP) |
| `checkout_pro` | Fallback (PIX não suportado ou cartão)  | `init_point`, `preference_id`, `fallback_reason?` |

## Estados Front-End
`paymentState.status` agora pode ser:
- `idle`
- `processing`
- `pending` (aguardando confirmação PIX ou cartão em análise)
- `approved`
- `rejected`

PIX aprovado simulado após 30s (placeholder até webhook).

## Principais Arquivos
- `src/lib/mercadopago.ts` → adiciona `createCardPayment`
- `src/app/api/payments/mercadopago/route.ts` → lógica de roteamento (PIX → direto / cartão → direto / fallback → Checkout Pro)
- `src/components/integrated-checkout.tsx` → monta Payment Brick, trata resposta por `type`, exibe loader, retry, etc.

## Mudanças Críticas
1. Removido endpoint legado `checkout-mercadopago`.
2. Front-end não depende mais de `result.success`.
3. Implementado fallback: se pagamento direto falhar retorna `type: checkout_pro`.
4. Restringimos métodos do Brick dinamicamente:
   - Seleção PIX → habilita apenas `bankTransfer`.
   - Seleção cartão → habilita apenas `creditCard`.

## Próximos Passos Recomendados
1. Webhook Mercado Pago para atualizar status real-time (PIX aprovado, cartão revisado).
2. Tela/status polling enquanto `pending`.
3. Suporte a 3DS / challenge flow (Status Screen Brick ou redirecionamento quando MP exigir).
4. Persistir dados do endereço e associar ao pedido.
5. Validação de estoque antes da criação do pedido.
6. Implementar cancelamento automático se expirar janela de pagamento (PIX não pago em X minutos).
7. Logs estruturados (correlation id por pedido).

## Webhook Implementado
Endpoint: `POST /api/webhooks/mercadopago`

Fluxo:
- Recebe notificações (JSON ou query params) de `payment`.
- Recupera pedido por `stripeSessionId` (usado para armazenar id do pagamento/preferência) ou `external_reference`.
- Atualiza `paymentStatus` e (se aprovado) marca pedido como `CONFIRMED`.
- Sincroniza tabela `Payment` e emite evento socket `payment-update` (canal `restaurant-<id>`).

Status Mapping:
| MP | Interno Payment | Order.status |
|----|------------------|--------------|
| approved | APPROVED | CONFIRMED |
| rejected | REJECTED | CANCELLED |
| cancelled/canceled | CANCELLED | CANCELLED |
| refunded/charged_back | CANCELLED | CANCELLED |
| outros | PENDING | (mantém) |

Variáveis suportadas para notification_url automática:
`MERCADOPAGO_WEBHOOK_URL` > `NGROK_URL` > `NEXT_PUBLIC_APP_URL`

Próximas melhorias Webhook:
- Verificar assinatura (se configurada no MP) para maior segurança.
- Deduplicação por `payment.id` (implementar tabela de eventos ou chave idempotente).
- Persistir histórico de transições (tabela `PaymentHistory`).

# Fluxo Unificado Mercado Pago (Payment Brick)

## Resumo
Sistema unificado para pagamentos via Mercado Pago usando Payment Brick.

Suporte atual:
- **PIX (bank_transfer)**: Fluxo transparente com QR Code inline
- **Cartão de Crédito/Débito**: Pagamento direto via token ou fallback para Checkout Pro

## Componentes

### 1. Payment Brick (`MercadoPagoPaymentBrick`)
- Interface unificada do Mercado Pago para capturar dados de pagamento
- Gera token seguro para cartões
- Suporta PIX, cartões e outros métodos

### 2. Endpoint Unificado (`/api/payments/mercadopago`)
- Recebe dados do Payment Brick
- Processa PIX instantâneo ou cartão direto  
- Fallback para Checkout Pro se necessário
- Retorna tipo de resposta adequado para cada método

### 3. Status Screen Brick (`MercadoPagoStatusScreenBrick`)  
- Mostra status em tempo real para PIX
- Integra com polling de fallback
- UI nativa do Mercado Pago

## Atualização em Tempo Real
Sistema complementado por polling para verificação de status de pagamento.

1. Webhook recebe evento e atualiza DB.
2. Frontend usa polling (`usePaymentStatusPolling`) para verificar mudanças de status.
3. Polling verifica periodicamente até status final (APPROVED/REJECTED/CANCELLED).

Hook principal:
```
const { data } = usePaymentStatusPolling({
  orderNumber,
  enabled: !!orderNumber && paymentState.status === 'pending'
})
```

Estratégia de Resiliência:
- Polling primário para verificação de status.
- Ao receber status final (APPROVED/REJECTED/CANCELLED) desativa polling.

## Fluxos

Próximos Passos Realtime:
- Adicionar join automático de sala específica do pedido (quando ID estiver disponível).
- Heartbeat para detectar desconexões e religar socket.
- UI mostrando origem da atualização (ex: label "(tempo real)" ou "(poll)").

## Carregamento Dinâmico da Public Key
Agora a chave pública do Mercado Pago é buscada por restaurante:

Endpoint: `GET /api/restaurants/[slug]/mp-public-key`

Resposta:
```
{ "publicKey": "APP_PUBLIC_KEY..." | null, "configured": boolean }
```

Fluxo no front:
1. Ao montar `IntegratedCheckout`, efeito busca a chave.
2. Se inexistente ou não configurada, impede inicialização do Payment Brick e mostra toast.
3. Removida dependência rígida de `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` global.

Benefícios:
- Suporte multi-restaurante / multi-tenant.
- Evita expor chave incorreta durante SSR se variáveis não estiverem setadas.

Próximos passos possíveis:
- Cache em memória (SWR ou react-query) para evitar múltiplos fetches.
- Retornar também `accessMode` (TEST vs PROD) para exibir badge visual.
- Endpoint de health consolidado retornando config geral (stripe + mp + subscription).

## Exemplo de Chamada
```
POST /api/payments/mercadopago
{
  "paymentType": "credit_card", // ou "bank_transfer" para PIX
  "formData": { ...dados do Brick ... },
  "items": [ { "id": "prod_1", "name": "Pizza", "price": 49.9, "quantity": 1 } ],
  "customerInfo": { "name": "João", "email": "joao@exemplo.com", "phone": "+551199999999" },
  "selectedAddress": { ... },
  "restaurantId": "slug-do-restaurante",
  "totalAmount": 59.90
}
```

## Tratamento no Front-End (Resumo)
```
if (result.type === 'pix_payment') { mostrar QR }
else if (result.type === 'card_payment') { switch(status) }
else if (result.type === 'checkout_pro') { window.open(init_point) }
```

## Observações
- Campo `orderNumber` usado para exibição; real tracking deve vir do registro em DB.
- Campo `stripeSessionId` reutilizado temporariamente para guardar `paymentId` ou `preferenceId` do MP (avaliar renomear depois).
- Necessário adicionar página / rota para retorno pós Checkout Pro (success/failure/pending) se quiser controlar redirecionamentos.

---
Última atualização: 2025-09-16
