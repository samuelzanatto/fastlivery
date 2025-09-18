import { createAuthClient } from "better-auth/react"
import { stripeClient } from "@better-auth/stripe/client"
import { adminClient, organizationClient } from "better-auth/client/plugins"

// Determina se estamos no browser
const isBrowser = typeof window !== 'undefined'

// Em ambiente browser usamos baseURL relativo para evitar mismatch de host (localhost vs IP)
// No server (SSR) usamos a variável para chamadas absolutas (ex: durante render inicial)
const absoluteBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const baseURL = isBrowser ? '' : absoluteBase

if (isBrowser && absoluteBase && window.location.origin !== absoluteBase) {
  // Aviso útil durante desenvolvimento para evitar confusão de sessão
  console.warn('[auth-client] Origin mismatch: window.origin=', window.location.origin, ' configured=', absoluteBase, ' -> usando relative baseURL')
}

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    stripeClient({ subscription: true }),
    adminClient(),
    organizationClient()
  ]
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  // Plugin Stripe: expõe client.subscription.*
  subscription
} = authClient
