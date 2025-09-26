import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import bcrypt from 'bcryptjs'

// Armazenar senha temporariamente de forma segura para o fluxo de checkout
export async function POST(request: NextRequest) {
  try {
    const { sessionId, password } = await request.json()
    
    if (!sessionId || !password) {
      return NextResponse.json({ error: 'SessionId e password obrigatórios' }, { status: 400 })
    }

    // Hash da senha para não armazenar em texto plano
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Armazenar tanto a versão hasheada quanto a raw (necessária para Better Auth)
    const dataToStore = JSON.stringify({
      hashedPassword,
      rawPassword: password, // Necessário para Better Auth criar a conta
      timestamp: Date.now()
    })
    
    // Expiração de 1 hora (checkout normalmente leva poucos minutos)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    
    console.log('[stash-password] Armazenando senha para sessionId:', sessionId)
    
    // Usar tabela Verification para armazenar temporariamente
    await prisma.verification.upsert({
      where: {
        id: `checkout:pwd:${sessionId}`
      },
      update: {
        value: dataToStore,
        expiresAt,
        updatedAt: new Date()
      },
      create: {
        id: `checkout:pwd:${sessionId}`,
        identifier: sessionId,
        value: dataToStore,
        expiresAt
      }
    })
    
    return NextResponse.json({ success: true, message: 'Senha armazenada com segurança' })
    
  } catch (error) {
    console.error('[stash-password] Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Endpoint para recuperar senha (usado internamente pelo finish-signup)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const raw = searchParams.get('raw') === 'true'
    
    if (!sessionId) {
      console.log('[stash-password] GET: SessionId obrigatório')
      return NextResponse.json({ error: 'SessionId obrigatório' }, { status: 400 })
    }
    
    console.log('[stash-password] Recuperando senha para sessionId:', sessionId)
    
    const verification = await prisma.verification.findUnique({
      where: { id: `checkout:pwd:${sessionId}` }
    })
    
    if (!verification) {
      console.log('[stash-password] Senha não encontrada para sessionId:', sessionId)
      return NextResponse.json({ 
        error: 'Senha não encontrada ou já foi removida',
        code: 'PASSWORD_NOT_FOUND'
      }, { status: 404 })
    }
    
    if (verification.expiresAt < new Date()) {
      console.log('[stash-password] Senha expirada para sessionId:', sessionId)
      // Remover entrada expirada
      try {
        await prisma.verification.delete({ where: { id: `checkout:pwd:${sessionId}` } })
      } catch (deleteError) {
        console.warn('[stash-password] Erro ao remover senha expirada:', deleteError)
      }
      return NextResponse.json({ 
        error: 'Senha expirada',
        code: 'PASSWORD_EXPIRED'
      }, { status: 410 })
    }
    
    // Tentar fazer parse dos dados JSON
    let passwordData
    try {
      passwordData = JSON.parse(verification.value)
    } catch (parseError) {
      console.warn('[stash-password] Erro ao fazer parse dos dados, usando formato antigo:', parseError)
      // Fallback para formato antigo (apenas hash)
      passwordData = { hashedPassword: verification.value, rawPassword: null }
    }
    
    if (raw && passwordData.rawPassword) {
      // Retornar senha raw para Better Auth
      console.log('[stash-password] Retornando senha raw para sessionId:', sessionId)
      return NextResponse.json({ 
        rawPassword: passwordData.rawPassword,
        found: true 
      })
    } else if (raw && !passwordData.rawPassword) {
      console.log('[stash-password] Senha raw não disponível para sessionId:', sessionId)
      return NextResponse.json({ 
        error: 'Senha raw não disponível',
        code: 'RAW_PASSWORD_NOT_AVAILABLE'
      }, { status: 404 })
    } else {
      // Retornar hash da senha (compatibilidade)
      console.log('[stash-password] Retornando hash da senha para sessionId:', sessionId)
      return NextResponse.json({ 
        hashedPassword: passwordData.hashedPassword || verification.value,
        found: true 
      })
    }
    
  } catch (error) {
    console.error('[stash-password] Erro ao recuperar:', error)
    return NextResponse.json({ 
      error: 'Erro interno',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}