import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'
import { normalizePhone } from '@/lib/phone'
import { processWhatsAppMessage } from '@/lib/ai/whatsapp-integration'

// Util simples para logs estruturados (poderia substituir por um logger real depois)
function logBot(context: Record<string, unknown>) {
  try {
    console.log('[WhatsApp Bot][DBG]', JSON.stringify(context))
  } catch {
    console.log('[WhatsApp Bot][DBG-fallback]', context)
  }
}

// Função para log detalhado da conversa
function logConversation(data: {
  phone: string
  customerName: string
  userMessage: string
  botResponse: string
  intent: string
  confidence: number
}) {
  console.log('\n=== CONVERSAÇÃO WHATSAPP ===')
  console.log(`📞 Cliente: ${data.customerName} (${data.phone})`)
  console.log(`💬 Mensagem: "${data.userMessage}"`)
  console.log(`🤖 IA Resposta: "${data.botResponse}"`)
  console.log(`🎯 Intent: ${data.intent} (${(data.confidence * 100).toFixed(0)}%)`)
  console.log('==============================\n')
}

// Types
interface WhatsappConfigWithCompany {
  id: string
  instanceName: string
  enabled: boolean
  botEnabled: boolean
  botPrompt: string | null
  company: {
    id: string
    name: string
    supplier: {
      id: string
    } | null
  }
}

// Schema para validação dos webhooks do Evolution API
const WebhookEventSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.any(),
  server_url: z.string().optional(),
  apikey: z.string().optional(),
})

// Schema específico para QR Code - mais flexível para Evolution API v2
const QRCodeUpdateSchema = z.object({
  event: z.enum(['qrcode.updated', 'QRCODE_UPDATED']),
  instance: z.string(),
  data: z.object({
    qrcode: z.object({
      code: z.string().optional(),
      base64: z.string(),
    }).optional(),
    // Formato alternativo que pode vir na v2
    base64: z.string().optional(),
    code: z.string().optional(),
  }),
})

// Schema específico para atualização de conexão
const ConnectionUpdateSchema = z.object({
  event: z.enum(['connection.update', 'CONNECTION_UPDATE']),
  instance: z.string(),
  data: z.object({
    state: z.enum(['open', 'close', 'connecting', 'CONNECTED', 'DISCONNECTED', 'CONNECTING']),
    // Campos adicionais que podem vir
    connection: z.string().optional(),
    lastDisconnect: z.any().optional(),
  }),
})

// Schema específico para mensagens recebidas
const MessageUpsertSchema = z.object({
  event: z.literal('messages.upsert'),
  instance: z.string(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean(),
      id: z.string(),
    }),
    pushName: z.string().optional(),
    message: z.object({
      conversation: z.string().optional(),
      extendedTextMessage: z.object({
        text: z.string(),
      }).optional(),
    }),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar evento básico
    const eventData = WebhookEventSchema.parse(body)
    console.log(`[WhatsApp Webhook] Evento recebido: ${eventData.event} para instância: ${eventData.instance}`)

    // Buscar configuração do WhatsApp pela instância
    const whatsappConfig = await prisma.whatsappConfig.findFirst({
      where: {
        instanceName: eventData.instance
      },
      include: {
        company: {
          include: {
            supplier: true
          }
        }
      }
    })

    if (!whatsappConfig) {
      console.log(`[WhatsApp Webhook] Configuração não encontrada para instância: ${eventData.instance}`)
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    // Processar evento baseado no tipo
    switch (eventData.event.toLowerCase()) {
      case 'qrcode.updated':
      case 'qrcode_updated': {
        try {
          const qrData = QRCodeUpdateSchema.parse(body)
          
          // Extrair QR Code de diferentes formatos possíveis
          let qrCodeBase64 = ''
          if (qrData.data.qrcode?.base64) {
            qrCodeBase64 = qrData.data.qrcode.base64
          } else if (qrData.data.base64) {
            qrCodeBase64 = qrData.data.base64
          }
          
          if (qrCodeBase64) {
            // Atualizar QR Code no banco
            await prisma.whatsappConfig.update({
              where: { id: whatsappConfig.id },
              data: {
                qrCode: qrCodeBase64,
                status: 'CONNECTING',
              }
            })
            console.log(`[WhatsApp Webhook] QR Code atualizado para instância: ${eventData.instance}`)
          }
        } catch (error) {
          console.error('[WhatsApp Webhook] Erro ao processar QR Code:', error)
        }
        break
      }

      case 'connection.update':
      case 'connection_update': {
        try {
          const connectionData = ConnectionUpdateSchema.parse(body)
          
          let status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' = 'DISCONNECTED'
          const state = connectionData.data.state?.toLowerCase()
          
          switch (state) {
            case 'open':
            case 'connected':
              status = 'CONNECTED'
              break
            case 'connecting':
              status = 'CONNECTING'
              break
            case 'close':
            case 'disconnected':
            default:
              status = 'DISCONNECTED'
              break
          }

          // Atualizar status no banco
          await prisma.whatsappConfig.update({
            where: { id: whatsappConfig.id },
            data: {
              status,
              lastConnected: status === 'CONNECTED' ? new Date() : whatsappConfig.lastConnected,
              qrCode: status === 'CONNECTED' ? null : whatsappConfig.qrCode, // Limpar QR Code quando conectado
            }
          })

          console.log(`[WhatsApp Webhook] Status atualizado para: ${status} - instância: ${eventData.instance} - state: ${state}`)
        } catch (error) {
          console.error('[WhatsApp Webhook] Erro ao processar conexão:', error)
        }
        break
      }

      case 'messages.upsert': {
        const messageData = MessageUpsertSchema.parse(body)
        
        // Processar apenas mensagens recebidas (não enviadas por nós)
        if (!messageData.data.key.fromMe) {
          await processIncomingMessage(whatsappConfig, messageData)
        }
        break
      }

      case 'application.startup':
        console.log(`[WhatsApp Webhook] Aplicação iniciada para instância: ${eventData.instance}`)
        break

      case 'send.message':
        console.log(`[WhatsApp Webhook] Mensagem enviada pela instância: ${eventData.instance}`)
        break

      default:
        console.log(`[WhatsApp Webhook] Evento não processado: ${eventData.event}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[WhatsApp Webhook] Erro ao processar webhook:', error)
    
    if (error instanceof z.ZodError) {
      console.error('[WhatsApp Webhook] Erro de validação:', error.issues)
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

async function processIncomingMessage(whatsappConfig: WhatsappConfigWithCompany, messageData: z.infer<typeof MessageUpsertSchema>) {
  try {
  const phoneNumber = normalizePhone(messageData.data.key.remoteJid)
    const messageText = messageData.data.message.conversation || 
                       messageData.data.message.extendedTextMessage?.text || ''
    const customerName = messageData.data.pushName || 'Cliente'

    console.log(`[WhatsApp Bot] Mensagem recebida de ${phoneNumber}: "${messageText}"`)
    console.log(`[WhatsApp Bot] Cliente: ${customerName} | Empresa: ${whatsappConfig.company.name}`)

    // Lógica híbrida: tenta encontrar SupplierClient ou Partnership ativa
    let supplierClient = null
    let partnershipActive = null
    if (whatsappConfig.company.supplier?.id) {
      const supplierId = whatsappConfig.company.supplier.id
      supplierClient = await prisma.supplierClient.findFirst({
        where: { supplierId, phone: phoneNumber }
      })
      if (!supplierClient) {
        partnershipActive = await prisma.partnership.findFirst({
          where: {
            supplierId,
            status: 'ACTIVE'
          }
        })
      }
    }

    if (!supplierClient && !partnershipActive) {
      await sendWhatsAppMessage(whatsappConfig.instanceName, phoneNumber,
        `Olá ${customerName}! Não encontrei um cadastro ou parceria ativa. Envie seu nome para criar cadastro rápido.`)
      if (whatsappConfig.company.supplier?.id && messageText.trim().length > 1) {
        try {
          supplierClient = await prisma.supplierClient.create({
            data: {
              supplierId: whatsappConfig.company.supplier.id,
              name: customerName || 'Cliente',
              phone: phoneNumber,
              whatsappEnabled: true,
              notes: { autoCreatedAt: new Date().toISOString(), source: 'auto' }
            }
          })
          await sendWhatsAppMessage(whatsappConfig.instanceName, phoneNumber,
            `Cadastro criado, ${customerName}. Podemos continuar!`)
        } catch (e) {
          console.error('[WhatsApp Bot] Falha ao autocriar cliente:', e)
        }
      }
    }

    // Se o bot está habilitado, processar com IA
    if (whatsappConfig.botEnabled && whatsappConfig.botPrompt) {
      logBot({ phase: 'pre-ai', reason: 'bot-enabled', companyId: whatsappConfig.company.id, phone: phoneNumber })
      await processWithBot(whatsappConfig, phoneNumber, messageText, customerName)
    } else {
      logBot({ phase: 'skip-ai', reason: 'bot-disabled-or-missing-prompt', botEnabled: whatsappConfig.botEnabled, hasPrompt: !!whatsappConfig.botPrompt })
      await sendWhatsAppMessage(whatsappConfig.instanceName, phoneNumber,
        `Olá ${customerName}! Recebemos sua mensagem. Nossa equipe entrará em contato em breve.`)
    }

  } catch (error) {
    console.error('[WhatsApp Bot] Erro ao processar mensagem:', error)
  }
}

async function processWithBot(whatsappConfig: WhatsappConfigWithCompany, phoneNumber: string, messageText: string, customerName: string) {
  try {
    const startTime = Date.now()
    
    console.log(`[WhatsApp Bot] Processando mensagem com novo sistema de IA...`)
    logBot({ phase: 'ai-processing-start', companyId: whatsappConfig.company.id, phone: phoneNumber })

    // 1. Salvar mensagem recebida
    await prisma.whatsappMessage.create({
      data: {
        companyId: whatsappConfig.company.id,
        phone: phoneNumber,
        direction: 'IN',
        role: 'user',
        content: messageText
      }
    })

    // 2. Processar com o novo sistema de IA
    const botResponse = await processWhatsAppMessage(
      messageText,
      whatsappConfig.company.id,
      phoneNumber,
      customerName
    )

    const processingTime = Date.now() - startTime

    // 3. Enviar resposta
    await sendWhatsAppMessage(whatsappConfig.instanceName, phoneNumber, botResponse)

    // 4. Salvar resposta enviada
    await prisma.whatsappMessage.create({
      data: {
        companyId: whatsappConfig.company.id,
        phone: phoneNumber,
        direction: 'OUT',
        role: 'assistant',
        content: botResponse,
        meta: { 
          processingTimeMs: processingTime,
          systemVersion: 'ai-agent-v2',
          timestamp: new Date().toISOString()
        }
      }
    })

    // 5. Logs estruturados
    logBot({
      phase: 'conversation-complete',
      phone: phoneNumber,
      customer: customerName,
      company: whatsappConfig.company.name,
      userMessage: messageText,
      botResponse: botResponse.slice(0, 150) + (botResponse.length > 150 ? '...' : ''),
      processingTime,
      systemVersion: 'ai-agent-v2'
    })

    // Log visual da conversa
    logConversation({
      phone: phoneNumber,
      customerName,
      userMessage: messageText,
      botResponse: botResponse.slice(0, 200) + (botResponse.length > 200 ? '...' : ''),
      intent: 'AI_AGENT_PROCESSED',
      confidence: 1.0
    })

    console.log(`[WhatsApp Bot] ✅ Mensagem processada com sucesso em ${processingTime}ms`)

  } catch (error) {
    console.error('[WhatsApp Bot] ❌ Erro ao processar com novo sistema de IA:', error)
    logBot({ phase: 'ai-error', error: String(error), phone: phoneNumber })
    
    // Fallback para resposta genérica
    const fallbackMessage = `Olá ${customerName}! Estou com algumas dificuldades técnicas no momento. Nossa equipe entrará em contato em breve. 🤖`
    
    try {
      await sendWhatsAppMessage(whatsappConfig.instanceName, phoneNumber, fallbackMessage)
    } catch (sendError) {
      console.error('[WhatsApp Bot] ❌ Erro crítico ao enviar mensagem de fallback:', sendError)
    }
  }
}

async function sendWhatsAppMessage(instanceName: string, phoneNumber: string, message: string) {
  try {
    const EVOLUTION_API_BASE_URL = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080'
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

    if (!EVOLUTION_API_KEY) {
      throw new Error('Evolution API Key não configurada')
    }

    const response = await fetch(`${EVOLUTION_API_BASE_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message,
      }),
    })

    if (!response.ok) {
      throw new Error(`Erro ao enviar mensagem: ${response.status}`)
    }

    const responseData = await response.json()
    console.log(`[WhatsApp Bot] ✅ Mensagem enviada com sucesso para ${phoneNumber}`)
    console.log(`[WhatsApp Bot] Status: ${responseData.status || 'OK'} | ID: ${responseData.key?.id || 'N/A'}`)

  } catch (error) {
    console.error('[WhatsApp Bot] ❌ Erro ao enviar mensagem:', error)
    throw error // Re-throw para que o calling code possa lidar com o erro
  }
}