'use server'

import { prisma } from '@/lib/database/prisma'
import { getAuthenticatedUser } from '@/lib/actions/auth-helpers'

export interface MyOrder {
    id: string
    orderNumber: string
    status: string
    total: number
    deliveryFee: number
    discount: number
    createdAt: Date
    deliveryAddress: string | null
    paymentMethod: string | null
    business: {
        name: string
        slug: string
        image: string | null
    }
    items: {
        quantity: number
        price: number
        notes: string | null
        product: {
            name: string
            image: string | null
        }
    }[]
    _count: {
        items: number
    }
}

export async function getMyOrders() {
    try {
        const user = await getAuthenticatedUser()

        if (!user) {
            return { success: false, error: 'Usuário não autenticado' }
        }

        const orders = await prisma.order.findMany({
            where: {
                userId: user.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                total: true,
                deliveryFee: true,
                discount: true,
                createdAt: true,
                deliveryAddress: true,
                paymentMethod: true,
                business: {
                    select: {
                        name: true,
                        slug: true,
                        avatar: true
                    }
                },
                items: {
                    select: {
                        quantity: true,
                        price: true,
                        notes: true,
                        product: {
                            select: {
                                name: true,
                                image: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        items: true
                    }
                }
            }
        })

        const mappedOrders: MyOrder[] = orders.map(order => ({
            ...order,
            business: {
                name: order.business.name,
                slug: order.business.slug || '',
                image: order.business.avatar
            },
            items: order.items.map(item => ({
                ...item,
                price: Number(item.price), // Ensure price is number if it comes as Decimal/Float
            }))
        }))

        return { success: true, data: mappedOrders }
    } catch (error) {
        console.error('Error fetching my orders:', error)
        return { success: false, error: 'Erro ao buscar pedidos' }
    }
}
