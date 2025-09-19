#!/usr/bin/env node

import { StripeSyncService } from '../src/lib/stripe-sync'

async function syncStripe() {
  try {
    console.log('🚀 Iniciando sincronização do Stripe...')
    
    // Sincronização completa
    const result = await StripeSyncService.fullSync()
    
    console.log(`✅ Sincronização concluída!`)
    console.log(`📦 Produtos sincronizados: ${result.products.length}`)
    console.log(`💰 Preços sincronizados: ${result.prices.length}`)
    
    // Listar os produtos encontrados
    if (result.products.length > 0) {
      console.log('\n📋 Produtos encontrados:')
      for (const product of result.products) {
        console.log(`  - ${product.name} (${product.id})`)
      }
    }
    
    // Buscar produtos locais com preços para verificar
    const localProducts = await StripeSyncService.getLocalProductsWithPrices()
    console.log(`\n🏪 Produtos locais com preços: ${localProducts.length}`)
    
    for (const product of localProducts) {
      console.log(`  - ${product.name}: ${product.prices.length} preços`)
      for (const price of product.prices) {
        const formattedPrice = StripeSyncService.formatPrice(price.unitAmount, price.currency)
        const recurring = price.recurring as { interval?: string } | null
        console.log(`    * ${formattedPrice}/${recurring?.interval || 'único'}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    process.exit(1)
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  syncStripe().then(() => {
    console.log('\n🎉 Script finalizado com sucesso!')
    process.exit(0)
  }).catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })
}

export { syncStripe }