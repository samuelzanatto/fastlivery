import { createAuthClient } from "better-auth/react"
import { stripeClient } from "@better-auth/stripe/client"
import { adminClient, organizationClient, inferAdditionalFields } from "better-auth/client/plugins"
import type { auth } from './auth'

// Definições de roles do sistema
export const BUSINESS_ROLES = {
  businessOwner: 'businessOwner',
  businessAdmin: 'businessAdmin', 
  businessManager: 'businessManager',
  businessStaff: 'businessStaff'
} as const

export const SUPPLIER_ROLES = {
  supplierOwner: 'supplierOwner',
  supplierManager: 'supplierManager',
  supplierStaff: 'supplierStaff'
} as const

export const PLATFORM_ROLES = {
  platformAdmin: 'platformAdmin',
  platformSupport: 'platformSupport'
} as const

export const CUSTOMER_ROLE = 'customer' as const

export type BusinessRole = keyof typeof BUSINESS_ROLES
export type SupplierRole = keyof typeof SUPPLIER_ROLES
export type PlatformRole = keyof typeof PLATFORM_ROLES
export type UserRole = BusinessRole | SupplierRole | PlatformRole | typeof CUSTOMER_ROLE

// Access Control Helper Functions
export const hasBusinessAccess = (role?: string): boolean => {
  return role ? (
    Object.values(BUSINESS_ROLES).includes(role as BusinessRole) ||
    Object.values(SUPPLIER_ROLES).includes(role as SupplierRole)
  ) : false
}

export const hasSupplierAccess = (role?: string): boolean => {
  return role ? Object.values(SUPPLIER_ROLES).includes(role as SupplierRole) : false
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
  // Aviso útil durante desenvolvimento para evitar confusão de sessão
  console.warn('[auth-client] Origin mismatch: window.origin=', window.location.origin, ' configured=', absoluteBase, ' -> usando relative baseURL')
}

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    stripeClient({ subscription: true }),
    adminClient(),
    organizationClient(),
    // Ativa inferência completa de campos adicionais do servidor para type-safety
    inferAdditionalFields<typeof auth>()
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
