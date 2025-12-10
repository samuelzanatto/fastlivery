import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { emailOTP, admin, organization } from "better-auth/plugins"
import { prisma } from "../database/prisma"
import nodemailer from "nodemailer"
import bcrypt from "bcryptjs"
import { 
  ac,
  // Roles de negócio genéricas
  businessOwner,
  businessAdmin,
  businessManager,
  businessStaff,
  // Roles de plataforma
  platformAdmin,
  platformSupport,
  // Cliente final
  customer,
  // Constantes
  PLATFORM_ROLES
} from "./auth-permissions"

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
    ...(process.env.NGROK_URL ? [process.env.NGROK_URL] : []),
    // URLs de produção (Vercel e domínio customizado)
    "https://www.fastlivery.com.br",
    "https://fastlivery.com.br",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [])
  ],
  // Database hooks para controle de criação de usuários
  databaseHooks: {
    user: {
      create: {
        // Antes de criar usuário, definir role como customer se não especificado
        before: async (user) => {
          console.log('[AUTH] Criando novo usuário:', user.email)
          // Se o usuário não tem role definida, é um cliente da página pública
          if (!user.role) {
            console.log('[AUTH] Definindo role como customer para:', user.email)
            return {
              data: {
                ...user,
                role: 'customer',
                isActive: true, // Clientes são ativados automaticamente
                emailVerified: true, // Clientes não precisam verificar email para cadastrar
              }
            }
          }
          return { data: user }
        },
        // Após criar, logar para debug
        after: async (user) => {
          console.log('[AUTH] Usuário criado com sucesso:', { 
            id: user.id, 
            email: user.email, 
            role: user.role 
          })
        }
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    // Agora obrigatório: dependerá do fluxo OTP (override ativado no plugin emailOTP)
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: async (password) => {
        return await bcrypt.hash(password, 10)
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash)
      }
    }
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
      // Nota: Clientes não precisam verificar email no cadastro (emailVerified já é true)
      overrideDefaultEmailVerification: false,
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
        // Roles de negócio
        businessOwner,
        businessAdmin,
        businessManager,
        businessStaff,
        
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
  ]
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
