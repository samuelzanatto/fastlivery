#!/usr/bin/env tsx
/**
 * Generic Order Event Poller (skeleton)
 * ------------------------------------
 * Objetivo: demonstrar pipeline de ingestão -> normalização -> aplicação -> histórico.
 * Este script simula uma fonte de eventos (gera eventos fake) e processa idempotentemente.
 * 
 * Fases:
 * 1. Fetch (stub generateEvents())
 * 2. Persist raw (OrderEventIngestion)
 * 3. Normalize (normalizeOrderEvent)
 * 4. Apply transition (update Order + OrderHistory)
 * 5. Marcar processedAt
 *
 * Regras principais:
 * - Idempotência por eventId
 * - Noops não criam OrderHistory
 * - Cria Order se receber ORDER_CREATED (exemplo minimalista)
 */

import { PrismaClient, OrderStatus, OrderType, PaymentStatus, Prisma } from '@prisma/client'
import { normalizeOrderEvent, RawOrderEvent } from '../src/lib/orders/status-mapper'

const prisma = new PrismaClient()

// Config via env se quiser evoluir
const BATCH_SIZE = 10
const LOOP_INTERVAL_MS = 2000
let running = true

// Basic JsonValue type (subset) para evitar uso de any
type JsonPrimitive = string | number | boolean | null

// Simulador simples de eventos
let fakeCounter = 0
function generateEvents(): RawOrderEvent[] {
  // Alterna tipos para demonstrar transições
  const baseOrderNumber = 'SIM-' + Math.floor(fakeCounter / 5).toString().padStart(4, '0')
  const phase = fakeCounter % 5
  fakeCounter++
  const map: Record<number, string> = {
    0: 'ORDER_CREATED',
    1: 'ORDER_CONFIRMED',
    2: 'ORDER_PREPARING',
    3: 'ORDER_READY',
    4: 'ORDER_DELIVERED'
  }
  const type = map[phase]
  const eventId = `${baseOrderNumber}-${type}`
  return [{ eventId, type, orderNumber: baseOrderNumber, payload: { simulated: true } }]
}

async function ingestRawEvents(rawEvents: RawOrderEvent[]) {
  for (const ev of rawEvents) {
    try {
      await prisma.orderEventIngestion.create({
        data: {
          eventId: ev.eventId,
          orderNumber: ev.orderNumber ?? null,
          type: ev.type,
          payload: ((): Prisma.InputJsonValue => {
            if (typeof ev.payload === 'object' && ev.payload !== null) return ev.payload as Prisma.InputJsonValue
            return { value: ev.payload as JsonPrimitive }
          })()
        }
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      // Unique constraint -> já existe, ignorar
      if (!message.includes('Unique constraint')) {
        console.error('Erro ao inserir ingestion', ev.eventId, e)
      }
    }
  }
}

async function processPendingIngestions() {
  const pending = await prisma.orderEventIngestion.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE
  })
  for (const row of pending) {
    await prisma.$transaction(async (tx) => {
      // Resolve order
      let order = row.orderId
        ? await tx.order.findUnique({ where: { id: row.orderId } })
        : row.orderNumber
        ? await tx.order.findUnique({ where: { orderNumber: row.orderNumber } })
        : null

      // Se event for CREATED e order inexistente -> criar
      if (!order && row.type === 'ORDER_CREATED' && row.orderNumber) {
        order = await tx.order.create({
          data: {
            orderNumber: row.orderNumber,
            businessId: (await getAnyBusinessId(tx)),
            type: OrderType.DELIVERY,
            status: OrderStatus.PENDING,
            subtotal: 0,
            total: 0,
            deliveryFee: 0,
            discount: 0,
            customerName: 'Simulated',
            customerPhone: '0000000000',
            paymentStatus: PaymentStatus.PENDING
          }
        })
        await tx.orderEventIngestion.update({ where: { id: row.id }, data: { orderId: order.id } })
      }

      const normalized = normalizeOrderEvent(
        { eventId: row.eventId, type: row.type, orderNumber: row.orderNumber ?? undefined, payload: row.payload },
        order?.status
      )

      if (normalized.isNoop) {
        await tx.orderEventIngestion.update({ where: { id: row.id }, data: { processedAt: new Date(), attempts: { increment: 1 } } })
        return
      }

      if (!order) {
        // Não conseguimos aplicar transição sem order existente e não é CREATED -> marcar tentativa
        await tx.orderEventIngestion.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } })
        return
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: normalized.toStatus ?? order.status
        }
      })

      await tx.orderHistory.create({
        data: {
          orderId: updated.id,
            eventIngestionId: row.id,
            fromStatus: normalized.fromStatus ?? undefined,
            toStatus: normalized.toStatus ?? undefined,
            transitionType: normalized.transitionType,
            reason: normalized.reason ?? undefined,
            metadata: (normalized.metadata ?? {}) as Prisma.InputJsonValue
        }
      })

      await tx.orderEventIngestion.update({ where: { id: row.id }, data: { processedAt: new Date(), attempts: { increment: 1 } } })
    })
  }
}

type BusinessFinder = { business: { findFirst: (args: { select: { id: true } }) => Promise<{ id: string } | null> } }
async function getAnyBusinessId(tx: BusinessFinder) {
  const r = await tx.business.findFirst({ select: { id: true } })
  if (!r) throw new Error('No business found to attach simulated order')
  return r.id
}

async function mainLoop() {
  console.log('[poller] Starting generic order event poller (simulation mode)')
  while (running) {
    const simulated = generateEvents()
    await ingestRawEvents(simulated)
    await processPendingIngestions()
    await sleep(LOOP_INTERVAL_MS)
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

process.on('SIGINT', () => {
  console.log('Stopping poller...')
  running = false
  setTimeout(() => process.exit(0), 500)
})

mainLoop().catch((e) => {
  console.error('Poller fatal error', e)
  process.exit(1)
})
