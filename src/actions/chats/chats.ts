'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'
import {
  ActionResult,
  createSuccessResult,
  handleActionError,
  getAuthenticatedUser
} from '@/lib/actions/auth-helpers'
import {
  validateData,
  validateId
} from '@/lib/actions/validation-helpers'
import { z } from 'zod'

// Schemas de validação
const SendMessageSchema = z.object({
  content: z.string().min(1, 'Conteúdo da mensagem é obrigatório').trim()
})

export interface Conversation {
  id: string
  business: {
    id: string
    name: string
    slug: string
    profileImage: string | null
  }
  lastMessage: {
    id: string
    content: string
    createdAt: Date
    senderType: string
  } | null
  unreadCount: number
  updatedAt: string
}

export interface ConversationDetails {
  id: string
  business: {
    id: string
    name: string
    slug: string
    profileImage: string | null
    phone: string | null
  }
  messages: Array<{
    id: string
    content: string
    senderType: string
    createdAt: Date
    isRead: boolean
    senderId: string
  }>
}

export interface ChatMessage {
  id: string
  content: string
  senderType: string
  createdAt: string
  isRead: boolean
}

// Helper para buscar conversas considerando telefone
async function findConversationsQuery(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true }
  })

  let phone = dbUser?.phone

  // Se o usuário não tiver telefone no perfil, tentar buscar do último pedido
  if (!phone) {
    const lastOrder = await prisma.order.findFirst({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: { customerPhone: true }
    })
    if (lastOrder?.customerPhone) {
      phone = lastOrder.customerPhone
    }
  }

  return {
    OR: [
      { customerId: userId },
      ...(phone ? [{ customerPhone: phone }] : [])
    ]
  }
}

/**
 * Busca todas as conversas do usuário
 */
async function _getConversations(): Promise<ActionResult<{ conversations: Conversation[] }>> {
  try {
    const user = await getAuthenticatedUser()
    const whereCondition = await findConversationsQuery(user.id)

    const conversations = await prisma.conversation.findMany({
      where: whereCondition,
      include: {
        business: {
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
                senderType: 'BUSINESS'
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    const formattedConversations: Conversation[] = conversations.map(conversation => ({
      id: conversation.id,
      business: {
        id: conversation.business.id,
        name: conversation.business.name,
        slug: conversation.business.slug || '',
        profileImage: conversation.business.avatar
      },
      lastMessage: conversation.messages[0] || null,
      unreadCount: conversation._count.messages,
      updatedAt: conversation.updatedAt.toISOString()
    }))

    return createSuccessResult({ conversations: formattedConversations })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Busca detalhes de uma conversa específica com suas mensagens
 */
async function _getConversationDetails(conversationId: string): Promise<ActionResult<{ conversation: ConversationDetails }>> {
  try {
    const user = await getAuthenticatedUser()
    const validConversationId = validateId(conversationId, 'ID da conversa')
    const whereCondition = await findConversationsQuery(user.id)

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: validConversationId,
        ...whereCondition
      },
      include: {
        business: {
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
      return handleActionError(new Error('Conversa não encontrada'))
    }

    // Auto-link se necessário (se achou por telefone)
    if (!conversation.customerId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { customerId: user.id }
      })
    }

    const conversationDetails: ConversationDetails = {
      id: conversation.id,
      business: {
        id: conversation.business.id,
        name: conversation.business.name,
        slug: conversation.business.slug || '',
        profileImage: conversation.business.avatar,
        phone: conversation.business.phone
      },
      messages: conversation.messages.map(message => ({
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        createdAt: message.createdAt,
        isRead: message.isRead,
        senderId: message.senderId || ''
      }))
    }

    return createSuccessResult({ conversation: conversationDetails })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Envia uma nova mensagem em uma conversa
 */
async function _sendMessage(conversationId: string, data: { content: string }): Promise<ActionResult<{ message: ChatMessage }>> {
  try {
    const user = await getAuthenticatedUser()
    const validConversationId = validateId(conversationId, 'ID da conversa')
    const validatedData = validateData(SendMessageSchema, data)
    const whereCondition = await findConversationsQuery(user.id)

    // Verificar se a conversa existe e pertence ao usuário
    let conversation = await prisma.conversation.findFirst({
      where: {
        id: validConversationId,
        ...whereCondition
      }
    })

    if (!conversation) {
      return handleActionError(new Error('Conversa não encontrada'))
    }

    // Auto-link
    if (!conversation.customerId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { customerId: user.id }
      })
    }

    // Criar a mensagem
    const message = await prisma.chatMessage.create({
      data: {
        conversationId: validConversationId,
        content: validatedData.content,
        senderType: 'CUSTOMER',
        senderId: user.id
      }
    })

    // Atualizar timestamp da conversa
    await prisma.conversation.update({
      where: { id: validConversationId },
      data: { updatedAt: new Date() }
    })

    console.log(`[CHAT] Nova mensagem na conversa ${conversationId}`)

    const chatMessage: ChatMessage = {
      id: message.id,
      content: message.content,
      senderType: message.senderType,
      createdAt: message.createdAt.toISOString(),
      isRead: message.isRead
    }

    // Revalidar páginas relacionadas
    revalidatePath('/chats')
    revalidatePath(`/chats/${conversationId}`)

    return createSuccessResult({ message: chatMessage })
  } catch (error) {
    return handleActionError(error)
  }
}

/**
 * Marca mensagens de uma conversa como lidas
 */
async function _markMessagesAsRead(conversationId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedUser()
    const validConversationId = validateId(conversationId, 'ID da conversa')
    const whereCondition = await findConversationsQuery(user.id)

    // Verificar se a conversa existe e pertence ao usuário
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: validConversationId,
        ...whereCondition
      }
    })

    if (!conversation) {
      return handleActionError(new Error('Conversa não encontrada'))
    }

    // Marcar mensagens como lidas (apenas as que foram enviadas pelo negócio)
    await prisma.chatMessage.updateMany({
      where: {
        conversationId: validConversationId,
        senderType: 'BUSINESS',
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    // Revalidar páginas relacionadas
    revalidatePath('/chats')
    revalidatePath(`/chats/${conversationId}`)

    return createSuccessResult({ success: true })
  } catch (error) {
    return handleActionError(error)
  }
}

// Exportar funções sem wrapper de autenticação por agora
export const getConversations = _getConversations
export const getConversationDetails = _getConversationDetails
export const sendMessage = _sendMessage
export const markMessagesAsRead = _markMessagesAsRead