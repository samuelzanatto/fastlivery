'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PWAHeader } from '@/components/layout/pwa-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, MessageCircle, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'


export default function ChatsPage() {
    const router = useRouter()
    const [conversations, setConversations] = useState<any[] | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setIsLoading(true)
            const res = await fetch('/api/v2/chats')
            if (res.ok) {
                const data = await res.json()
                setConversations(data.conversations)
            } else {
                setConversations([])
            }
            setIsLoading(false)
        }
        load()

        // Realtime
        const { supabase } = require('@/lib/supabase')
        const channel = supabase
            .channel('chats_list')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations'
                },
                async (payload: any) => {
                    // Recarregar lista para garantir ordem e dados corretos
                    // Alternativa seria atualizar o estado local, mas para lista ordenada por data
                    // e com dados relacionais (lastMessage, business), o refetch é mais seguro/simples
                    const res = await fetch('/api/v2/chats')
                    if (res.ok) {
                        const data = await res.json()
                        setConversations(data.conversations)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <PWAHeader title="Minhas Conversas" showBackButton={true} noBorder={false} className="lg:hidden bg-white/80 backdrop-blur-md sticky top-0 z-50" />

            <div className="container mx-auto px-4 pt-4 lg:pt-8 max-w-lg">
                <div className="hidden lg:block mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Minhas Conversas</h1>
                    <p className="text-slate-500 text-sm">Gerencie suas interações com os restaurantes</p>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-slate-400 font-medium">Carregando conversas...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {conversations && conversations.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-2"
                            >
                                {conversations.map((conv, index) => (
                                    <motion.div
                                        key={conv.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => router.push(`/chats/${conv.id}`)}
                                        className="group relative bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50 hover:border-slate-200 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                    <AvatarImage src={conv.business.profileImage} />
                                                    <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 font-bold">
                                                        {conv.business.name?.[0]?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {conv.unreadCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow ring-2 ring-white">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h3 className="font-semibold text-slate-900 truncate pr-2 group-hover:text-primary transition-colors">
                                                        {conv.business.name}
                                                    </h3>
                                                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                                        {new Date(conv.updatedAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className={cn(
                                                        "text-sm truncate max-w-[85%]",
                                                        conv.unreadCount > 0
                                                            ? "text-slate-800 font-medium"
                                                            : "text-slate-500"
                                                    )}>
                                                        {conv.lastMessage?.content || 'Inicie uma conversa...'}
                                                    </p>
                                                </div>
                                            </div>

                                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl shadow-sm border border-dashed border-slate-200 m-2"
                            >
                                <div className="bg-slate-50 p-6 rounded-full mb-6 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/50" />
                                    <MessageCircle className="h-10 w-10 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma conversa</h3>
                                <p className="text-sm text-slate-500 max-w-[260px] leading-relaxed">
                                    Suas conversas com restaurantes aparecerão aqui. Faça um pedido para começar!
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
