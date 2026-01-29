'use server'

import { getAuthenticatedUser } from '@/lib/actions/auth-helpers'
import { prisma } from '@/lib/database/prisma'

export interface CustomerInfo {
    id: string
    name: string
    phone: string | null
}

export async function getCurrentCustomerInfo(): Promise<{ success: boolean; data?: CustomerInfo }> {
    try {
        const user = await getAuthenticatedUser()

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                name: true,
                phone: true
            }
        })

        if (!dbUser) {
            return { success: false }
        }

        return {
            success: true,
            data: {
                id: dbUser.id,
                name: dbUser.name,
                phone: dbUser.phone
            }
        }
    } catch (error) {
        return { success: false }
    }
}
