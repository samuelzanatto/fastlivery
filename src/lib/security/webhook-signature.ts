import crypto from 'crypto'

/**
 * Estrutura do cabeçalho (exemplos reais variam). Implementação flexível:
 * Pode vir algo como:
 *   t=timestamp,sha256=hexdigest
 * Ou apenas um hash simples legado. Aceitamos fallback simples.
 */
export interface VerifySignatureParams {
  rawBody: string
  headerValue: string
  fallbackHeaderValue?: string
  secret: string
  toleranceSeconds?: number // janela temporal opcional
}

export interface SignatureMeta {
  valid: boolean
  reason?: string
  providedTimestamp?: number
  computed?: string
  provided?: string
  rawProvided?: string
}

export function verifyMercadoPagoSignature(params: VerifySignatureParams): SignatureMeta {
  const { rawBody, headerValue, fallbackHeaderValue, secret, toleranceSeconds = 5 * 60 } = params
  const rawProvided = headerValue || fallbackHeaderValue || ''
  if (!rawProvided) return { valid: false, reason: 'missing_signature', rawProvided }

  // Tenta parse estruturado t=...,sha256=...
  let providedHash: string | undefined
  let ts: number | undefined
  if (rawProvided.includes('=')) {
    const parts = rawProvided.split(',').map(p => p.trim())
    for (const p of parts) {
      const [k, v] = p.split('=')
      if (k === 't') ts = Number(v)
      if (k === 'sha256') providedHash = v
    }
  } else {
    // Caso legado: só hash
    providedHash = rawProvided
  }

  // Valida timestamp se presente
  if (ts && (isNaN(ts) || ts <= 0)) return { valid: false, reason: 'invalid_timestamp', rawProvided }
  if (ts) {
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - ts) > toleranceSeconds) {
      return { valid: false, reason: 'timestamp_out_of_range', providedTimestamp: ts, rawProvided }
    }
  }

  // Compute HMAC
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  if (!providedHash) return { valid: false, reason: 'missing_hash', computed, rawProvided }
  const valid = timingSafeEqual(computed, providedHash)
  return { valid, provided: providedHash, computed, providedTimestamp: ts, rawProvided, reason: valid ? undefined : 'mismatch' }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  return crypto.timingSafeEqual(bufA, bufB)
}
