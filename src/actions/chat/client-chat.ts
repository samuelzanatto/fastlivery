'use server'

import { prisma } from '@/lib/database/prisma'
import { revalidatePath } from 'next/cache'

import { getAuthenticatedUser } from '@/lib/actions/auth-helpers'

export async function getOrCreateConversation(
    businessId: string,
    customerName: string,
    customerPhone: string
) {
    try {
        if (!customerPhone || !businessId) {
            return { success: false, error: 'Dados inválidos' }
        }

        // Tentar obter usuário autenticado
        let userId: string | null = null
        try {
            const user = await getAuthenticatedUser()
            userId = user.id

            // Evitar vincular o dono/funcionário como cliente da própria conversa
            const isOwner = await prisma.business.findFirst({
                where: { id: businessId, ownerId: userId },
                select: { id: true }
            })

            const isEmployee = await prisma.employeeProfile.findFirst({
                where: { businessId: businessId, userId: userId, isActive: true },
                select: { id: true }
            })

            if (isOwner || isEmployee) {
                userId = null
            }
        } catch {
            // Usuário não autenticado
        }

        // Buscar conversa
        let conversation: any = await prisma.$queryRaw`
      SELECT * FROM conversations 
      WHERE "businessId" = ${businessId} 
      AND customer_phone = ${customerPhone}
      LIMIT 1
    `
        conversation = conversation[0]

        // Se não encontrou pelo telefone mas temos userId, tentar pelo customerId
        if (!conversation && userId) {
            conversation = (await prisma.$queryRaw`
              SELECT * FROM conversations 
              WHERE "businessId" = ${businessId} 
              AND "customerId" = ${userId}
              LIMIT 1
            `) as any

            conversation = conversation[0]

            // Se encontrou pelo ID mas o telefone mudou, atualizar telefone
            if (conversation) {
                await prisma.$executeRaw`
                    UPDATE conversations SET customer_phone = ${customerPhone} WHERE id = ${conversation.id}
                 `
            }
        }

        // Se não existir, criar nova
        if (!conversation) {
            // INSERT
            if (userId) {
                await prisma.$executeRaw`
                    INSERT INTO conversations (id, "businessId", customer_phone, customer_name, unread_count_business, unread_count_customer, last_message, last_message_at, "customerId", "updatedAt")
                    VALUES (gen_random_uuid(), ${businessId}, ${customerPhone}, ${customerName}, 0, 0, 'Iniciou uma conversa', NOW(), ${userId}, NOW())
                `
            } else {
                await prisma.$executeRaw`
                    INSERT INTO conversations (id, "businessId", customer_phone, customer_name, unread_count_business, unread_count_customer, last_message, last_message_at, "customerId", "updatedAt")
                    VALUES (gen_random_uuid(), ${businessId}, ${customerPhone}, ${customerName}, 0, 0, 'Iniciou uma conversa', NOW(), NULL, NOW())
                `
            }

            // Fetch it back
            const res: any = await prisma.$queryRaw`
                SELECT * FROM conversations 
                WHERE "businessId" = ${businessId} 
                AND customer_phone = ${customerPhone}
                LIMIT 1
            `
            conversation = res[0]
            conversation.messages = []
        } else {
            // Se existir, atualiza o nome e associa o userId se ainda não tiver
            if (conversation.customer_name !== customerName) {
                await prisma.$executeRaw`
                   UPDATE conversations SET customer_name = ${customerName} WHERE id = ${conversation.id}
                 `
            }

            if (userId && !conversation.customerId) {
                await prisma.$executeRaw`
                   UPDATE conversations SET "customerId" = ${userId} WHERE id = ${conversation.id}
                 `
            }

            // Fetch messages
            const messages = await prisma.chatMessage.findMany({
                where: { conversationId: conversation.id },
                orderBy: { createdAt: 'asc' }
            })
            conversation.messages = messages
        }

        return { success: true, data: conversation }
    } catch (error) {
        console.error('Erro ao buscar/criar conversa:', error)
        return { success: false, error: 'Erro ao iniciar chat' }
    }
}

export async function sendMessage(conversationId: string, content: string) {
    try {
        if (!conversationId || !content) return { success: false }

        const message = await prisma.chatMessage.create({
            data: {
                conversationId,
                content,
                senderType: 'CUSTOMER',
                isRead: false
            }
        })

        // Atualizar conversa
        await prisma.$executeRaw`
      UPDATE conversations 
      SET last_message = ${content}, 
          last_message_at = NOW(), 
          unread_count_business = unread_count_business + 1 
      WHERE id = ${conversationId}
    `

        revalidatePath(`/admin/chats`)
        return { success: true, data: message }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error)
        return { success: false, error: 'Erro ao enviar mensagem' }
    }
}

export async function markMessagesRead(conversationId: string) {
    try {
        await prisma.$executeRaw`
      UPDATE conversations SET unread_count_customer = 0 WHERE id = ${conversationId}
    `
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}
