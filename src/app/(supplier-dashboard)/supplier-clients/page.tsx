'use client'

import { useEffect, useState } from 'react'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Building2, 
  Eye,
  MessageSquare,
  MoreVertical
} from "lucide-react"
import { useSession } from '@/lib/auth/auth-client'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/notifications/notify'
import { getPartnerships } from '@/actions/partnerships/partnerships'
import type { Partnership } from '@/actions/partnerships/partnerships'



export default function SupplierClients() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')


  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  const loadClients = async () => {
    setLoading(true)
    try {
      const partnershipsResult = await getPartnerships({})
      
      if (partnershipsResult.success) {
        setClients(partnershipsResult.data || [])
      } else {
        throw new Error(partnershipsResult.error)
      }
      

    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      notify('error', 'Erro ao carregar clientes', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      loadClients()
    }
  }, [session])

  const filteredClients = clients.filter(client => {
    const supplierName = client.supplier?.company?.name || ''
    return supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (isPending) {
    return null
  }

  if (!session) {
    return null
  }

  const getStatusBadge = (status: Partnership['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="text-green-600 border-green-600">Ativo</Badge>
      case 'SUSPENDED':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Suspenso</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>
      case 'TERMINATED':
        return <Badge variant="outline" className="text-red-600 border-red-600">Terminado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }



  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  const handleViewClient = (clientId: string) => {
    router.push(`/supplier-clients/${clientId}`)
  }

  const handleMessageClient = (clientId: string) => {
    router.push(`/whatsapp?clientId=${clientId}`)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Meus Clientes"
        description="Gerencie seu relacionamento com clientes parceiros"
      />



      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm ? 'Tente ajustar sua busca.' : 'Você ainda não tem clientes cadastrados.'}
            </p>
            <p className="text-sm text-slate-500">
              Os clientes aparecerão aqui automaticamente quando fizerem parcerias com seu negócio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{client.supplier?.company?.name || 'Fornecedor'}</h3>
                    <p className="text-sm text-slate-600">{client.supplier?.category || 'Fornecedor'}</p>
                    <p className="text-xs text-slate-500">
                      Parceria desde {formatDate(client.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {getStatusBadge(client.status)}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewClient(client.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMessageClient(client.id)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar Mensagem
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}