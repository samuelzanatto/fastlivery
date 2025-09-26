// Util de normalização de status Mercado Pago -> interno
// Fonte: documentação Mercado Pago (status, status_detail)
// Retorna paymentStatus interno + orderStatus sugerido + razão opcional simplificada

export type InternalPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type InternalOrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export interface NormalizedStatusResult {
  paymentStatus: InternalPaymentStatus
  orderStatus?: InternalOrderStatus
  rawStatus: string
  rawDetail?: string
  reason?: string
  final: boolean // se é um status terminal para o pagamento
}

// Mapeamento de alguns status_detail comuns
const detailReasonMap: Record<string, string> = {
  accredited: 'approved',
  pending_waiting_payment: 'waiting_payment',
  pending_review_manual: 'under_review',
  cc_rejected_insufficient_amount: 'insufficient_funds',
  cc_rejected_bad_filled_security_code: 'invalid_cvv',
  cc_rejected_bad_filled_date: 'invalid_expiration',
  cc_rejected_bad_filled_other: 'invalid_card_data',
  cc_rejected_call_for_authorize: 'call_bank',
  cc_rejected_blacklist: 'blacklisted',
  cc_rejected_card_disabled: 'card_disabled',
  cc_rejected_duplicated_payment: 'duplicated_payment',
  cc_rejected_high_risk: 'high_risk',
  cc_rejected_invalid_installments: 'invalid_installments',
  cc_rejected_max_attempts: 'max_attempts',
  cc_rejected_other_reason: 'other_reason'
}

export function normalizeMercadoPagoStatus(status?: string, statusDetail?: string): NormalizedStatusResult {
  const rawStatus = (status || 'pending').toLowerCase()
  const rawDetail = statusDetail?.toLowerCase()

  let paymentStatus: InternalPaymentStatus = 'PENDING'
  let orderStatus: InternalOrderStatus | undefined = undefined
  let final = false

  switch (rawStatus) {
    case 'approved':
      paymentStatus = 'APPROVED'
      orderStatus = 'CONFIRMED'
      final = true
      break
    case 'rejected':
      paymentStatus = 'REJECTED'
      orderStatus = 'CANCELLED'
      final = true
      break
    case 'cancelled':
    case 'canceled':
    case 'refunded':
    case 'charged_back':
      paymentStatus = 'CANCELLED'
      orderStatus = 'CANCELLED'
      final = true
      break
    default:
      paymentStatus = 'PENDING'
      orderStatus = 'PENDING'
  }

  const reason = rawDetail ? detailReasonMap[rawDetail] : undefined

  return { paymentStatus, orderStatus, rawStatus, rawDetail, reason, final }
}

// Helper simples para consumir só paymentStatus
export function mapPaymentStatus(status?: string, detail?: string): InternalPaymentStatus {
  return normalizeMercadoPagoStatus(status, detail).paymentStatus
}
