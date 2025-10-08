import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'

const CreateInstanceSchema = z.object({
  instanceName: z.string().min(1),
})

// URL base da Evolution API
const EVOLUTION_API_BASE_URL = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
    }

    const body = await request.json()
    const { instanceName } = CreateInstanceSchema.parse(body)

    // Verificar se o usuário tem uma empresa fornecedora
    const supplier = await prisma.company.findFirst({
      where: {
        ownerId: sessionResponse.user.id,
        type: 'SUPPLIER'
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Empresa fornecedora não encontrada' }, { status: 404 })
    }

    // Verificar se já existe configuração existente para reutilizar instância (evitar recriar e perder sessão)
  const existing = await prisma.whatsappConfig.findUnique({ where: { companyId: supplier.id } })

    if (existing && existing.enabled && existing.status === 'CONNECTED') {
      console.log('[WhatsApp API] Reutilizando instância já conectada:', existing.instanceName)
      return NextResponse.json({
        success: true,
        instanceName: existing.instanceName,
        instanceId: existing.instanceId,
        qrCode: null,
        webhookUrl: existing.webhookUrl,
        configId: existing.id,
        reused: true,
      })
    }

    // Nome base estável (sem timestamp) para facilitar reconexão
    const baseInstanceName = `${instanceName}_${supplier.id}`
    // Decidir se precisamos criar uma nova instância remota
    const needNewInstance = !existing || !existing.enabled || existing.status === 'DISCONNECTED'
    // Reutilizar nome existente caso já haja config; senão usar base
    const uniqueInstanceName = existing ? existing.instanceName : baseInstanceName
    let instanceIdFromApi: string | undefined
    let createdNow = false

    if (needNewInstance) {
      console.log(`[WhatsApp API] Criando nova instância (needNewInstance=${needNewInstance}): ${uniqueInstanceName}`)
      const createInstanceResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName: uniqueInstanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`,
            byEvents: false,
            base64: false,
            events: [
              'APPLICATION_STARTUP',
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT'
            ]
          }
        }),
      })
      if (!createInstanceResponse.ok) {
        const error = await createInstanceResponse.text()
        console.error('[WhatsApp API] Erro ao criar instância:', error)
        return NextResponse.json({ error: 'Erro ao criar instância do WhatsApp' }, { status: 500 })
      }
      const instanceData = await createInstanceResponse.json()
      instanceIdFromApi = instanceData.instance?.instanceId
      createdNow = true
      console.log('[WhatsApp API] Instância criada:', instanceIdFromApi)
    } else {
      console.log('[WhatsApp API] Reutilizando instância existente (status atual):', existing?.status)
    }

    // Upsert config (sem sobrescrever status CONNECTED se já estiver assim)
    const whatsappConfig = await prisma.whatsappConfig.upsert({
      where: { companyId: supplier.id },
      update: {
        instanceName: uniqueInstanceName,
        instanceId: instanceIdFromApi || existing?.instanceId || uniqueInstanceName,
        status: existing?.status === 'CONNECTED' ? 'CONNECTED' : 'CONNECTING',
        enabled: true,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`,
      },
      create: {
        companyId: supplier.id,
        instanceName: uniqueInstanceName,
        instanceId: instanceIdFromApi || uniqueInstanceName,
        status: 'CONNECTING',
        enabled: true,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`,
        botEnabled: false,
        botPrompt: `Você é um assistente virtual da ${supplier.name}. Ajude os clientes a fazer pedidos dos nossos produtos. Seja educado e profissional.`,
      },
    })

    // Agora conectar para gerar QR Code
    console.log(`[WhatsApp API] Iniciando (ou reforçando) conexão para instância: ${uniqueInstanceName}`)
    let connectResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/connect/${uniqueInstanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    // Se a conexão falhar por inexistência da instância e não criamos agora, tentar criar e reconectar (recovery)
    if (!connectResponse.ok && !createdNow && !needNewInstance && existing) {
      const text = await connectResponse.text()
      if (/404|not\s*found|instance/i.test(text)) {
        console.warn('[WhatsApp API] Instância remota ausente. Tentando recriar e reconectar...')
        const recreateResp = await fetch(`${EVOLUTION_API_BASE_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            instanceName: uniqueInstanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhook: {
              url: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`,
              byEvents: false,
              base64: false,
              events: [
                'APPLICATION_STARTUP',
                'QRCODE_UPDATED',
                'CONNECTION_UPDATE',
                'MESSAGES_UPSERT'
              ]
            }
          })
        })
        if (recreateResp.ok) {
          console.log('[WhatsApp API] Instância recriada com sucesso. Reexecutando connect...')
          connectResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/connect/${uniqueInstanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY },
          })
        } else {
          console.error('[WhatsApp API] Falha ao recriar instância:', await recreateResp.text())
        }
      }
    }

    let qrCode = ''
    if (connectResponse.ok) {
      const connectData = await connectResponse.json()
      console.log(`[WhatsApp API] Conexão iniciada:`, connectData)
      
      // Na Evolution API v2, o QR code pode vir em diferentes formatos na resposta
      if (connectData.qrcode?.base64) {
        qrCode = connectData.qrcode.base64
      } else if (connectData.base64) {
        qrCode = connectData.base64
      } else if (connectData.qrcode?.code) {
        qrCode = connectData.qrcode.code
      }
      
      console.log(`[WhatsApp API] QR Code: ${qrCode ? 'Recebido imediatamente (' + qrCode.length + ' chars)' : 'Aguardando webhook'}`)
      
      // Se já temos o QR Code da resposta da API, atualizar no banco imediatamente
      if (qrCode) {
        await prisma.whatsappConfig.update({
          where: { id: whatsappConfig.id },
          data: {
            qrCode: qrCode,
            status: 'CONNECTING',
          }
        })
        console.log(`[WhatsApp API] QR Code salvo no banco de dados`)
      }
    } else {
      console.error(`[WhatsApp API] Erro ao conectar instância: ${connectResponse.status} - ${await connectResponse.text()}`)
    }

    return NextResponse.json({
      success: true,
      instanceName: uniqueInstanceName,
      instanceId: whatsappConfig.instanceId,
      qrCode,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`,
      configId: whatsappConfig.id,
      createdNow,
    })

  } catch (error) {
    console.error('Erro na API do WhatsApp:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: _request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar configurações do WhatsApp
    const supplier = await prisma.company.findFirst({
      where: {
        ownerId: sessionResponse.user.id,
        type: 'SUPPLIER'
      },
      include: {
        whatsappConfig: true
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Empresa fornecedora não encontrada' }, { status: 404 })
    }

    let config = supplier.whatsappConfig

    // Fallback de sincronização: se não conectado, tentar obter estado real da Evolution API
    if (config && config.status !== 'CONNECTED') {
      try {
        const statusResp = await fetch(`${EVOLUTION_API_BASE_URL}/instance/fetchInstances`, {
          headers: { 'apikey': EVOLUTION_API_KEY || '' }
        })
        if (statusResp.ok) {
          const instances = await statusResp.json()
          type RemoteInstance = { name?: string; connectionStatus?: string }
          const arr = Array.isArray(instances) ? (instances as RemoteInstance[]) : []
          const found = arr.find(i => i.name === config!.instanceName) || null
          if (found) {
            const remoteStatus = (found.connectionStatus || '').toLowerCase()
            let mapped: 'DISCONNECTED'|'CONNECTING'|'CONNECTED' = 'DISCONNECTED'
            if (remoteStatus === 'open' || remoteStatus === 'connected') mapped = 'CONNECTED'
            else if (remoteStatus === 'connecting') mapped = 'CONNECTING'
            if (mapped !== config.status) {
              config = await prisma.whatsappConfig.update({
                where: { id: config.id },
                data: {
                  status: mapped,
                  qrCode: mapped === 'CONNECTED' ? null : config.qrCode,
                  lastConnected: mapped === 'CONNECTED' ? new Date() : config.lastConnected
                }
              })
              console.log('[WhatsApp API][SYNC] Status reconciliado com Evolution API:', mapped)
            }
          }
        }
      } catch (syncErr) {
        console.log('[WhatsApp API][SYNC] Falha ao sincronizar status:', syncErr)
      }
    }

    return NextResponse.json({ success: true, config })

  } catch (error) {
    console.error('Erro ao buscar configurações do WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: _request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
    }

    const supplier = await prisma.company.findFirst({
      where: {
        ownerId: sessionResponse.user.id,
        type: 'SUPPLIER'
      },
      include: {
        whatsappConfig: true
      }
    })

    if (!supplier || !supplier.whatsappConfig) {
      return NextResponse.json({ error: 'Configuração do WhatsApp não encontrada' }, { status: 404 })
    }

    const { instanceName } = supplier.whatsappConfig

    // Deletar instância na Evolution API
    const deleteResponse = await fetch(`${EVOLUTION_API_BASE_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!deleteResponse.ok) {
      console.error('Erro ao deletar instância na Evolution API')
    }

    // Desabilitar no banco
    await prisma.whatsappConfig.update({
      where: { id: supplier.whatsappConfig.id },
      data: {
        enabled: false,
        status: 'DISCONNECTED',
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao deletar instância do WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Atualizar configurações do bot (botEnabled / botPrompt)
export async function PATCH(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const supplier = await prisma.company.findFirst({
      where: {
        ownerId: sessionResponse.user.id,
        type: 'SUPPLIER'
      },
      include: { whatsappConfig: true }
    })

    if (!supplier || !supplier.whatsappConfig) {
      return NextResponse.json({ error: 'Configuração do WhatsApp não encontrada' }, { status: 404 })
    }

    const BodySchema = z.object({
      botEnabled: z.boolean().optional(),
      botPrompt: z.string().min(5, 'Prompt muito curto').max(4000, 'Prompt muito longo').optional()
    })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const data = BodySchema.parse(body)

    if (typeof data.botEnabled === 'undefined' && typeof data.botPrompt === 'undefined') {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
    }

    const updated = await prisma.whatsappConfig.update({
      where: { id: supplier.whatsappConfig.id },
      data: {
        botEnabled: typeof data.botEnabled === 'boolean' ? data.botEnabled : supplier.whatsappConfig.botEnabled,
        botPrompt: typeof data.botPrompt === 'string' ? data.botPrompt.trim() : supplier.whatsappConfig.botPrompt
      }
    })

    return NextResponse.json({ success: true, config: updated })
  } catch (error) {
    console.error('[WhatsApp API] Erro ao atualizar bot:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map(i => i.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}