import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: req.headers })
    
    if (!sessionResponse?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar conversas do usuário
    const conversations = await prisma.conversation.findMany({
      where: {
        customerId: sessionResponse.user.id
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderType: true
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderType: 'RESTAURANT'
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Formatar os dados para o frontend
    const formattedConversations = conversations.map(conversation => ({
      id: conversation.id,
      restaurant: {
        id: conversation.restaurant.id,
        name: conversation.restaurant.name,
        slug: conversation.restaurant.slug,
        profileImage: conversation.restaurant.avatar
      },
      lastMessage: conversation.messages[0] || null,
      unreadCount: conversation._count.messages,
      updatedAt: conversation.updatedAt.toISOString()
    }))

    return NextResponse.json({
      conversations: formattedConversations
    })

  } catch (error) {
    console.error('Erro ao buscar conversas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}