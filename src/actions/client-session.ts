'use server'

import { prisma } from '@/lib/database/prisma'
import { cookies } from 'next/headers'

export interface ClientSessionData {
  deviceId: string
  orderId: string
  businessSlug: string
  tableNumber?: string
  createdAt: Date
  expiresAt: Date
}

const SESSION_COOKIE_NAME = 'fastlivery_client_session'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 horas

/**
 * Cria ou atualiza uma sessão de cliente
 */
export async function registerClientSession(data: {
  deviceId: string
  orderId: string
  businessSlug: string
  tableNumber?: string
}) {
  try {
    // Verificar se existe uma sessão ativa para este device
    const existingSession = await prisma.clientSession.findUnique({
      where: { deviceId: data.deviceId }
    })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

    if (existingSession) {
      // Atualizar sessão existente
      const updated = await prisma.clientSession.update({
        where: { deviceId: data.deviceId },
        data: {
          orderId: data.orderId,
          businessSlug: data.businessSlug,
          tableNumber: data.tableNumber || null,
          expiresAt
        }
      })
      return { success: true, data: updated }
    } else {
      // Criar nova sessão
      const created = await prisma.clientSession.create({
        data: {
          deviceId: data.deviceId,
          orderId: data.orderId,
          businessSlug: data.businessSlug,
          tableNumber: data.tableNumber || null,
          expiresAt
        }
      })
      return { success: true, data: created }
    }
  } catch (error) {
    console.error('Erro ao registrar sessão de cliente:', error)
    return { success: false, error: 'Falha ao registrar sessão' }
  }
}

/**
 * Recupera a sessão de cliente baseado no deviceId
 */
export async function getClientSession(deviceId: string) {
  try {
    const session = await prisma.clientSession.findUnique({
      where: { deviceId }
    })

    if (!session) {
      return { success: true, data: null }
    }

    // Verificar se a sessão expirou
    if (new Date() > session.expiresAt) {
      // Deletar sessão expirada
      await prisma.clientSession.delete({
        where: { deviceId }
      })
      return { success: true, data: null }
    }

    return { success: true, data: session }
  } catch (error) {
    console.error('Erro ao buscar sessão de cliente:', error)
    return { success: false, error: 'Falha ao buscar sessão' }
  }
}

/**
 * Limpa a sessão de cliente
 */
export async function clearClientSession(deviceId: string) {
  try {
    await prisma.clientSession.delete({
      where: { deviceId }
    }).catch(() => {
      // Se não existe, não precisa de erro
    })
    return { success: true }
  } catch (error) {
    console.error('Erro ao limpar sessão de cliente:', error)
    return { success: false, error: 'Falha ao limpar sessão' }
  }
}

/**
 * Gera um ID de dispositivo único e persiste nos cookies
 */
export async function getOrCreateDeviceId() {
  try {
    const cookieStore = await cookies()
    const DEVICE_ID_COOKIE = 'fastlivery_device_id'
    
    let deviceId = cookieStore.get(DEVICE_ID_COOKIE)?.value
    
    if (!deviceId) {
      // Gerar novo device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      // Persistir por 1 ano
      cookieStore.set(DEVICE_ID_COOKIE, deviceId, {
        maxAge: 365 * 24 * 60 * 60,
        path: '/',
        sameSite: 'lax'
      })
    }
    
    return { success: true, deviceId }
  } catch (error) {
    console.error('Erro ao gerar/recuperar device ID:', error)
    return { success: false, error: 'Falha ao gerar device ID' }
  }
}
