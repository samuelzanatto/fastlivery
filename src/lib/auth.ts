import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { emailOTP, admin, organization } from "better-auth/plugins"
import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"
import { stripe as stripePlugin } from "@better-auth/stripe"
import { prisma as prismaShared } from "./prisma"
import SubscriptionService from "./subscription-service"
import nodemailer from "nodemailer"
import { 
  ac, 
  restaurantOwner, 
  restaurantManager, 
  restaurantChef,
  restaurantWaiter,
  restaurantCashier,
  restaurantEmployee,
  platformAdmin,
  platformSupport,
  customer,
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
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:4000",
    "http://localhost:4040",
    // IPs locais da rede
    "http://192.168.1.106:3000",
    // Adicionar URL específica do ngrok atual
    "https://d2f9b8f83d2e.ngrok-free.app",
    // Adicionar URLs do ngrok dinamicamente
    ...(process.env.NGROK_URL ? [process.env.NGROK_URL] : []),
    // Permitir qualquer subdomínio ngrok em desenvolvimento
    ...(process.env.NODE_ENV === 'development' ? ["https://*.ngrok-free.app", "https://*.ngrok.app"] : [])
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
      redirectURI: process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
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
      restaurantId: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        required: false,
      },
      userType: {
        type: "string", 
        required: false,
      }, // "CUSTOMER" ou "RESTAURANT_ADMIN"
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
          ? "Código de Verificação - ZapLivery" 
          : "Código de Acesso - ZapLivery"
          
        const html = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">ZapLivery</h1>
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
              © 2024 ZapLivery. Todos os direitos reservados.
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
      defaultRole: "customer",
      impersonationSessionDuration: 60 * 60 * 24, // 24 horas
      ac,
      roles: {
        // Roles de Restaurante
        restaurantOwner,
        restaurantManager,
        restaurantChef,
        restaurantWaiter,
        restaurantCashier,
        restaurantEmployee,
        // Roles de Plataforma
        platformAdmin,
        platformSupport,
        // Role de Cliente
        customer
      }
    }),
    
    // Plugin Organization - Multi-tenancy para Restaurantes
    organization({
      allowUserToCreateOrganization: false, // Controlado via nossa lógica de negócio
      organizationLimit: 5, // Limite máximo por usuário (ajustar conforme plano)
      schema: {
        organization: {
          additionalFields: {
            // Campos específicos do restaurante
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
      // Hooks de assinatura - integram com o seu modelo Subscription/Restaurant
      subscription: {
        enabled: true,
        plans: [
          { name: "starter", priceId: process.env.STRIPE_STARTER_PRICE_ID! },
          { name: "pro", priceId: process.env.STRIPE_PRO_PRICE_ID! },
          { name: "enterprise", priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID! },
        ],
    onSubscriptionComplete: async ({ subscription, stripeSubscription, plan }) => {
          // referenceId pode ser o userId por padrão; aqui vamos ativar o restaurante do dono, se existir
          try {
      const restaurantId = subscription.referenceId
      let restaurant = restaurantId
        ? await prisma.restaurant.findUnique({ where: { id: restaurantId } })
        : null

      // Se não houver referenceId/restaurant, tentar localizar pelo customer -> user -> restaurante
      if (!restaurant) {
        const stripeCustomerId = stripeSubscription ? String(stripeSubscription.customer || "") : undefined
        if (stripeCustomerId) {
          const user = await prisma.user.findFirst({ where: { stripeCustomerId } })
          if (user) {
            restaurant = await prisma.restaurant.findFirst({ where: { ownerId: user.id } })
            // Se ainda não houver, criar um restaurante mínimo
            if (!restaurant) {
              const defaultName = user.name ? `Restaurante de ${user.name}` : 'Meu Restaurante'
              restaurant = await prisma.restaurant.create({
                data: {
                  name: defaultName,
                  email: `${user.email}-restaurant`,
                  password: 'temporary',
                  phone: '',
                  address: 'A definir',
                  description: 'Restaurante criado automaticamente após assinatura',
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
      if (!restaurant) return
            // Atualiza/Cria assinatura na base local
            const priceId = (stripeSubscription && stripeSubscription.items.data[0]?.price?.id) || plan?.priceId || ""
            const exists = await prisma.subscription.findUnique({ where: { restaurantId: restaurant.id } })
            if (!exists) {
              await SubscriptionService.createSubscription(
                restaurant.id,
                plan?.name || "starter",
                priceId,
                stripeSubscription ? String(stripeSubscription.customer || "") : undefined,
                stripeSubscription ? stripeSubscription.id : undefined
              )
            } else {
              await prisma.subscription.update({
                where: { restaurantId: restaurant.id },
                data: {
                  status: "ACTIVE",
                  stripeCustomerId: stripeSubscription ? String(stripeSubscription.customer || "") : undefined,
                  stripeSubscriptionId: stripeSubscription ? stripeSubscription.id : undefined,
                }
              })
            }
            // Ativa restaurante e usuário dono
            await prisma.restaurant.update({
              where: { id: restaurant.id },
              data: { isActive: true }
            })
            if (restaurant.ownerId) {
              await prisma.user.update({
                where: { id: restaurant.ownerId },
                data: { isActive: true }
              })
            }
          } catch (e) {
            console.error("onSubscriptionComplete error:", e)
          }
        },
    onSubscriptionUpdate: async ({ subscription }) => {
          try {
      const restaurantId = subscription.referenceId
      if (!restaurantId) return
      const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
            if (!restaurant) return
            await prisma.subscription.update({
              where: { restaurantId: restaurant.id },
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
      const restaurantId = subscription.referenceId
      if (!restaurantId) return
      const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
            if (!restaurant) return
            await prisma.subscription.update({
              where: { restaurantId: restaurant.id },
              data: {
                status: "CANCELLED",
                canceledAt: new Date(),
              }
            })
            await prisma.restaurant.update({
              where: { id: restaurant.id },
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

// SECURITY: Função para garantir que usuários OAuth sejam sempre CUSTOMER
export async function ensureOAuthUserSecurity(userId: string, provider?: string) {
  if (provider === 'google') {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user && user.userType !== 'CUSTOMER') {
        console.warn('[SECURITY] Fixing OAuth user with wrong userType:', { 
          userId, 
          email: user.email, 
          currentType: user.userType 
        })
        await prisma.user.update({
          where: { id: userId },
          data: { 
            userType: 'CUSTOMER',
            isActive: true
          }
        })
      }
    } catch (error) {
      console.error('[SECURITY] Failed to ensure OAuth user security:', error)
    }
  }
}

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
