'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PWAHeader } from '@/components/layout/pwa-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Send, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function ChatDetailPage() {
    const router = useRouter()
    const params = useParams() as { id: string }
    const id = params?.id
    const [conversation, setConversation] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function load() {
            setIsLoading(true)
            const res = await fetch(`/api/v2/chats/${id}`)
            if (res.ok) {
                const data = await res.json()
                setConversation(data.conversation)
            }
            setIsLoading(false)
        }
        if (id) load()
    }, [id])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [conversation?.messages, isLoading])

    // Realtime subscription
    useEffect(() => {
        if (!conversation?.id) return

        const { supabase } = require('@/lib/supabase')
        const channel = supabase
            .channel(`chat_detail:${conversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversationId=eq.${conversation.id}`
                },
                (payload: any) => {
                    const newMessage = payload.new
                    setConversation((prev: any) => {
                        if (!prev) return prev
                        // Evitar duplicatas (se vier do próprio envio)
                        if (prev.messages.some((m: any) => m.id === newMessage.id)) {
                            return prev
                        }
                        return {
                            ...prev,
                            messages: [...prev.messages, newMessage]
                        }
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversation?.id])

    const handleSend = async () => {
        if (!newMessage.trim() || !conversation) return
        setIsSending(true)
        const res = await fetch(`/api/v2/chats/${conversation.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newMessage.trim() })
        })
        if (res.ok) {
            const data = await res.json()
            setConversation((prev: any) => prev ? ({ ...prev, messages: [...prev.messages, data.message] }) : prev)
            setNewMessage('')
        }
        setIsSending(false)
    }

    if (!id) return null

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            {/* Header: Sticky & Blurry */}
            <div className="shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-lg">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="h-8 w-8 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>

                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-white shadow-sm ring-1 ring-slate-100">
                                <AvatarImage src={conversation?.business?.profileImage} />
                                <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                                    {conversation?.business?.name?.[0] || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="font-semibold text-slate-900 leading-tight">
                                    {conversation?.business?.name || 'Carregando...'}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    {conversation?.business?.phone || 'Online'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50" ref={scrollRef}>
                <div className="container mx-auto px-4 py-6 max-w-lg min-h-full flex flex-col justify-end">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence initial={false}>
                                {conversation?.messages?.length ? conversation.messages.map((m: any, index: number) => {
                                    const isCustomer = m.senderType === 'CUSTOMER'
                                    return (
                                        <motion.div
                                            key={m.id || index}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className={cn(
                                                "flex w-full",
                                                isCustomer ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative group",
                                                isCustomer
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"
                                            )}>
                                                <p className="leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                                                <div className={cn(
                                                    "text-[10px] mt-1 text-right font-medium opacity-70",
                                                    isCustomer ? "text-primary-foreground/90" : "text-slate-400"
                                                )}>
                                                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                }) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                            <MessageCircleIcon className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium">Nenhuma mensagem ainda.</p>
                                        <p className="text-slate-400 text-xs mt-1">Envie um "Olá" para começar!</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="shrink-0 bg-white border-t border-slate-100 p-3 lg:p-4 z-50 safe-area-bottom">
                <div className="container mx-auto max-w-lg flex items-end gap-2">
                    <div className="relative flex-1">
                        <Input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Digite sua mensagem..."
                            className="pr-4 py-6 rounded-full bg-slate-50 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary resize-none"
                            disabled={isLoading}
                        />
                    </div>
                    <Button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSending}
                        size="icon"
                        className={cn(
                            "h-12 w-12 rounded-full shrink-0 shadow-sm transition-all duration-200",
                            newMessage.trim()
                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                        )}
                    >
                        {isSending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className="h-5 w-5 ml-0.5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}

function MessageCircleIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    )
}
