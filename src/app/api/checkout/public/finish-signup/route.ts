import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/database/prisma'
import { slugify } from '@/lib/utils/formatters'
import { autoCleanup } from '@/lib/utils/cleanup-verifications'
import { buildAppUrl } from '@/lib/utils/urls'
import SubscriptionService from '@/lib/billing/subscription-service'
import { auth } from '@/lib/auth/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  console.log('[finish-signup] Iniciando processo de finalização de cadastro')
  try {
    const body = await request.json()
    console.log('[finish-signup] Body recebido:', { sessionId: body.sessionId })
    
    const { sessionId } = body
    if (!sessionId) {
      console.log('[finish-signup] Erro: SessionId obrigatório')
      return NextResponse.json({ error: 'SessionId obrigatório' }, { status: 400 })
    }

    // Limpeza automática de dados de checkout expirados
    autoCleanup('checkout').catch(error => 
      console.warn('[finish-signup] Falha na limpeza automática:', error)
    )

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

    // Recuperar senha do backend
    console.log('[finish-signup] Recuperando senha do backend...')
    let rawPassword: string
    try {
      const passwordResponse = await fetch(`${buildAppUrl()}/api/checkout/public/stash-password?sessionId=${sessionId}&raw=true`)
      
      if (!passwordResponse.ok) {
        console.error('[finish-signup] Falha ao recuperar senha:', passwordResponse.status)
        return NextResponse.json({ error: 'Não foi possível recuperar dados de cadastro' }, { status: 400 })
      }
      
      const passwordData = await passwordResponse.json()
      rawPassword = passwordData.rawPassword
      console.log('[finish-signup] Senha recuperada com sucesso')
    } catch (error) {
      console.error('[finish-signup] Erro ao recuperar senha:', error)
      return NextResponse.json({ error: 'Erro ao recuperar dados de cadastro' }, { status: 500 })
    }

    const email = session.customer_details?.email || session.customer_email || undefined
    const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as { id?: string } | null)?.id
    const metadata = (session.metadata || {}) as Record<string, string | undefined>
    const name = metadata.userName || session.customer_details?.name || 'Cliente'
    const plan = metadata.plan || 'basic'
    const companyType = metadata.companyType || 'delivery_company'

    console.log('[finish-signup] Dados extraídos:', { email, name, plan, customerId, companyType })

    if (!email) {
      console.log('[finish-signup] Erro: Email não encontrado')
      return NextResponse.json({ error: 'Email não encontrado no checkout' }, { status: 400 })
    }

    // Verificar se usuário já existe
    let user = await prisma.user.findUnique({ where: { email } })
    
    if (user) {
      console.log('[finish-signup] Usuário já existe, verificando se processo está completo:', user.email)
      // Verificar se o usuário tem uma empresa/supplier ativa
      let hasActiveEntity = false
      if (companyType === 'supplier') {
        const company = await prisma.company.findFirst({ where: { ownerId: user.id, isActive: true } })
        hasActiveEntity = !!company
      } else {
        const business = await prisma.business.findFirst({ where: { ownerId: user.id, isActive: true } })
        hasActiveEntity = !!business
      }

      if (hasActiveEntity && user.isActive) {
        console.log('[finish-signup] Processo já completamente finalizado para:', user.email)
        // Tentar limpar restos de senha temporária (provavelmente já removida em execução anterior)
        try {
          await prisma.verification.delete({ where: { id: `checkout:pwd:${sessionId}` } })
        } catch {}

        return NextResponse.json({
          success: true,
          alreadyFinished: true,
            message: 'Cadastro já finalizado anteriormente',
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role
            },
            business: null,
            tempPassword: null
        })
      } else {
        console.log('[finish-signup] Usuário existe mas processo incompleto, continuando...')
      }
    }

    console.log('[finish-signup] Criando usuário via Better Auth...')
    
    // Criar usuário com Better Auth (que automaticamente cria conta e senha)
    if (!user) {
      try {
        const authResult = await auth.api.signUpEmail({
          body: {
            email,
            password: rawPassword,
            name: name
          }
        })

        if (!authResult.user) {
          throw new Error('Falha ao criar conta do usuário')
        }

        console.log('[finish-signup] Better Auth criou usuário com ID:', authResult.user.id)

        // Buscar usuário criado para ter tipagem correta
        user = await prisma.user.findUnique({ 
          where: { email } 
        })
        
        if (!user) {
          // Se não encontrou por email, buscar por ID do Better Auth
          user = await prisma.user.findUnique({
            where: { id: authResult.user.id }
          })
        }
        
        if (!user) {
          throw new Error('Usuário criado mas não encontrado no banco')
        }
        
        console.log('[finish-signup] Usuário encontrado no Prisma:', user.id, user.email)
      } catch (createError) {
        console.error('[finish-signup] Erro ao criar usuário:', createError)
        return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
      }
    }
    
    // Definir role correto baseado no tipo de empresa
    let userRole = 'customer'
    if (companyType === 'supplier') {
      userRole = 'supplierOwner'
    } else if (companyType === 'delivery_company') {
      userRole = 'businessOwner'
    }
    
    // Atualizar dados específicos do checkout incluindo role
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: customerId || user.stripeCustomerId,
        emailVerified: true,
        isActive: true,
        role: userRole
      }
    })
    
    console.log('[finish-signup] Usuário configurado:', user.id, 'Role:', user.role)

    // Criar empresa/supplier baseado no tipo
    if (companyType === 'supplier') {
      // Criar Company primeiro
      let company = await prisma.company.findFirst({ where: { ownerId: user.id } })
      if (!company) {
        const baseName = metadata.businessName || user.name || 'minha-empresa'
        const proposed = slugify(baseName)
        let finalSlug = proposed || `sup-${user.id.slice(0, 6)}`
        let suffix = 1
        while (await prisma.company.findFirst({ where: { slug: finalSlug } })) {
          finalSlug = `${proposed}-${suffix++}`
        }

        company = await prisma.company.create({
          data: {
            name: metadata.businessName || (user.name ? `${user.name} Fornecedor` : 'Minha Empresa'),
            email: user.email,
            password: 'temporary',
            phone: metadata.businessPhone || '',
            address: metadata.businessAddress || 'A definir',
            description: `Fornecedor criado via checkout`,
            ownerId: user.id,
            isActive: false,
            slug: finalSlug,
            type: 'SUPPLIER'
          }
        })

        // Criar Supplier
        await prisma.supplier.create({
          data: {
            companyId: company.id,
            category: 'FOOD_INGREDIENTS', // Default, pode ser configurado depois
            businessModel: 'B2B',
            isActive: true,
            isFeatured: false
          }
        })

        console.log('[finish-signup] Supplier criado para company:', company.id, 'slug:', company.slug)
      }
    } else {
      // Criar Business tradicional para delivery_company
      let business = await prisma.business.findFirst({ where: { ownerId: user.id } })
      if (!business) {
        // Gerar slug único baseado no nome da empresa ou do usuário
        const baseName = metadata.businessName || user.name || 'minha-empresa'
        const proposed = slugify(baseName)
        let finalSlug = proposed || `rest-${user.id.slice(0, 6)}`
        let suffix = 1
        while (await prisma.business.findFirst({ where: { slug: finalSlug } })) {
          finalSlug = `${proposed}-${suffix++}`
        }

        business = await prisma.business.create({
          data: {
            name: metadata.businessName || (user.name ? `Empresa de ${user.name}` : 'Minha Empresa'),
            email: `${user.email}-business`,
            password: 'temporary',
            phone: metadata.businessPhone || '',
            address: metadata.businessAddress || 'A definir',
            description: `${metadata.category || 'Empresa'} criada via checkout`,
            ownerId: user.id,
            isActive: false,
            slug: finalSlug,
            deliveryFee: 5.00,
            minimumOrder: 20.00,
            deliveryTime: 30
          }
        })

        console.log('[finish-signup] Business criado:', business.id, 'slug:', business.slug)
      }
    }

    // Processar assinatura se existir
    if (session.subscription) {
      console.log('[finish-signup] Processando assinatura...')
      try {
        // Determinar plano baseado nos metadados ou usar 'basic' como padrão
        const planId = metadata.plan || 'basic'
        
        // Extrair ID da subscription (pode ser string ou objeto expandido)
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription.id
        
        console.log('[finish-signup] ID da subscription:', subscriptionId)
        
        // Criar assinatura no banco local
        const businessEntity = companyType === 'supplier' 
          ? await prisma.company.findFirst({ where: { ownerId: user.id } })
          : await prisma.business.findFirst({ where: { ownerId: user.id } })
        
        if (businessEntity) {
          await SubscriptionService.createSubscription(
            businessEntity.id,
            planId,
            metadata.stripePriceId || '',
            customerId,
            subscriptionId
          )
        }
        console.log('[finish-signup] Assinatura processada com sucesso')
      } catch (subError) {
        console.error('[finish-signup] Erro ao processar assinatura:', subError)
        // Não falhar o processo por erro de assinatura
      }
    }

    // Ativar usuário e empresa/supplier
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true }
    })

        // Ativar a entidade criada baseada no tipo
    let businessEntity: { id: string; name: string; slug?: string | null } | null = null
    if (companyType === 'supplier') {
      const company = await prisma.company.findFirst({ where: { ownerId: user.id } })
      if (company) {
        await prisma.company.update({
          where: { id: company.id },
          data: { isActive: true }
        })
        businessEntity = company
      }
    } else {
      const business = await prisma.business.findFirst({ where: { ownerId: user.id } })
      if (business) {
        await prisma.business.update({
          where: { id: business.id },
          data: { isActive: true }
        })
        businessEntity = business
      }
    }

    // Limpar senha temporária após uso (apenas no final do processo)
    try {
      await prisma.verification.delete({ where: { id: `checkout:pwd:${sessionId}` } })
      console.log('[finish-signup] Senha temporária removida com sucesso')
    } catch (error) {
      console.warn('[finish-signup] Falha ao limpar senha temporária (pode já ter sido removida):', error)
    }

    console.log('[finish-signup] Processo finalizado com sucesso para:', user.email)

    return NextResponse.json({
      success: true,
      message: 'Cadastro finalizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      business: businessEntity ? {
        id: businessEntity.id,
        name: businessEntity.name,
        slug: businessEntity.slug,
        type: companyType
      } : null,
      tempPassword: rawPassword
    })

  } catch (error) {
    console.error('[finish-signup] Erro geral:', error)
    if (error instanceof Error) {
      console.error('[finish-signup] Error message:', error.message)
      console.error('[finish-signup] Error stack:', error.stack)
    }
    
    return NextResponse.json({ error: 'Erro ao finalizar cadastro' }, { status: 500 })
  }
}
