'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Search, Clock, Send, Loader2, ArrowLeft } from 'lucide-react'
import { getBusinessConversations, sendMessage, markMessagesRead } from '@/actions/chat/admin-chat'
import { supabase } from '@/lib/supabase'
import { useBusinessId } from '@/stores/business-store'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminChatsPage() {
    // kept unchanged from previous implementation; moved to /admin/chats
    const businessId = useBusinessId()
    const [conversations, setConversations] = useState<any[]>([])
    const [selectedChat, setSelectedChat] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)

    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function load() {
            if (!businessId) return
            setIsLoading(true)
            const res = await getBusinessConversations(businessId)
            if (res.success && res.data) {
                setConversations(res.data)
            }
            setIsLoading(false)
        }
        load()
    }, [businessId])

    useEffect(() => {
        if (!businessId) return

        const channel = supabase
            .channel(`admin_chats_${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                    filter: `businessId=eq.${businessId}`
                },
                async (payload) => {
                    const res = await getBusinessConversations(businessId)
                    if (res.success && res.data) {
                        setConversations(res.data)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [businessId])

    useEffect(() => {
        if (!selectedChat) return

        const channel = supabase
            .channel(`chat_messages_${selectedChat.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversationId=eq.${selectedChat.id}`
                },
                (payload) => {
                    const newMsg = payload.new
                    setSelectedChat((prev: any) => prev ? ({ ...prev, messages: [...prev.messages, newMsg] }) : null)
                    if (newMsg.senderType === 'CUSTOMER') {
                        markMessagesRead(selectedChat.id)
                    }
                }
            )
            .subscribe()

        if (scrollRef.current) setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, 100)

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedChat?.id])

    useEffect(() => {
        if (scrollRef.current && selectedChat) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [selectedChat?.messages])

    const handleSelectChat = async (chat: any) => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversationId', chat.id)
            .order('createdAt', { ascending: true })

        if (data) {
            setSelectedChat({ ...chat, messages: data })
            await markMessagesRead(chat.id)
            setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count_business: 0 } : c))
        }
        setIsLoading(false)
    }

    const handleSendMessage = async () => {
        if (!selectedChat || !newMessage.trim()) return
        setIsSending(true)
        const res = await sendMessage(selectedChat.id, newMessage)
        if (res.success && res.data) {
            setNewMessage('')
            const tempMsg = {
                id: res.data.id,
                content: res.data.content,
                senderType: 'BUSINESS',
                createdAt: res.data.createdAt as unknown as string,
                isRead: false
            }
            setSelectedChat((prev: any) => prev ? ({ ...prev, messages: [...prev.messages, tempMsg] }) : null)
        }
        setIsSending(false)
    }

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Atendimento</h1>
                    <p className="text-muted-foreground text-sm md:text-base">Gerencie as conversas com seus clientes em tempo real.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-0">
                <Card className={`md:col-span-1 flex flex-col h-full overflow-hidden ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                    <CardHeader className="p-3 border-b space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9 h-9" placeholder="Buscar conversa..." />
                        </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        {isLoading && conversations.length === 0 ? (
                            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma conversa iniciada.</div>
                        ) : (
                            <div className="flex flex-col p-2 gap-1">
                                {conversations.map(chat => (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat)}
                                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${selectedChat?.id === chat.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{chat.customer_name?.[0] || chat.customer_phone?.[0] || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <span className="font-semibold text-sm truncate">{chat.customer_name || chat.customer_phone}</span>
                                                {chat.last_message_at && (
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                        {format(new Date(chat.last_message_at), "HH:mm", { locale: ptBR })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate font-medium">
                                                {chat.unread_count_business > 0 && <span className="font-bold text-slate-900 mr-1">({chat.unread_count_business})</span>}
                                                {chat.last_message}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </Card>

                <Card className={`md:col-span-2 flex flex-col h-full overflow-hidden ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
                    {selectedChat ? (
                        <>
                            <div className="p-3 border-b flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedChat(null)}>
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>{selectedChat.customer_name?.[0] || 'C'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold text-sm">{selectedChat.customer_name || selectedChat.customer_phone}</h3>
                                        <p className="text-xs text-muted-foreground">{selectedChat.customer_phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30" ref={scrollRef}>
                                {selectedChat.messages.map((msg: any) => (
                                    <div key={msg.id} className={`flex ${msg.senderType === 'BUSINESS' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.senderType === 'BUSINESS'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border text-slate-800 rounded-tl-none'
                                            }`}>
                                            <p>{msg.content}</p>
                                            <p className={`text-[10px] mt-1 text-right ${msg.senderType === 'BUSINESS' ? 'text-blue-200' : 'text-slate-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 border-t bg-white flex gap-2">
                                <Input
                                    placeholder="Digite sua resposta..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    disabled={isSending}
                                />
                                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} size="icon">
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                            <p>Selecione uma conversa para iniciar o atendimento</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
