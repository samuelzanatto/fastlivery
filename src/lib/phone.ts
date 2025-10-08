// Normalização simples de telefones (foco Brasil / E.164 simplificado)
export function normalizePhone(raw: string): string {
  if (!raw) return raw
  // Remove sufixo whatsapp (@s.whatsapp.net) se vier
  const cleaned = raw.replace(/@s\.whatsapp\.net$/i, '')
  // Só dígitos
  let digits = cleaned.replace(/\D+/g, '')
  // Se começar com 5500 etc: consolidar repetição
  digits = digits.replace(/^(55)(55)/, '$1')
  // Se tiver 10 ou 11 dígitos (fixo ou móvel BR) e não começar com 55, prefixar 55
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = '55' + digits
  }
  return digits
}
