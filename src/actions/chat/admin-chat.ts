'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'

export async function getBusinessConversations(businessId: string) {
    try {
        // Need raw query to get customer_name and customer_phone which are not in Prisma schema
        const conversations: any[] = await prisma.$queryRaw`
      SELECT c.*, 
        (SELECT json_build_object('content', cm.content, 'createdAt', cm."createdAt") 
         FROM chat_messages cm 
         WHERE cm."conversationId" = c.id 
         ORDER BY cm."createdAt" DESC 
         LIMIT 1) as "lastMessageData"
      FROM conversations c
      WHERE c."businessId" = ${businessId}
      ORDER BY c.last_message_at DESC
    `

        // Format the result to match expected structure
        const formatted = conversations.map(c => ({
            ...c,
            messages: c.lastMessageData ? [c.lastMessageData] : []
        }))

        return { success: true, data: formatted }
    } catch (error) {
        console.error('Erro ao buscar conversas:', error)
        return { success: false, error: 'Erro ao carregar chats' }
    }
}

export async function sendMessage(conversationId: string, content: string) {
    try {
        const message = await prisma.chatMessage.create({
            data: {
                conversationId,
                content,
                senderType: 'BUSINESS',
                isRead: false
            }
        })

        await prisma.$executeRaw`
      UPDATE conversations 
      SET last_message = ${content}, 
          last_message_at = NOW(), 
          unread_count_customer = unread_count_customer + 1 
      WHERE id = ${conversationId}
    `

        return { success: true, data: message }
    } catch (error) {
        console.error('Erro ao enviar mensagem admin:', error)
        return { success: false, error: 'Erro ao enviar' }
    }
}

export async function markMessagesRead(conversationId: string) {
    try {
        await prisma.$executeRaw`
      UPDATE conversations SET unread_count_business = 0 WHERE id = ${conversationId}
    `
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
