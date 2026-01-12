import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Verificar se é admin da plataforma
async function verifyPlatformAdmin() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session?.user) {
    return { error: 'Não autorizado', status: 401 }
  }

  const role = session.user.role
  if (role !== 'platformAdmin' && role !== 'platformSupport') {
    return { error: 'Acesso negado', status: 403 }
  }

  return { session }
}

// GET - Listar todas as empresas
export async function GET() {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        isOpen: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(businesses)
  } catch (error) {
    console.error('Erro ao listar empresas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar nova empresa
export async function POST(request: Request) {
  try {
    const authResult = await verifyPlatformAdmin()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      address,
      description,
      slug,
      isActive,
      acceptsDelivery,
      acceptsPickup,
      acceptsDineIn,
      deliveryFee,
      minimumOrder,
      deliveryTime,
      createNewOwner,
      ownerId,
      ownerName,
      ownerEmail,
      ownerPhone,
    } = body

    // Validações básicas
    if (!name || !email || !phone || !address) {
      return NextResponse.json({ message: 'Campos obrigatórios não preenchidos' }, { status: 400 })
    }

    // Verificar se já existe empresa com mesmo email ou slug
    const existingBusiness = await prisma.business.findFirst({
      where: {
        OR: [{ email }, { slug: slug || undefined }],
      },
    })

    if (existingBusiness) {
      return NextResponse.json({ message: 'Já existe uma empresa com este email ou slug' }, { status: 400 })
    }

    let finalOwnerId = ownerId

    // Se for criar novo dono
    if (createNewOwner) {
      if (!ownerName || !ownerEmail) {
        return NextResponse.json({ message: 'Nome e email do dono são obrigatórios' }, { status: 400 })
      }

      // Verificar se já existe usuário com este email
      const existingUser = await prisma.user.findFirst({
        where: { email: ownerEmail },
      })

      if (existingUser) {
        return NextResponse.json({ message: 'Já existe um usuário com este email' }, { status: 400 })
      }

      // Criar usuário do dono
      const newOwnerId = crypto.randomUUID()
      const tempPassword = crypto.randomBytes(16).toString('hex')
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      await prisma.$transaction(async (tx) => {
        // Criar usuário
        await tx.user.create({
          data: {
            id: newOwnerId,
            name: ownerName,
            email: ownerEmail,
            phone: ownerPhone || null,
            role: 'businessOwner',
            isActive: false, // Será ativado quando definir senha
            emailVerified: false,
          },
        })

        // Criar account credential
        await tx.account.create({
          data: {
            id: crypto.randomUUID(),
            accountId: ownerEmail,
            providerId: 'credential',
            userId: newOwnerId,
            type: 'credential',
            password: hashedPassword,
          },
        })

        // Criar token de reset de senha para o dono definir sua senha
        const resetToken = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

        await tx.passwordResetToken.create({
          data: {
            id: crypto.randomUUID(),
            userId: newOwnerId,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
          },
        })

        // TODO: Enviar email com link de setup de senha
        console.log(`[ADMIN] Link de setup para ${ownerEmail}: /setup-password/${resetToken}`)
      })

      finalOwnerId = newOwnerId
    }

    // Gerar senha temporária para a empresa (campo obrigatório no schema)
    const businessPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10)

    // Criar a empresa
    const business = await prisma.business.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        address,
        description: description || null,
        slug: slug || null,
        password: businessPassword,
        isActive: isActive ?? true,
        isOpen: false,
        acceptsDelivery: acceptsDelivery ?? true,
        acceptsPickup: acceptsPickup ?? true,
        acceptsDineIn: acceptsDineIn ?? false,
        deliveryFee: deliveryFee ?? 0,
        minimumOrder: minimumOrder ?? 0,
        deliveryTime: deliveryTime ?? 30,
        ownerId: finalOwnerId || null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Se tem dono, atualizar o businessId do usuário
    if (finalOwnerId) {
      await prisma.user.update({
        where: { id: finalOwnerId },
        data: { businessId: business.id },
      })
    }

    return NextResponse.json(business, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar empresa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
