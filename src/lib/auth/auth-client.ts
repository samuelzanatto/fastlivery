import { createAuthClient } from "better-auth/react"
import { adminClient, organizationClient, inferAdditionalFields } from "better-auth/client/plugins"
import { emailOTPClient } from "better-auth/client/plugins"
import type { auth } from './auth'

// Definições de roles do sistema
export const BUSINESS_ROLES = {
  businessOwner: 'businessOwner',
  businessAdmin: 'businessAdmin', 
  businessManager: 'businessManager',
  businessStaff: 'businessStaff'
} as const

export const PLATFORM_ROLES = {
  platformAdmin: 'platformAdmin',
  platformSupport: 'platformSupport'
} as const

export const CUSTOMER_ROLE = 'customer' as const

export type BusinessRole = keyof typeof BUSINESS_ROLES
export type PlatformRole = keyof typeof PLATFORM_ROLES
export type UserRole = BusinessRole | PlatformRole | typeof CUSTOMER_ROLE

// Access Control Helper Functions
export const hasBusinessAccess = (role?: string): boolean => {
  return role ? Object.values(BUSINESS_ROLES).includes(role as BusinessRole) : false
}

export const hasPlatformAccess = (role?: string): boolean => {
  return role ? Object.values(PLATFORM_ROLES).includes(role as PlatformRole) : false
}

export const hasAdminAccess = (role?: string): boolean => {
  return hasBusinessAccess(role) || hasPlatformAccess(role)
}

export const isCustomer = (role?: string): boolean => {
  return role === CUSTOMER_ROLE
}

// Determina se estamos no browser
const isBrowser = typeof window !== 'undefined'

import { getAppUrl } from '@/lib/utils/urls'

// Em ambiente browser usamos baseURL relativo para evitar mismatch de host (localhost vs IP)
// No server (SSR) usamos a variável para chamadas absolutas (ex: durante render inicial)
const absoluteBase = getAppUrl()
const baseURL = isBrowser ? '' : absoluteBase

if (isBrowser && absoluteBase && window.location.origin !== absoluteBase) {
  // Debug apenas em desenvolvimento para evitar confusão de sessão
  if (process.env.NODE_ENV === 'development') {
    console.debug('[auth-client] Origin mismatch: window.origin=', window.location.origin, ' configured=', absoluteBase, ' -> usando relative baseURL')
  }
}

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    adminClient(),
    organizationClient(),
    emailOTPClient(),
    // Ativa inferência completa de campos adicionais do servidor para type-safety
    inferAdditionalFields<typeof auth>()
  ]
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession
} = authClient
