'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, MessageSquare, Loader2 } from 'lucide-react' // MessageSquare and Loader2 added
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input' // Input component
import { supabase } from '@/lib/supabase'
import { getOrCreateConversation, sendMessage, markMessagesRead } from '@/actions/chat/client-chat'
// Remove redundant imports if necessary, ensuring all used components are imported.
// Assuming Avatar/AvatarFallback/AvatarImage are in ui/avatar.
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'


interface Message {
    id: string
    content: string
    senderType: 'BUSINESS' | 'CUSTOMER' // Updated to match enum
    createdAt: string | Date // Handle both string and Date
    isRead: boolean
}

interface ChatSheetProps {
    isOpen: boolean
    onClose: () => void
    businessId: string
    customerPhone: string
    customerName: string
    logo?: string
    businessName?: string
}

export function ChatSheet({
    isOpen,
    onClose,
    businessId,
    customerPhone,
    customerName,
    logo,
    businessName = "Estabelecimento"
}: ChatSheetProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // 1. Carregar/Criar conversa ao abrir
    useEffect(() => {
        console.log('[ChatSheet] useEffect trigger:', { isOpen, businessId, customerPhone })
        if (isOpen && businessId && customerPhone) {
            loadConversation()
        }
    }, [isOpen, businessId, customerPhone])

    // 2. Scroll para o final quando mensagens mudarem
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // 3. Realtime Subscription
    useEffect(() => {
        if (!conversationId || !isOpen) return

        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversationId=eq.${conversationId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message
                    setMessages(prev => {
                        if (prev.some(msg => msg.id === newMessage.id)) {
                            return prev
                        }
                        return [...prev, newMessage]
                    })

                    if (newMessage.senderType === 'BUSINESS') {
                        markMessagesRead(conversationId)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId, isOpen])

    const loadConversation = async () => {
        setIsLoading(true)
        try {
            const res = await getOrCreateConversation(businessId, customerName, customerPhone)
            if (res.success && res.data) {
                setConversationId(res.data.id)
                // Ensure TS happy with dates
                const history = res.data.messages.map((m: any) => ({
                    ...m,
                    createdAt: new Date(m.createdAt)
                }))
                setMessages(history)

                // Marcar como lidas
                if (res.data.unread_count_customer > 0) {
                    markMessagesRead(res.data.id)
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSend = async () => {
        if (!newMessage.trim() || !conversationId) return

        setIsSending(true)
        try {
            const sentMsg = await sendMessage(conversationId, newMessage)
            if (sentMsg.success && sentMsg.data) {
                setMessages(prev => [...prev, sentMsg.data as unknown as Message])
                setNewMessage('')
            }
        } finally {
            setIsSending(false)
        }
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

                    {/* Dialog */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 100 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 100 }}
                        className="fixed bottom-24 right-4 w-[90vw] md:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-slate-50 border-b p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={logo} />
                                    <AvatarFallback>{businessName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-sm">{businessName}</h3>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        Online
                                    </p>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
                        >
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                    <p className="text-sm">Carregando conversa...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                                    <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                                    <p className="text-sm">Envie uma mensagem para falar com o estabelecimento.</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.senderType === 'CUSTOMER'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border text-slate-800 rounded-tl-none'
                                                }`}
                                        >
                                            <p>{msg.content}</p>
                                            <p className={`text-[10px] mt-1 text-right ${msg.senderType === 'CUSTOMER' ? 'text-blue-200' : 'text-slate-400'
                                                }`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Input */}
                        <div className="p-3 border-t bg-white flex items-center gap-2">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite sua mensagem..."
                                className="flex-1"
                                disabled={isLoading || isSending}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!newMessage.trim() || isLoading || isSending}
                                size="icon"
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
