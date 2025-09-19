import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWebSocketServer, broadcastToConversation } from '@/lib/ws-server'

export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: req.headers })
    
    if (!sessionResponse?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const conversationId = params.conversationId

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        customerId: sessionResponse.user.id
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true,
            phone: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        restaurant: {
          id: conversation.restaurant.id,
          name: conversation.restaurant.name,
          slug: conversation.restaurant.slug,
          profileImage: conversation.restaurant.avatar,
          phone: conversation.restaurant.phone
        },
        messages: conversation.messages
      }
    })

  } catch (error) {
    console.error('Erro ao buscar mensagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: req.headers })
    
    if (!sessionResponse?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { conversationId } = params
    const body = await req.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Conteúdo da mensagem é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a conversa existe e pertence ao usuário
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        customerId: sessionResponse.user.id
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Criar a mensagem
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        content: content.trim(),
        senderType: 'CUSTOMER',
        senderId: sessionResponse.user.id
      }
    })

    // Atualizar timestamp da conversa
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    // Enviar via WebSocket para o restaurante
    const wsServer = getWebSocketServer()
    if (wsServer) {
      broadcastToConversation(wsServer, conversationId, {
        type: 'chat-message',
        data: {
          conversationId,
          message: {
            id: message.id,
            content: message.content,
            senderType: message.senderType,
            createdAt: message.createdAt.toISOString(),
            isRead: message.isRead
          }
        }
      })
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        createdAt: message.createdAt.toISOString(),
        isRead: message.isRead
      }
    })

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}