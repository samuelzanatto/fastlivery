'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, X, MessageSquare, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateConversation } from '@/actions/chat/client-chat' // We can reuse this to find/create the chat
import { sendMessage, markMessagesRead } from '@/actions/chat/admin-chat'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Message {
    id: string
    content: string
    senderType: 'BUSINESS' | 'CUSTOMER'
    createdAt: string | Date
    isRead: boolean
}

interface AdminOrderChatDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    orderId: string
    customerName: string
    customerPhone?: string
    businessId: string
}

export function AdminOrderChatDialog({
    isOpen,
    onOpenChange,
    orderId,
    customerName,
    customerPhone,
    businessId
}: AdminOrderChatDialogProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // 1. Carregar/Criar conversa ao abrir
    useEffect(() => {
        if (isOpen && businessId && customerName) {
            loadConversation()
        }
    }, [isOpen, businessId, customerName, customerPhone])

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
            .channel(`admin_chat:${conversationId}`)
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

                    // Se a mensagem for do cliente, marcar como lida (pois estamos com o chat aberto)
                    if (newMessage.senderType === 'CUSTOMER') {
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
            // Reusing getOrCreateConversation from client-chat because currently it's the standard way 
            // to resolve a conversation by phone/name. 
            // It works for admin too if we just want to retrieve the ID.
            // Ideally should be a shared utility or admin specific if logic differs.
            const res = await getOrCreateConversation(businessId, customerName, customerPhone || 'unknown')

            if (res.success && res.data) {
                setConversationId(res.data.id)
                const history = res.data.messages.map((m: any) => ({
                    ...m,
                    createdAt: new Date(m.createdAt)
                }))
                setMessages(history)

                // Marcar como lidas ao abrir (mensagens do cliente)
                if (res.data.unread_count_business > 0) {
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
            const content = newMessage.trim()
            const sentMsg = await sendMessage(conversationId, content)

            if (sentMsg.success && sentMsg.data) {
                // Adicionar otimisticamente a mensagem ao estado para atualização imediata
                const newMsg = {
                    ...sentMsg.data,
                    createdAt: new Date(sentMsg.data.createdAt)
                } as unknown as Message

                setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])

                setNewMessage('')

                // Garantir scroll para o fim
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                }
            } else {
                console.error('Erro ao enviar mensagem', sentMsg.error)
            }
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b bg-slate-50">
                    <DialogTitle className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-blue-100 border-blue-200">
                            <AvatarFallback className="text-blue-700">{customerName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">{customerName}</span>
                            <span className="text-xs text-slate-500 font-normal">Pedido #{orderId}</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p className="text-sm">Carregando conversa...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                            <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm">Inicie a conversa com {customerName}.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.senderType === 'BUSINESS' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.senderType === 'BUSINESS'
                                        ? 'bg-slate-900 text-white rounded-tr-none'
                                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                                        }`}
                                >
                                    <p>{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${msg.senderType === 'BUSINESS' ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-3 border-t bg-slate-50 flex items-center gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 bg-white"
                        disabled={isLoading || isSending}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isLoading || isSending}
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
