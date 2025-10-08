import { NextResponse } from 'next/server'
import { RealtimeBroadcaster } from '@/lib/realtime/broadcaster'
import { getSupplierWhatsAppOrdersChannel } from '@/lib/realtime/types'

// Simple health check endpoint that sends a loopback message (not persisted)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get('supplierId') || 'health-test'
  const channel = getSupplierWhatsAppOrdersChannel(supplierId)
  const ok = await RealtimeBroadcaster.send(channel, {
    id: crypto.randomUUID(),
    type: 'whatsapp_order_created',
    timestamp: new Date().toISOString(),
    supplierId,
    payload: {
      id: 'health-' + Date.now(),
      phone: '0000000000',
      companyId: 'health',
      supplierIds: [supplierId],
      items: [],
      totalEstimated: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
  })
  return NextResponse.json({ ok, channel })
}
