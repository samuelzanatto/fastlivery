// Utilidades para lidar com roles do BetterAuth
// Mantém uma categorização simples para migração pós userType removal

export type RoleCategory = 'platform' | 'business' | 'customer' | 'unknown'

const PLATFORM_ROLES = new Set(['platformAdmin','platformSupport','platform_admin','support'])
// Novos canônicos de negócio
const BUSINESS_ROLES = new Set([
  'businessOwner','businessAdmin','businessManager','businessStaff'
])
// Legados (restaurant*) e aliases antigos
const LEGACY_BUSINESS = new Set([
  'restaurantOwner','restaurantManager','restaurantChef','restaurantWaiter','restaurantCashier','restaurantEmployee',
  'owner','admin','manager','chef','waiter','cashier','employee'
])

export function deriveRoleCategory(role?: string | null): RoleCategory {
  if (!role) return 'unknown'
  if (PLATFORM_ROLES.has(role)) return 'platform'
  if (BUSINESS_ROLES.has(role) || LEGACY_BUSINESS.has(role)) return 'business'
  if (role === 'customer') return 'customer'
  return 'unknown'
}

export function isAdminContext(role?: string | null) {
  const category = deriveRoleCategory(role)
  return category === 'platform' || category === 'business'
}

export function canAccessCustomerArea(role?: string | null) {
  return role === 'customer'
}

export function canAccessBusinessArea(role?: string | null) {
  // Nomenclatura atualizada: agora considera business
  return role ? (deriveRoleCategory(role) === 'business' || deriveRoleCategory(role) === 'platform') : false
}

// Manter alias para compatibilidade
export function canAccessRestaurantArea(role?: string | null) {
  // Mantém nomenclatura histórica: agora considera business
  return canAccessBusinessArea(role)
}
