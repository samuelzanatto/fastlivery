import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'

// Retorna pedidos WhatsApp que contenham pelo menos 1 item de serviços do fornecedor
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const supplierId = searchParams.get('supplierId')

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId ausente' }, { status: 400 })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Validar que usuário tem acesso ao supplier (dono da company do supplier)
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { company: { select: { ownerId: true } } }
    })
    if (!supplier || supplier.company.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão para este fornecedor' }, { status: 403 })
    }

    // Buscar todos os serviços do fornecedor
    const services = await prisma.supplierService.findMany({
      where: { supplierId },
      select: { id: true }
    })
    const serviceIds = services.map((s) => s.id)
    if (serviceIds.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // Buscar últimos N pedidos WhatsApp (limit 200) e filtrar por interseção de serviceIds
    const rawOrders = await prisma.whatsappOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200
    })
    interface OrderItemJson { serviceId: string; name?: string; quantity?: number; unitPrice?: number; supplier?: string }
    interface RawOrder { id: string; phone: string; totalItems: number; totalEstimated: number; status: string; createdAt: Date; items: unknown }
    interface ApiOrder { id: string; orderNumber: string; customer: string; items: number; total: number; status: string; createdAt: Date }
    const orders: ApiOrder[] = rawOrders
      .map<RawOrder>((o) => ({ ...o, items: Array.isArray(o.items) ? o.items : [] }))
      .filter((o) => (o.items as OrderItemJson[]).some((i) => serviceIds.includes(i.serviceId)))
      .map<ApiOrder>((o) => ({
        id: o.id,
        orderNumber: o.id.slice(-6),
        customer: `${o.phone} @whatsapp`,
        items: o.totalItems,
        total: o.totalEstimated,
        status: o.status,
        createdAt: o.createdAt
      }))

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[API] Erro ao listar pedidos WhatsApp fornecedor', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
