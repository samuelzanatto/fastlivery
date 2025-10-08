#!/usr/bin/env ts-node
import { prisma } from '@/lib/database/prisma'

async function run() {
  const orders = await prisma.whatsappOrder.findMany({})
  let updated = 0
  interface ItemJson { serviceId?: string; supplierId?: string }
  for (const order of orders) {
    const items: ItemJson[] = Array.isArray(order.items) ? order.items as ItemJson[] : []
    const supplierIds = Array.from(new Set(items.map(i => i.supplierId).filter((v): v is string => !!v)))
    if (supplierIds.length === 0) continue
    const needsUpdate = (order as unknown as { supplierIdsDistinct?: string[] }).supplierIdsDistinct?.length === 0
    if (needsUpdate) {
      await prisma.whatsappOrder.update({
        where: { id: order.id },
        data: { supplierIdsDistinct: supplierIds }
      })
    }
    for (const sid of supplierIds) {
      try {
        await prisma.whatsappOrderSupplier.create({ data: { orderId: order.id, supplierId: sid } })
      } catch { /* ignore duplicates */ }
    }
    updated++
  }
  console.log(`Backfill concluído. Pedidos atualizados: ${updated}`)
  process.exit(0)
}
run().catch(e => { console.error(e); process.exit(1) })
