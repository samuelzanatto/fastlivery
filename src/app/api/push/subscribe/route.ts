import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'

// POST - Criar/atualizar subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, subscription, userId } = body

    if (!businessId || !subscription) {
      return NextResponse.json(
        { error: 'businessId e subscription são obrigatórios' },
        { status: 400 }
      )
    }

    const { endpoint, keys } = subscription
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Dados de subscription inválidos' },
        { status: 400 }
      )
    }

    // Upsert: criar ou atualizar se já existir
    const result = await prisma.pushSubscription.upsert({
      where: {
        unique_endpoint_per_business: {
          businessId,
          endpoint
        }
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId || null,
        userAgent: request.headers.get('user-agent') || null,
        updatedAt: new Date()
      },
      create: {
        businessId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId || null,
        userAgent: request.headers.get('user-agent') || null
      }
    })

    return NextResponse.json({ 
      success: true, 
      id: result.id,
      message: 'Subscription salva com sucesso'
    })

  } catch (error) {
    console.error('Erro ao salvar push subscription:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar subscription' },
      { status: 500 }
    )
  }
}

// DELETE - Remover subscription
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const businessId = searchParams.get('businessId')

    if (!endpoint) {
      return NextResponse.json(
        { error: 'endpoint é obrigatório' },
        { status: 400 }
      )
    }

    // Deletar subscription(s)
    const where = businessId 
      ? { businessId, endpoint }
      : { endpoint }

    await prisma.pushSubscription.deleteMany({ where })

    return NextResponse.json({ 
      success: true,
      message: 'Subscription removida'
    })

  } catch (error) {
    console.error('Erro ao remover push subscription:', error)
    return NextResponse.json(
      { error: 'Erro ao remover subscription' },
      { status: 500 }
    )
  }
}
