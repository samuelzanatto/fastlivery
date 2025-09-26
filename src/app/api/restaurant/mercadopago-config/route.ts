import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { validateMercadoPagoCredentials } from '@/lib/payments/mercadopago'

export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar empresa do usuário
    const business = await prisma.business.findFirst({
      where: { ownerId: sessionResponse.user.id },
      select: {
        id: true,
        name: true,
        mercadoPagoConfigured: true,
        mercadoPagoPublicKey: true,
        mercadoPagoAccessToken: true,
        // Não retornamos o access token por segurança
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const isTestMode = business.mercadoPagoAccessToken?.startsWith('TEST-') || false

    return NextResponse.json({
      configured: business.mercadoPagoConfigured,
      publicKey: business.mercadoPagoPublicKey ? '****' + business.mercadoPagoPublicKey.slice(-4) : null,
      businessName: business.name,
      isTestMode
    })
  } catch (error) {
    console.error('Erro ao buscar configuração MP:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { accessToken, publicKey } = await request.json()

    if (!accessToken || !publicKey) {
      return NextResponse.json(
        { error: 'Access token e public key são obrigatórios' }, 
        { status: 400 }
      )
    }

    // Validar formato básico dos tokens (aceita teste e produção)
    const isTestCredentials = accessToken.startsWith('TEST-') && publicKey.startsWith('TEST-')
    const isProdCredentials = accessToken.startsWith('APP_USR-') && publicKey.startsWith('APP_USR-')
    
    if (!isTestCredentials && !isProdCredentials) {
      return NextResponse.json(
        { error: 'Formato de credenciais inválido. Use credenciais de produção (APP_USR-) ou teste (TEST-).' },
        { status: 400 }
      )
    }

    // Buscar empresa do usuário
    const business = await prisma.business.findFirst({
      where: { ownerId: sessionResponse.user.id },
      select: { id: true, name: true }
    })

    if (!business) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    // Validar credenciais com o Mercado Pago
    console.log('Validando credenciais do Mercado Pago...')
    const isValid = await validateMercadoPagoCredentials(accessToken, publicKey)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais do Mercado Pago inválidas. Verifique se são credenciais de produção válidas.' },
        { status: 400 }
      )
    }

    // Salvar credenciais no banco
    await prisma.business.update({
      where: { id: business.id },
      data: {
        mercadoPagoAccessToken: accessToken,
        mercadoPagoPublicKey: publicKey,
        mercadoPagoConfigured: true
      }
    })

    console.log(`Mercado Pago configurado para empresa: ${business.name}`)

    return NextResponse.json({
      success: true,
      message: 'Mercado Pago configurado com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao configurar Mercado Pago:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar empresa do usuário
    const business = await prisma.business.findFirst({
      where: { ownerId: sessionResponse.user.id },
      select: { id: true }
    })

    if (!business) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    // Remover configuração do Mercado Pago
    await prisma.business.update({
      where: { id: business.id },
      data: {
        mercadoPagoAccessToken: null,
        mercadoPagoPublicKey: null,
        mercadoPagoConfigured: false
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração do Mercado Pago removida com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao remover configuração MP:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
