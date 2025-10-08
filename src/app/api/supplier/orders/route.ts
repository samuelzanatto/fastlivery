import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'

interface AggregatedOrder {
  id: string
  orderNumber: string
  customer: string
  items: number
  total: number
  status: string
  createdAt: Date
  source: 'WHATSAPP' | 'PLATFORM'
}

async function getSupplierOwnership(userId: string, supplierId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { company: { select: { ownerId: true } } }
  })
  if (!supplier || supplier.company.ownerId !== userId) return false
  return true
}

async function fetchWhatsAppOrders(supplierId: string, limit = 200): Promise<AggregatedOrder[]> {
  // Buscar IDs de serviços do fornecedor
  const services = await prisma.supplierService.findMany({
    where: { supplierId },
    select: { id: true }
  })
  const serviceIds = services.map(s => s.id)
  if (serviceIds.length === 0) return []
  const rawOrders = await prisma.whatsappOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      phone: true,
      items: true,
      totalItems: true,
      totalEstimated: true,
      status: true,
      createdAt: true,
      supplierIdsDistinct: true,
      source: true,
    }
  })
  interface ItemJson { serviceId: string; name?: string; quantity?: number; unitPrice?: number }
  return rawOrders
    .map(o => {
      let items: ItemJson[] = []
      if (Array.isArray(o.items)) {
        const raw = o.items as unknown[]
        items = raw.filter((it): it is ItemJson => {
          return typeof it === 'object' && it !== null && 'serviceId' in (it as Record<string, unknown>)
        })
      }
      return { ...o, items }
    })
    .filter(o => o.items.some(i => serviceIds.includes(i.serviceId)))
    .map<AggregatedOrder>(o => ({
      id: o.id,
      orderNumber: o.id.slice(-6),
      customer: `${o.phone} @whatsapp`,
      items: o.totalItems,
      total: o.totalEstimated,
      status: o.status,
      createdAt: o.createdAt,
      source: o.source as 'WHATSAPP' | 'PLATFORM'
    }))
}

// Placeholder futuro: pedidos feitos diretamente pela plataforma B2B (ainda não implementados)
async function fetchPlatformOrders(_supplierId: string): Promise<AggregatedOrder[]> {
  return []
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const supplierId = searchParams.get('supplierId')
    const source = (searchParams.get('source') || 'all').toLowerCase()

    if (!supplierId) return NextResponse.json({ error: 'supplierId ausente' }, { status: 400 })

    const owns = await getSupplierOwnership(session.user.id, supplierId)
    if (!owns) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const includeWhatsApp = source === 'all' || source === 'whatsapp'
    const includePlatform = source === 'all' || source === 'platform'

    const [whats, platform] = await Promise.all([
      includeWhatsApp ? fetchWhatsAppOrders(supplierId) : Promise.resolve([]),
      includePlatform ? fetchPlatformOrders(supplierId) : Promise.resolve([])
    ])

    // Merge & sort desc by createdAt
    const orders = [...whats, ...platform].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[API] supplier aggregated orders error', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
