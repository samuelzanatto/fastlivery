'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Users, 
  Plus, 
  Search,
  Phone,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
  User,
  Building
} from 'lucide-react'
import { notify } from '@/lib/notifications/notify'

interface Client {
  id: string
  type: 'MANUAL' | 'PARTNERSHIP'
  name: string
  email: string
  phone: string
  company?: string
  isActive: boolean
  whatsappEnabled: boolean
  lastContact?: Date
  totalOrders: number
  createdAt: Date
}

interface ClientsManagerProps {
  clients: Client[]
  onClientUpdate: () => void
}

export function ClientsManager({ clients, onClientUpdate }: ClientsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddClientDialog, setShowAddClientDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estado do formulário de novo cliente
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    whatsappEnabled: true,
  })

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) {
      notify('error', 'Campos obrigatórios', { 
        description: 'Nome e telefone são obrigatórios' 
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'MANUAL',
          ...newClient,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao cadastrar cliente')
      }

      notify('success', 'Cliente cadastrado', { 
        description: 'Cliente adicionado com sucesso' 
      })
      
      setShowAddClientDialog(false)
      setNewClient({
        name: '',
        email: '',
        phone: '',
        company: '',
        whatsappEnabled: true,
      })
      onClientUpdate()

    } catch (error) {
      console.error('Erro ao adicionar cliente:', error)
      notify('error', 'Erro ao cadastrar', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWhatsapp = async (clientId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/whatsapp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ whatsappEnabled: enabled }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar configuração')
      }

      notify('success', 'Configuração atualizada', { 
        description: `WhatsApp ${enabled ? 'ativado' : 'desativado'} para o cliente` 
      })
      
      onClientUpdate()

    } catch (error) {
      console.error('Erro ao atualizar WhatsApp:', error)
      notify('error', 'Erro ao atualizar', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
    }
  }

  const getClientTypeLabel = (type: string) => {
    switch (type) {
      case 'MANUAL': return 'Manual'
      case 'PARTNERSHIP': return 'Parceria'
      default: return type
    }
  }

  const getClientTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'MANUAL': return 'secondary'
      case 'PARTNERSHIP': return 'default'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header e Busca */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              <DialogDescription>
                Cadastre um novo cliente manualmente para permitir pedidos via WhatsApp
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome *</Label>
                <Input
                  id="clientName"
                  value={newClient.name}
                  onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Telefone *</Label>
                <Input
                  id="clientPhone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientCompany">Empresa</Label>
                <Input
                  id="clientCompany"
                  value={newClient.company}
                  onChange={(e) => setNewClient(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Nome da empresa (opcional)"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium">Habilitar WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Permitir pedidos via WhatsApp</p>
                </div>
                <Switch
                  checked={newClient.whatsappEnabled}
                  onCheckedChange={(checked) => setNewClient(prev => ({ ...prev, whatsappEnabled: checked }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddClient} disabled={loading}>
                  {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              {searchTerm ? (
                <>
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
                  <p className="text-sm text-gray-500">
                    Tente ajustar sua busca ou adicionar um novo cliente
                  </p>
                </>
              ) : (
                <>
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Nenhum cliente cadastrado</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Adicione clientes manualmente ou estabeleça parcerias com empresas
                  </p>
                  <Button onClick={() => setShowAddClientDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Cliente
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.name}`} />
                      <AvatarFallback>
                        {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {client.name}
                        </h3>
                        <Badge variant={getClientTypeBadgeVariant(client.type)}>
                          {getClientTypeLabel(client.type)}
                        </Badge>
                        {!client.isActive && (
                          <Badge variant="destructive">Inativo</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        {client.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{client.email}</span>
                          </div>
                        )}
                        {client.company && (
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{client.company}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                        <span>{client.totalOrders} pedidos</span>
                        {client.lastContact && (
                          <span>Último contato: {new Date(client.lastContact).toLocaleDateString()}</span>
                        )}
                        <span>Cadastrado em {new Date(client.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* WhatsApp Toggle */}
                    <div className="flex items-center space-x-2">
                      <MessageSquare className={`h-4 w-4 ${client.whatsappEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                      <Switch
                        checked={client.whatsappEnabled}
                        onCheckedChange={(checked) => handleToggleWhatsapp(client.id, checked)}

                      />
                    </div>

                    {/* Menu de Ações */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <User className="h-4 w-4 mr-2" />
                          Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}