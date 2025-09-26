'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PWAHeader } from '@/components/layout/pwa-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSession } from '@/lib/auth/auth-client'
import { getConversations } from '@/actions/chats/chats'
import { 
  MessageCircle,
  Search,
  User
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Conversation {
  id: string
  business: {
    id: string
    name: string
    slug: string
    profileImage: string | null
  }
  lastMessage?: {
    id: string
    content: string
    createdAt: Date | string
    senderType: string
  } | null
  unreadCount: number
  updatedAt: string
}

export default function ChatsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtrar conversas baseado na busca
  const filteredConversations = conversations.filter(conversation =>
    conversation.business.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes < 1 ? 'Agora' : `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `${diffInHours}h`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return diffInDays === 1 ? '1 dia' : `${diffInDays} dias`
    }
  }

  const loadConversations = useCallback(async () => {
    if (!session?.user) return
    
    try {
      setIsLoading(true)
      
      const result = await getConversations()
      if (result.success) {
        setConversations(result.data.conversations)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      
      // Fallback para mock data se a API falhar
      const mockConversations: Conversation[] = [
        {
          id: '1',
          business: {
            id: 'rest-1',
            name: 'Pizzaria Bella Italia',
            slug: 'pizzaria-bella-italia',
            profileImage: null
          },
          lastMessage: {
            id: 'msg-1',
            content: 'Obrigado pelo pedido! Sua pizza estará pronta em breve.',
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutos atrás
            senderType: 'BUSINESS'
          },
          unreadCount: 2,
          updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          business: {
            id: 'rest-2',
            name: 'Hamburgeria do João',
            slug: 'hamburgeria-do-joao',
            profileImage: null
          },
          lastMessage: {
            id: 'msg-2',
            content: 'Posso trocar o hambúrguer por um vegetariano?',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
            senderType: 'CUSTOMER'
          },
          unreadCount: 0,
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      setConversations(mockConversations)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user])

  const handleConversationClick = (conversation: Conversation) => {
    router.push(`/chats/${conversation.id}`)
  }

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PWAHeader title="Chats" showBackButton={true} className="lg:hidden" />
        <div className="p-4 pt-20 text-center py-16">
          <MessageCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            Acesso necessário
          </h3>
          <p className="text-slate-600 mb-6">
            Faça login para ver seus chats com as empresas.
          </p>
          <Button onClick={() => router.push('/login')}>
            Fazer Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PWAHeader title="Chats" showBackButton={true} className="lg:hidden" />
      
      <div className="p-4 pt-20 space-y-4">
        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Buscar empresas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de conversas */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="h-3 bg-slate-200 rounded w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              {searchQuery ? 'Nenhum chat encontrado' : 'Nenhum chat ainda'}
            </h3>
            <p className="text-slate-600">
              {searchQuery 
                ? 'Tente buscar por outra empresa' 
                : 'Faça um pedido e converse com a empresa!'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleConversationClick(conversation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    {/* Avatar da empresa */}
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={conversation.business.profileImage || undefined} />
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        {conversation.business.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Conteúdo da conversa */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-slate-800 truncate">
                          {conversation.business.name}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-500">
                            {formatTime(conversation.updatedAt)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge 
                              className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1 min-w-[20px] h-5 rounded-full flex items-center justify-center"
                            >
                              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {conversation.lastMessage && (
                        <div className="flex items-center gap-1">
                          {conversation.lastMessage.senderType === 'CUSTOMER' && (
                            <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          )}
                          <p className={`text-sm truncate ${
                            conversation.unreadCount > 0 
                              ? 'text-slate-800 font-medium' 
                              : 'text-slate-600'
                          }`}>
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}