import { NextResponse } from 'next/server'
import { RealtimeBroadcaster } from '@/lib/realtime/broadcaster'
import { getBusinessWhatsAppOrdersChannel } from '@/lib/realtime/types'

// Simple health check endpoint that sends a loopback message (not persisted)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId') || 'health-test'
  const channel = getBusinessWhatsAppOrdersChannel(businessId)
  const ok = await RealtimeBroadcaster.send(channel, {
    id: crypto.randomUUID(),
    type: 'whatsapp_order_created',
    timestamp: new Date().toISOString(),
    businessId,
    payload: {
      id: 'health-' + Date.now(),
      phone: '0000000000',
      companyId: 'health',
      businessIds: [businessId],
      items: [],
      totalEstimated: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
  })
  return NextResponse.json({ ok, channel })
}
