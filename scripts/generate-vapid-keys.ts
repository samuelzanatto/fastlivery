/**
 * Script para gerar chaves VAPID para Web Push
 * 
 * Execute com: npx ts-node scripts/generate-vapid-keys.ts
 * ou: npx tsx scripts/generate-vapid-keys.ts
 * 
 * As chaves geradas devem ser adicionadas ao arquivo .env:
 * - VAPID_PUBLIC_KEY: Chave pública (também adicionar como NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 * - VAPID_PRIVATE_KEY: Chave privada (apenas no servidor)
 * - VAPID_SUBJECT: Email de contato (ex: mailto:contato@seusite.com)
 */

import * as crypto from 'crypto'

function generateVAPIDKeys() {
  // Gera um par de chaves ECDH usando curva P-256
  const ecdh = crypto.createECDH('prime256v1')
  ecdh.generateKeys()

  // Exporta chaves em formato base64url
  const publicKey = ecdh.getPublicKey('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const privateKey = ecdh.getPrivateKey('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return { publicKey, privateKey }
}

// Gera e exibe as chaves
const keys = generateVAPIDKeys()

console.log('\n🔐 Chaves VAPID geradas com sucesso!\n')
console.log('Adicione as seguintes variáveis ao seu arquivo .env:\n')
console.log('# Web Push VAPID Keys')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:contato@seusite.com.br`)
console.log('\n⚠️  IMPORTANTE:')
console.log('- Mantenha a VAPID_PRIVATE_KEY segura e nunca exponha no cliente')
console.log('- A NEXT_PUBLIC_VAPID_PUBLIC_KEY é segura para o cliente')
console.log('- Configure o VAPID_SUBJECT com seu email de contato\n')
