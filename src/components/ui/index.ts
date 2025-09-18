export { PasswordStrength, usePasswordStrength } from './password-strength';

// Função utilitária para validar se a senha atende aos critérios mínimos do Better Auth
export function isPasswordValidForBetterAuth(password: string): boolean {
  return password.length >= 8;
}

// Função utilitária para verificar se a senha é considerada forte
export function isStrongPassword(password: string): boolean {
  const criteria = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*(),.?":{}|<>]/.test(password),
  ];
  
  return criteria.filter(Boolean).length >= 4;
}

// Exportar critérios para uso em outras partes do app
export const PASSWORD_CRITERIA = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
} as const;
