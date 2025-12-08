/**
 * Utility para URLs da aplicação
 * Centraliza a lógica de URLs para evitar hardcoding
 */

/**
 * Obtem a URL base da aplicação baseada no ambiente
 */
export function getAppUrl(): string {
  // Priorizar NEXT_PUBLIC_APP_URL se configurada
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Em produção na Vercel, usar VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Em produção sem configuração, lançar erro
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL deve ser configurada em produção')
  }
  
  // Em desenvolvimento, priorizar NGROK se disponível, senão localhost
  return process.env.NGROK_URL || 'http://localhost:3000'
}

/**
 * Obtem as origens permitidas para CORS baseadas no ambiente
 */
export function getAllowedOrigins(): string[] {
  const origins = [
    // URL principal da aplicação
    process.env.NEXT_PUBLIC_APP_URL
  ]
  
  // Em desenvolvimento, adicionar URLs locais dinamicamente
  if (process.env.NODE_ENV === 'development') {
    const devUrls = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:4000',
      'http://localhost:4040'
    ]
    origins.push(...devUrls, process.env.NGROK_URL)
  }
  
  // Filtrar valores undefined/null e remover duplicatas
  return [...new Set(origins.filter(Boolean) as string[])]
}

/**
 * Constrói URL completa baseada na URL base da aplicação
 */
export function buildAppUrl(path: string = ''): string {
  const baseUrl = getAppUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

/**
 * Verifica se uma URL é válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Converte caminho relativo em URL absoluta
 */
export function toAbsoluteUrl(path: string): string {
  if (isValidUrl(path)) {
    return path
  }
  
  return buildAppUrl(path)
}

/**
 * Obtem URLs de callback para integração Stripe
 */
export function getStripeCallbackUrls(type: 'subscription' | 'checkout' = 'checkout') {
  const baseUrl = getAppUrl()
  
  if (type === 'subscription') {
    return {
      success_url: `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: `${baseUrl}/dashboard?upgrade=cancelled`
    }
  }
  
  return {
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/signup?cancelled=true`
  }
}

/**
 * Verifica se deve configurar notification URL (apenas HTTPS em produção)
 */
export function shouldSetNotificationUrl(): boolean {
  const baseUrl = getAppUrl()
  return baseUrl.startsWith('https://') || process.env.NODE_ENV === 'development'
}

/**
 * Obtem URL de webhook para Stripe
 */
export function getWebhookUrl(): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/api/auth/stripe/webhook`
}