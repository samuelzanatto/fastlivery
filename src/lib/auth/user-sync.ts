import { prisma } from '@/lib/database/prisma'
import type { User } from '@/lib/auth/auth'

/**
 * Utilitário para sincronizar usuário do Better Auth com o Prisma
 * Garante que o usuário existe no banco antes de operações que precisam de referência
 */
export async function ensureUserInDatabase(sessionUser: User): Promise<boolean> {
  try {
    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    })

    if (existingUser) {
      return true
    }

    // Se não existe, criar o usuário
    await prisma.user.create({
      data: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        emailVerified: sessionUser.emailVerified ?? false,
        image: sessionUser.image || null,
        phone: null,
        isActive: true,
        role: 'customer' // Role padrão
      }
    })

    console.log('[ensureUserInDatabase] Usuário criado no Prisma:', sessionUser.id)
    return true
  } catch (error) {
    console.error('[ensureUserInDatabase] Erro ao sincronizar usuário:', error)
    
    // Se foi erro de duplicata (race condition), verificar se existe agora
    if (error instanceof Error && error.message.includes('unique constraint')) {
      const existingUser = await prisma.user.findUnique({
        where: { id: sessionUser.id }
      })
      return !!existingUser
    }
    
    return false
  }
}

/**
 * Sincronizar dados do usuário entre Better Auth e Prisma
 * Atualiza informações se necessário
 */
export async function syncUserData(sessionUser: User): Promise<void> {
  try {
    // Primeiro verificar se já existe um usuário com este email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: sessionUser.email }
    })

    // Se existe usuário com mesmo email mas ID diferente, usar o existente
    if (existingUserByEmail && existingUserByEmail.id !== sessionUser.id) {
      console.log('[syncUserData] Usuário com email já existe, usando ID existente:', existingUserByEmail.id)
      return
    }

    // Verificar se usuário existe por ID
    const existingUserById = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    })

    if (existingUserById) {
      // Atualizar usuário existente
      // Buscar dados atuais do usuário
      const currentUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          name: true,
          emailVerified: true,
          image: true
        }
      })

      // Atualizar apenas se os dados da sessão forem diferentes dos dados do banco
      // e não atualizar image se já existir no banco
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          name: sessionUser.name !== currentUser?.name ? sessionUser.name : undefined,
          emailVerified: sessionUser.emailVerified !== currentUser?.emailVerified ? (sessionUser.emailVerified ?? false) : undefined,
          // Preservar a imagem do banco se ela existir
          image: currentUser?.image ? currentUser.image : (sessionUser.image || null)
        }
      })
    } else {
      // Criar novo usuário apenas se não existe por email
      if (!existingUserByEmail) {
        await prisma.user.create({
          data: {
            id: sessionUser.id,
            name: sessionUser.name,
            email: sessionUser.email,
            emailVerified: sessionUser.emailVerified ?? false,
            image: sessionUser.image || null,
            phone: null,
            isActive: true,
            role: 'customer'
          }
        })
      }
    }
  } catch (error) {
    console.error('[syncUserData] Erro ao sincronizar dados do usuário:', error)
    
    // Se ainda deu erro de constraint unique, é race condition - ignorar
    if (error instanceof Error && error.message.includes('Unique constraint failed on the fields: (`email`)')) {
      console.log('[syncUserData] Race condition detectada, ignorando erro de email único')
      return
    }
    
    throw error
  }
}