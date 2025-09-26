import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { emailOTP, admin, organization } from "better-auth/plugins"
import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"
import { stripe as stripePlugin } from "@better-auth/stripe"
import { prisma as prismaShared } from "../database/prisma"
import SubscriptionService from "../billing/subscription-service"
import nodemailer from "nodemailer"
import { 
  ac,
  // Roles de negócio genéricas
  businessOwner,
  businessAdmin,
  businessManager,
  businessStaff,
  // Roles específicas para fornecedores B2B
  supplierOwner,
  supplierManager,
  supplierStaff,
  // Roles de plataforma
  platformAdmin,
  platformSupport,
  // Cliente final
  customer,
  // Constantes
  PLATFORM_ROLES
} from "./auth-permissions"

// Use prisma compartilhado para evitar múltiplas conexões
const prisma = prismaShared ?? new PrismaClient()

// Stripe client
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
})

// Configuração SMTP para envio de OTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  trustedOrigins: [
    // URLs de desenvolvimento
    ...(process.env.NODE_ENV === 'development' ? [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://localhost:4000",
      "http://localhost:4040",
      "http://192.168.1.106:3000",
      "https://*.ngrok-free.app", 
      "https://*.ngrok.app"
    ] : []),
    // URL principal da aplicação
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    // URLs do ngrok dinamicamente
    ...(process.env.NGROK_URL ? [process.env.NGROK_URL] : [])
  ],
  emailAndPassword: {
    enabled: true,
    // Agora obrigatório: dependerá do fluxo OTP (override ativado no plugin emailOTP)
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // Atualizar a cada 1 dia
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7 // Cache por 7 dias
    }
  },
  user: {
    additionalFields: {
      businessId: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        required: false,
      },
      customerMetadata: {
        type: "string", // JSON com dados específicos do cliente
        required: false,
      },
    },
    // SECURITY: Hooks para garantir controle de acesso
    // onCreate hook será configurado via callbacks externos
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    nextCookies(),
    emailOTP({
      // Substitui a verificação padrão por link pelo fluxo de OTP
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        const transporter = createTransporter()
        
        const subject = type === "email-verification" 
          ? "Código de Verificação - FastLivery" 
          : "Código de Acesso - FastLivery"
          
        const html = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">FastLivery</h1>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0;">Seu código de verificação</h2>
              <p style="color: #64748b; margin: 0 0 20px 0;">
                Use o código abaixo para ${type === "email-verification" ? "verificar seu email" : "acessar sua conta"}:
              </p>
              
              <div style="text-align: center; margin: 20px 0;">
                <span style="
                  background: #2563eb;
                  color: white;
                  padding: 12px 24px;
                  border-radius: 8px;
                  font-size: 24px;
                  font-weight: bold;
                  letter-spacing: 4px;
                  display: inline-block;
                ">${otp}</span>
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
                Este código expira em 10 minutos. Se você não solicitou este código, ignore este email.
              </p>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              © 2024 FastLivery. Todos os direitos reservados.
            </p>
          </div>
        `

        try {
          await transporter.sendMail({
            from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM}>`,
            to: email,
            subject,
            html,
          })
          
          console.log(`OTP enviado para ${email}: ${otp}`)
        } catch (error) {
          console.error("Erro ao enviar OTP:", error)
          throw error
        }
      },
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutos
    }),
    
    // Plugin Admin - Controle de Acesso e Roles
    admin({
      adminRoles: [PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.SUPPORT],
      defaultRole: "customer", // Será sobrescrito no processo de signup
      impersonationSessionDuration: 60 * 60 * 24, // 24 horas
      ac,
      roles: {
        // Roles de negócio genéricas
        businessOwner,
        businessAdmin,
        businessManager,
        businessStaff,
        
        // Roles específicas para fornecedores B2B
        supplierOwner,
        supplierManager,
        supplierStaff,
        
        // Roles de plataforma
        platformAdmin,
        platformSupport,
        
        // Cliente final
        customer,
      }
    }),
    
    // Plugin Organization - Multi-tenancy para Empresas
    organization({
      allowUserToCreateOrganization: false, // Controlado via nossa lógica de negócio
      organizationLimit: 5, // Limite máximo por usuário (ajustar conforme plano)
      schema: {
        organization: {
          additionalFields: {
            // Campos específicos da empresa
            cuisine: {
              type: "string",
              required: false,
            },
            deliveryFee: {
              type: "number",
              required: false,
            },
            minimumOrder: {
              type: "number", 
              required: false,
            },
            deliveryTime: {
              type: "number",
              required: false,
            },
            acceptsDelivery: {
              type: "boolean",
              required: false,
            },
            acceptsPickup: {
              type: "boolean",
              required: false,
            },
            acceptsDineIn: {
              type: "boolean",
              required: false,
            },
            isOpen: {
              type: "boolean",
              required: false,
            },
            isActive: {
              type: "boolean",
              required: false,
            },
            phone: {
              type: "string",
              required: false,
            },
            address: {
              type: "string",
              required: false,
            },
            description: {
              type: "string",
              required: false,
            },
            subscriptionPlan: {
              type: "string",
              required: false,
            },
            // Configurações de pagamento
            mercadoPagoAccessToken: {
              type: "string",
              required: false,
            },
            mercadoPagoPublicKey: {
              type: "string",
              required: false,
            },
            mercadoPagoConfigured: {
              type: "boolean",
              required: false,
            }
          }
        },
        member: {
          additionalFields: {
            // Dados específicos de funcionários
            salary: {
              type: "number",
              required: false,
            },
            startDate: {
              type: "date",
              required: false,
            },
            endDate: {
              type: "date",
              required: false,
            },
            isActive: {
              type: "boolean",
              required: false,
            },
            notes: {
              type: "string",
              required: false,
            }
          }
        },
        invitation: {
          additionalFields: {
            // Dados adicionais para convites
            inviteMessage: {
              type: "string",
              required: false,
            },
            departmentId: {
              type: "string",
              required: false,
            }
          }
        }
      }
    }),

    stripePlugin({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: false,
      // Hooks de assinatura - integram com o seu modelo Subscription/Business
      subscription: {
        enabled: true,
        plans: [
          { name: "starter", priceId: process.env.STRIPE_STARTER_PRICE_ID! },
          { name: "pro", priceId: process.env.STRIPE_PRO_PRICE_ID! },
          { name: "enterprise", priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID! },
        ],
          
        onSubscriptionComplete: async ({ subscription, stripeSubscription, plan }) => {
        // referenceId pode ser o userId por padrão; aqui vamos ativar a empresa do dono, se existir
        try {
          const businessId = subscription.referenceId
          let business = businessId
            ? await prisma.business.findUnique({ where: { id: businessId } })
            : null

          // Se não houver referenceId/business, tentar localizar pelo customer -> user -> business
          if (!business) {
            const stripeCustomerId = stripeSubscription ? String(stripeSubscription.customer || "") : undefined
            if (stripeCustomerId) {
              const user = await prisma.user.findFirst({ where: { stripeCustomerId } })
              if (user) {
                business = await prisma.business.findFirst({ where: { ownerId: user.id } })
                // Se ainda não houver, criar um negócio mínimo
                if (!business) {
                  const defaultName = user.name ? `Negócio de ${user.name}` : 'Minha Empresa'
                  business = await prisma.business.create({
                    data: {
                      name: defaultName,
                      email: `${user.email}-business`,
                      password: 'temporary',
                      phone: '',
                      address: 'A definir',
                      description: 'Negócio criado automaticamente após assinatura',
                      ownerId: user.id,
                      isActive: false,
                      isOpen: false,
                      acceptsDelivery: true,
                      acceptsPickup: true,
                      acceptsDineIn: false,
                      minimumOrder: 0,
                      deliveryFee: 0,
                      deliveryTime: 30,
                    }
                  })
                }
              }
            }
          }

          if (!business) return
            // Atualiza/Cria assinatura na base local
            const priceId = (stripeSubscription && stripeSubscription.items.data[0]?.price?.id) || plan?.priceId || ""
            const exists = await prisma.subscription.findUnique({ where: { businessId: business.id } })
            if (!exists) {
              await SubscriptionService.createSubscription(
                business.id,
                plan?.name || "starter",
                priceId,
                stripeSubscription ? String(stripeSubscription.customer || "") : undefined,
                stripeSubscription ? stripeSubscription.id : undefined
              )
            } else {
              await prisma.subscription.update({
                where: { businessId: business.id },
                data: {
                  status: "ACTIVE",
                  stripeCustomerId: stripeSubscription ? String(stripeSubscription.customer || "") : undefined,
                  stripeSubscriptionId: stripeSubscription ? stripeSubscription.id : undefined,
                }
              })
            }
            // Ativa negócio e usuário dono
            await prisma.business.update({
              where: { id: business.id },
              data: { isActive: true }
            })
            if (business.ownerId) {
              await prisma.user.update({
                where: { id: business.ownerId },
                data: { isActive: true }
              })
            }
          } catch (e) {
            console.error("onSubscriptionComplete error:", e)
          }
        },

        onSubscriptionUpdate: async ({ subscription }) => {
          try {
            const businessId = subscription.referenceId
            
            if (!businessId) return
            const business = await prisma.business.findUnique({ where: { id: businessId } })
            
            if (!business) return
            await prisma.subscription.update({
              where: { businessId: business.id },
              data: {
                // Atualize status conforme sua lógica; aqui mantemos status atual
              }
            })
          } catch (e) {
            console.error("onSubscriptionUpdate error:", e)
          }
        },

        onSubscriptionCancel: async ({ subscription }) => {
          try {
            const businessId = subscription.referenceId
            if (!businessId) return
            const business = await prisma.business.findUnique({ where: { id: businessId } })
            if (!business) return
            await prisma.subscription.update({
              where: { businessId: business.id },
              data: {
                status: "CANCELLED",
                canceledAt: new Date(),
              }
            })
            await prisma.business.update({
              where: { id: business.id },
              data: { isActive: false }
            })
          } catch (e) {
            console.error("onSubscriptionCancel error:", e)
          }
        },
      },
      // Callback geral para eventos que você queira observar
      
      onEvent: async (event) => {
        // Checkout público: não criar nada aqui; delegar para /api/checkout/public/finish-signup
        if (event.type === "checkout.session.completed") {
          try {
            const raw = event as unknown as { payload?: { data?: { object?: unknown } }, data?: { object?: unknown } }
            const session = (raw?.payload?.data?.object || raw?.data?.object) as Stripe.Checkout.Session | undefined
            
            if (!session) return
            // Apenas log: quem finalizará será o endpoint finish-signup
            console.info('[Stripe] checkout.session.completed recebido', { id: session.id })
            } catch (e) {
            console.error('[Stripe] checkout.session.completed handler error:', e)
          }
        }
      }
    })
  ]
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
