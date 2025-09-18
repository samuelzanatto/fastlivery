import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils-app'
import SubscriptionService from '@/lib/subscription-service'
import { auth } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  console.log('[finish-signup] Iniciando processo de finalização de cadastro')
  try {
    const body = await request.json()
    console.log('[finish-signup] Body recebido:', { ...body, password: body.password ? '[REDACTED]' : 'undefined' })
    
    const { sessionId, password } = body
    if (!sessionId || !password) {
      console.log('[finish-signup] Erro: Parâmetros inválidos', { sessionId: !!sessionId, password: !!password })
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    console.log('[finish-signup] Buscando sessão no Stripe:', sessionId)
    // Obter sessão e subscrição no Stripe para validar pagamento
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription', 'customer'] })
    console.log('[finish-signup] Sessão obtida:', { 
      id: session.id, 
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      customer_details_email: session.customer_details?.email
    })
    
    if (session.payment_status !== 'paid') {
      console.log('[finish-signup] Erro: Pagamento não confirmado', session.payment_status)
      return NextResponse.json({ error: 'Pagamento ainda não confirmado' }, { status: 400 })
    }

    const email = session.customer_details?.email || session.customer_email || undefined
    const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as { id?: string } | null)?.id
    const metadata = (session.metadata || {}) as Record<string, string | undefined>
    const name = metadata.userName || session.customer_details?.name || 'Cliente'
    const plan = metadata.plan || 'basic'

    console.log('[finish-signup] Dados extraídos:', { email, name, plan, customerId })

    if (!email) {
      console.log('[finish-signup] Erro: Email não encontrado')
      return NextResponse.json({ error: 'Email não encontrado no checkout' }, { status: 400 })
    }

    // FLUXO PROFISSIONAL: Criar usuário completo apenas após pagamento confirmado
    // Não deve existir usuário ainda (sem usuários temporários)
    let user = await prisma.user.findUnique({ where: { email } })
    
    if (user) {
      console.log('[finish-signup] Usuário já existe, processo já finalizado:', user.email)
      return NextResponse.json({ ok: true, message: 'Cadastro já finalizado anteriormente' })
    }

    console.log('[finish-signup] Criando usuário completo após pagamento confirmado...')
    
    // Usar Better Auth para criar usuário completo com credenciais
    try {
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
      })
      
      console.log('[finish-signup] Resultado signUpEmail:', signUpResult ? 'sucesso' : 'falha')
      
      if (signUpResult && signUpResult.user) {
        console.log('[finish-signup] Usuário criado:', signUpResult.user.id)
        
        // Buscar usuário criado
        user = await prisma.user.findUnique({ 
          where: { id: signUpResult.user.id } 
        })
        
        if (user) {
          // Atualizar com dados do checkout
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeCustomerId: customerId,
              userType: 'ADMIN', // ADMINs de restaurante
              isActive: false, // será ativado após criar restaurante
              emailVerified: true // Já foi verificado via OTP
            }
          })
          
          console.log('[finish-signup] Usuário configurado como ADMIN:', user.email)
          
          // Buscar novamente
          user = await prisma.user.findUnique({ where: { id: user.id } })
        }
      } else {
        throw new Error('Falha na criação do usuário')
      }
    } catch (authError) {
      console.error('[finish-signup] Erro ao criar usuário:', authError)
      return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
    }

    // Verificar se user foi criado/encontrado com sucesso
    if (!user) {
      return NextResponse.json({ error: 'Falha ao obter dados do usuário' }, { status: 500 })
    }

    // Criar restaurante se não existir
    let restaurant = await prisma.restaurant.findFirst({ where: { ownerId: user.id } })
    if (!restaurant) {
      // Gerar slug único baseado no nome do restaurante ou do usuário
      const baseName = metadata.restaurantName || user.name || 'meu-restaurante'
      const proposed = slugify(baseName)
      let finalSlug = proposed || `rest-${user.id.slice(0, 6)}`
      let suffix = 1
      while (await prisma.restaurant.findFirst({ where: { slug: finalSlug } })) {
        finalSlug = `${proposed}-${suffix++}`
      }

      restaurant = await prisma.restaurant.create({
        data: {
          name: metadata.restaurantName || (user.name ? `Restaurante de ${user.name}` : 'Meu Restaurante'),
          email: `${user.email}-restaurant`,
          password: 'temporary',
          phone: metadata.restaurantPhone || '',
          address: metadata.restaurantAddress || 'A definir',
          description: `${metadata.category || 'Restaurante'} criado via checkout`,
          ownerId: user.id,
          isActive: false,
          isOpen: false,
          acceptsDelivery: true,
          acceptsPickup: true,
          acceptsDineIn: false,
          minimumOrder: 0,
          deliveryFee: 0,
          deliveryTime: 30,
          slug: finalSlug,
        }
      })
    } else if (!restaurant.slug) {
      // Backfill de slug se estiver ausente
      const baseName = restaurant.name || user.name || 'meu-restaurante'
      const proposed = slugify(baseName)
      let finalSlug = proposed || `rest-${restaurant.id.slice(0, 6)}`
      let suffix = 1
      while (await prisma.restaurant.findFirst({ where: { slug: finalSlug } })) {
        finalSlug = `${proposed}-${suffix++}`
      }
      restaurant = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { slug: finalSlug }
      })
    }

    // 🔥 CRUCIAL: Criar Organization do Better Auth para o restaurante
    console.log('[finish-signup] Criando Organization para o restaurante...')
    let organization = await prisma.organization.findUnique({ 
      where: { id: restaurant.id } 
    })
    
    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          id: restaurant.id, // Usar o mesmo ID do restaurante
          name: restaurant.name,
          slug: restaurant.slug,
          createdAt: new Date(),
          // Campos específicos do restaurante no Better Auth
          cuisine: metadata.category || 'Geral',
          deliveryFee: restaurant.deliveryFee || 0,
          minimumOrder: restaurant.minimumOrder || 0,
          deliveryTime: restaurant.deliveryTime || 30,
          acceptsDelivery: restaurant.acceptsDelivery || true,
          acceptsPickup: restaurant.acceptsPickup || true,
          acceptsDineIn: restaurant.acceptsDineIn || false,
          isOpen: restaurant.isOpen || false,
          isActive: restaurant.isActive || false,
          phone: restaurant.phone || '',
          address: restaurant.address || '',
          description: restaurant.description || '',
        }
      })
      console.log('[finish-signup] Organization criada:', organization.id)
    }

    // 🔥 CRUCIAL: Criar Membership do usuário na Organization
    console.log('[finish-signup] Criando Member na Organization...')
    const existingMember = await prisma.member.findFirst({
      where: {
        userId: user.id,
        organizationId: organization.id
      }
    })
    
    if (!existingMember) {
      await prisma.member.create({
        data: {
          id: `${user.id}-${organization.id}`, // ID único para o member
          userId: user.id,
          organizationId: organization.id,
          role: 'owner', // Owner do restaurante
          createdAt: new Date(),
          isActive: true,
          notes: 'Proprietário criado via checkout'
        }
      })
      console.log('[finish-signup] Member criado como owner')
    }

    // Criar assinatura local
    const stripeSub = session.subscription as Stripe.Subscription | null
    const priceId = stripeSub?.items.data[0]?.price?.id || ''
    const subExists = await prisma.subscription.findUnique({ where: { restaurantId: restaurant.id } })
    if (!subExists) {
      await SubscriptionService.createSubscription(
        restaurant.id,
        plan,
        priceId,
        customerId,
        stripeSub?.id
      )
    }

    // Ativar conta e restaurante
    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } })
    await prisma.restaurant.update({ where: { id: restaurant.id }, data: { isActive: true } })

    // Devolver sucesso - usuário agora pode fazer login com BetterAuth
    console.log('[finish-signup] Finalização concluída com sucesso!')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[checkout.public.finish-signup] error:', error)
    
    // Log mais detalhado do erro
    if (error instanceof Error) {
      console.error('[finish-signup] Error message:', error.message)
      console.error('[finish-signup] Error stack:', error.stack)
    }
    
    return NextResponse.json({ error: 'Erro ao finalizar cadastro' }, { status: 500 })
  }
}
