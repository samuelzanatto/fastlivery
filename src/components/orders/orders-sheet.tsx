'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Clock, ChevronRight, Calculator, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getMyOrders, MyOrder } from '@/actions/customer/my-orders'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface OrdersSheetProps {
    isOpen: boolean
    onClose: () => void
}

export function OrdersSheet({ isOpen, onClose }: OrdersSheetProps) {
    const [orders, setOrders] = useState<MyOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            loadOrders()
        }
    }, [isOpen])

    const loadOrders = async () => {
        setIsLoading(true)
        try {
            const result = await getMyOrders()
            if (result.success && result.data) {
                setOrders(result.data)
            }
        } catch (error) {
            console.error('Failed to load orders:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'PREPARING': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
            case 'READY': return 'bg-green-100 text-green-800 border-green-200'
            case 'DELIVERED': return 'bg-green-50 text-green-700 border-green-200'
            case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200'
            default: return 'bg-slate-100 text-slate-800 border-slate-200'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Pendente'
            case 'CONFIRMED': return 'Confirmado'
            case 'PREPARING': return 'Preparando'
            case 'READY': return 'Pronto'
            case 'DELIVERED': return 'Entregue'
            case 'CANCELLED': return 'Cancelado'
            default: return status
        }
    }

    const handleOrderClick = (order: MyOrder) => {
        onClose()
        router.push(`/${order.business.slug}/pedido/${order.id}`)
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-orange-500" />
                                <h2 className="font-semibold text-lg">Meus Pedidos</h2>
                            </div>
                            <Button size="icon" variant="ghost" onClick={onClose} className="rounded-full hover:bg-slate-100">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
                            {isLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="bg-white rounded-xl h-40 animate-pulse shadow-sm" />
                                    ))}
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 text-center p-8">
                                    <div className="bg-slate-100 p-6 rounded-full mb-4">
                                        <ShoppingBag className="h-12 w-12 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum pedido ainda</h3>
                                    <p className="max-w-xs mx-auto">Seus pedidos recentes aparecerão aqui para você acompanhar.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <div
                                            key={order.id}
                                            onClick={() => handleOrderClick(order)}
                                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    {/* Business Info */}
                                                    <div className="bg-orange-100 w-10 h-10 rounded-lg flex items-center justify-center text-orange-600 font-bold text-lg">
                                                        {order.business.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-slate-900">{order.business.name}</h3>
                                                        <div className="flex items-center text-xs text-slate-500 gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className={cn("text-xs font-medium px-2 py-0.5 pointer-events-none", getStatusColor(order.status))} variant="outline">
                                                    {getStatusLabel(order.status)}
                                                </Badge>
                                            </div>

                                            <div className="space-y-1 mb-3">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                                                        <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-1.5 rounded">{item.quantity}x</span>
                                                        <span className="truncate">{item.product.name}</span>
                                                    </div>
                                                ))}
                                                {order._count.items > 3 && (
                                                    <p className="text-xs text-slate-400 pl-7">+ {order._count.items - 3} itens</p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-3">
                                                <div className="flex items-center text-sm font-semibold text-slate-900">
                                                    Total: R$ {order.total.toFixed(2)}
                                                </div>
                                                <div className="flex items-center text-xs font-medium text-orange-600 group-hover:translate-x-1 transition-transform">
                                                    Ver detalhes <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
