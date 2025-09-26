import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { auth } from '@/lib/auth/auth'
import { slugify } from '@/lib/utils/formatters'
import { ensureUserInDatabase } from '@/lib/auth/user-sync'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    console.log('[business/create] Sessão:', {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name
    })

    // Garantir que o usuário existe no banco Prisma antes de criar negócio
    const userSynced = await ensureUserInDatabase(session.user)
    if (!userSynced) {
      console.error('[business/create] Falha ao sincronizar usuário com Prisma')
      return NextResponse.json({ error: 'Erro ao sincronizar dados do usuário' }, { status: 500 })
    }

    // Verificar se o usuário existe no banco de dados (deve existir agora)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    console.log('[business/create] Usuário existe?', userExists ? 'SIM' : 'NÃO')
    
    if (!userExists) {
      console.error('[business/create] Usuário ainda não encontrado após sincronização:', session.user.id)
      return NextResponse.json({ error: 'Usuário não encontrado no banco de dados' }, { status: 404 })
    }

  const { businessName, businessPhone, businessAddress, category } = await request.json()

    if (!businessName || !businessPhone || !businessAddress) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    // Verifica se já existe um negócio do usuário
    const existing = await prisma.business.findFirst({ where: { ownerId: session.user.id } })
    if (existing) {
      return NextResponse.json({ id: existing.id, alreadyExists: true })
    }

    const slug = slugify(businessName)
    // garantir unicidade simples em caso de colisão
    let finalSlug = slug
    let suffix = 1
    while (true) {
      const exists = await prisma.business.findFirst({ where: { slug: finalSlug } })
      if (!exists) break
      finalSlug = `${slug}-${suffix++}`
    }

    console.log('[business/create] Criando negócio com dados:', {
      slug: finalSlug,
      name: businessName,
      ownerId: session.user.id,
      phone: businessPhone,
      address: businessAddress
    })

    const business = await prisma.business.create({
      data: {
        slug: finalSlug,
        name: businessName,
        email: `${session.user.email}-business`,
        password: 'temporary',
        phone: businessPhone,
        address: businessAddress,
        description: `${category || 'Negócio'} criado via FastLivery`,
        ownerId: session.user.id,
        isOpen: false,
        acceptsDelivery: true,
        acceptsPickup: true,
        acceptsDineIn: false,
        minimumOrder: 0,
        deliveryFee: 5.0,
        deliveryTime: 30,
      }
    })

    console.log('[business/create] Negócio criado com sucesso:', business.id)

    return NextResponse.json({ id: business.id })
  } catch (error) {
    console.error('Erro ao criar negócio:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
