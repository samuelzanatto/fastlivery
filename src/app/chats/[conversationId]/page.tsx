'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PWAHeader } from '@/components/pwa-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSession } from '@/lib/auth-client'
import { 
  MessageCircle,
  Send,
  ArrowLeft,
  Phone,
  MoreVertical
} from 'lucide-react'

interface ChatMessage {
  id: string
  content: string
  senderType: 'CUSTOMER' | 'RESTAURANT'
  createdAt: string
  isRead: boolean
}

interface ConversationDetails {
  id: string
  restaurant: {
    id: string
    name: string
    slug: string
    profileImage?: string
    phone?: string
  }
  messages: ChatMessage[]
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [conversation, setConversation] = useState<ConversationDetails | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const conversationId = params.conversationId as string

  // WebSocket connection removido - funcionalidade removida do projeto

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversation = useCallback(async () => {
    if (!conversationId || !session?.user) return
    
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/chats/${conversationId}/messages`)
      if (!response.ok) {
        throw new Error('Erro ao carregar conversa')
      }
      
      const data = await response.json()
      setConversation(data.conversation)
      
      // Join chat room via WebSocket - REMOVIDO
      // Funcionalidade WebSocket removida do projeto
    } catch (error) {
      console.error('Erro ao carregar conversa:', error)
      
      // Fallback para mock data
      const mockConversation: ConversationDetails = {
        id: conversationId,
        restaurant: {
          id: 'rest-1',
          name: 'Pizzaria Bella Italia',
          slug: 'pizzaria-bella-italia',
          profileImage: undefined,
          phone: '(11) 99999-9999'
        },
        messages: [
          {
            id: 'msg-1',
            content: 'Olá! Seu pedido foi recebido e está sendo preparado.',
            senderType: 'RESTAURANT',
            createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            isRead: true
          },
          {
            id: 'msg-2',
            content: 'Obrigado! Quanto tempo para ficar pronto aproximadamente?',
            senderType: 'CUSTOMER',
            createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
            isRead: true
          }
        ]
      }
      
      setConversation(mockConversation)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, session?.user])

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || isSending) return
    
    try {
      setIsSending(true)
      
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: newMessage.trim(),
        senderType: 'CUSTOMER',
        createdAt: new Date().toISOString(),
        isRead: false
      }
      
      // Adicionar mensagem otimisticamente
      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, tempMessage]
      } : prev)
      
      const messageContent = newMessage.trim()
      setNewMessage('')
      
      const response = await fetch(`/api/chats/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent })
      })
      
      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem')
      }
      
      const data = await response.json()
      
      // Substituir mensagem temporária pela real
      setConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === tempMessage.id ? data.message : msg
        )
      } : prev)
      
      // Enviar via WebSocket - REMOVIDO
      // Funcionalidade WebSocket removida do projeto
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      
      // Remover mensagem temporária em caso de erro
      setConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(m => !m.id.startsWith('temp-'))
      } : prev)
      
      // Restaurar texto da mensagem
      setNewMessage(newMessage)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  useEffect(() => {
    loadConversation()
  }, [loadConversation])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  // WebSocket listeners - REMOVIDO
  // Funcionalidade WebSocket removida do projeto
  // A atualização de mensagens em tempo real foi removida

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PWAHeader title="Chat" showBackButton={true} />
        <div className="p-4 pt-20 text-center py-16">
          <MessageCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            Acesso necessário
          </h3>
          <p className="text-slate-600 mb-6">
            Faça login para acessar o chat
          </p>
          <Button onClick={() => router.push('/login')}>
            Fazer Login
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !conversation) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PWAHeader title="Chat" showBackButton={true} />
        <div className="p-4 pt-20 flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header personalizado com info do restaurante */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2 h-auto"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Avatar className="w-10 h-10">
              <AvatarImage src={conversation.restaurant.profileImage} />
              <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                {conversation.restaurant.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-slate-800 truncate">
                {conversation.restaurant.name}
              </h1>
              <p className="text-xs text-slate-500">Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {conversation.restaurant.phone && (
              <Button variant="ghost" size="sm" className="p-2">
                <Phone className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 pt-[73px] pb-[100px] px-4">
        <div className="space-y-4 py-4">
          {conversation.messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.senderType === 'CUSTOMER' ? 'order-2' : 'order-1'}`}>
                <div className={`p-3 rounded-2xl text-sm ${
                  message.senderType === 'CUSTOMER' 
                    ? 'bg-orange-500 text-white rounded-br-sm' 
                    : 'bg-white text-slate-900 border shadow-sm rounded-bl-sm'
                }`}>
                  <div>{message.content}</div>
                </div>
                <div className={`text-xs text-slate-500 mt-1 ${
                  message.senderType === 'CUSTOMER' ? 'text-right' : 'text-left'
                }`}>
                  {formatTime(message.createdAt)}
                  {message.senderType === 'CUSTOMER' && (
                    <span className="ml-1">
                      {message.isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
              
              {message.senderType === 'RESTAURANT' && (
                <Avatar className="w-8 h-8 ml-2 order-2 flex-shrink-0">
                  <AvatarImage src={conversation.restaurant.profileImage} />
                  <AvatarFallback className="bg-orange-100 text-orange-600 text-xs">
                    {conversation.restaurant.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="p-4">
          <div className="flex gap-3 items-end">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-full px-4 py-3 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
              rows={1}
              disabled={isSending}
            />
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              size="sm" 
              className="h-11 w-11 p-0 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}