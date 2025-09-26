import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { checkLimit, incrementUsageAfterCreate, decrementUsageAfterDelete, LimitError } from '@/lib/security/limit-middleware'
import { PrismaClient } from '@prisma/client'
import { createProductSchema, validateUUID } from '@/lib/validation/schemas'
import { secureLogger } from '@/lib/security/sanitize'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Verificar sessão do usuário
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validar dados de entrada
    const validation = createProductSchema.safeParse(body)
    if (!validation.success) {
      secureLogger.warn('Product validation failed', { 
        errors: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
      })
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, description, price, categoryId } = validation.data

    // Buscar negócio do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedBusinesses[0]) {
      return NextResponse.json(
        { error: 'Negócio não encontrado' },
        { status: 404 }
      )
    }

    const businessId = user.ownedBusinesses[0].id

    // Verificar limite antes de criar produto
    await checkLimit(businessId, 'product')

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        categoryId,
        businessId,
      },
    })

    // Incrementar contador de uso
    await incrementUsageAfterCreate(businessId, 'product')

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof LimitError) {
      return NextResponse.json(
        { 
          error: error.message,
          limitType: error.limitType,
          needsUpgrade: true 
        },
        { status: 403 }
      )
    }

    secureLogger.error('Error creating product', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar sessão do usuário
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    if (!productId || !validateUUID(productId)) {
      secureLogger.warn('Invalid product ID provided', { productId })
      return NextResponse.json(
        { error: 'ID do produto é obrigatório e deve ser válido' },
        { status: 400 }
      )
    }

    // Buscar negócio do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.ownedBusinesses[0]) {
      return NextResponse.json(
        { error: 'Negócio não encontrado' },
        { status: 404 }
      )
    }

    const businessId = user.ownedBusinesses[0].id

    // Verificar se o produto pertence ao negócio do usuário
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Deletar produto
    await prisma.product.delete({
      where: { id: productId },
    })

    // Decrementar contador de uso
    await decrementUsageAfterDelete(businessId, 'product')

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Error deleting product', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
