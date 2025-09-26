'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Send,
  Building2,
  Mail,
  ExternalLink,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  PartnershipRequest,
  getPartnershipRequests,
  getSupplierPartnershipRequests,
  respondToPartnershipRequest,
  cancelPartnershipRequest,
  getPartnershipRequestStats
} from '@/actions/partnerships/manage-partnership-requests'

interface PartnershipRequestsProps {
  userType: 'company' | 'supplier'
}

const statusColors = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red'
} as const

const statusLabels = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada'
} as const

export function PartnershipRequests({ userType }: PartnershipRequestsProps) {
  const [requests, setRequests] = useState<PartnershipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    sent: 0,
    received: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PartnershipRequest | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      await loadRequests()
      await loadStats()
    }
    
    loadData()
  }, [userType]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadRequests = async () => {
    try {
      setLoading(true)
      const data = userType === 'supplier' 
        ? await getSupplierPartnershipRequests()
        : await getPartnershipRequests()
      
      setRequests(data)
    } catch (error) {
      toast.error('Erro ao carregar solicitações')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await getPartnershipRequestStats()
      setStats(data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleResponse = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return

    try {
      setSubmitting(true)
      const result = await respondToPartnershipRequest({
        requestId: selectedRequest.id,
        status,
        response: responseText
      })

      if (result.success) {
        toast.success(result.message)
        setResponseDialogOpen(false)
        setResponseText('')
        setSelectedRequest(null)
        loadRequests()
        loadStats()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Erro ao responder solicitação')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (requestId: string) => {
    try {
      const result = await cancelPartnershipRequest(requestId)

      if (result.success) {
        toast.success(result.message)
        loadRequests()
        loadStats()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Erro ao cancelar solicitação')
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton para stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton para lista */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING')
  const approvedRequests = requests.filter(r => r.status === 'APPROVED')
  const rejectedRequests = requests.filter(r => r.status === 'REJECTED')

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Send className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">
                  {userType === 'supplier' ? 'Recebidas' : 'Enviadas'}
                </p>
                <p className="text-2xl font-bold">
                  {userType === 'supplier' ? stats.received : stats.sent}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Rejeitadas</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">
                  {userType === 'supplier' ? stats.received : stats.sent}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userType === 'supplier' ? 'Solicitações Recebidas' : 'Solicitações Enviadas'}
          </CardTitle>
          <CardDescription>
            {userType === 'supplier' 
              ? 'Gerencie as solicitações de parceria recebidas de empresas'
              : 'Acompanhe suas solicitações de parceria enviadas para fornecedores'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pendentes ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Aprovadas ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejeitadas ({rejectedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <RequestsList
                requests={pendingRequests}
                userType={userType}
                onResponse={(request) => {
                  setSelectedRequest(request)
                  setResponseDialogOpen(true)
                }}
                onCancel={handleCancel}
              />
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <RequestsList
                requests={approvedRequests}
                userType={userType}
              />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <RequestsList
                requests={rejectedRequests}
                userType={userType}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Resposta */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder Solicitação</DialogTitle>
            <DialogDescription>
              Responda à solicitação de parceria de {selectedRequest?.requester.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="response">Mensagem de resposta (opcional)</Label>
              <Textarea
                id="response"
                placeholder="Digite sua resposta..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleResponse('APPROVED')}
                disabled={submitting}
                className="flex-1"
                variant="default"
              >
                {submitting ? 'Processando...' : 'Aprovar'}
              </Button>
              <Button
                onClick={() => handleResponse('REJECTED')}
                disabled={submitting}
                className="flex-1"
                variant="destructive"
              >
                {submitting ? 'Processando...' : 'Rejeitar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface RequestsListProps {
  requests: PartnershipRequest[]
  userType: 'company' | 'supplier'
  onResponse?: (request: PartnershipRequest) => void
  onCancel?: (requestId: string) => void
}

function RequestsList({ requests, userType, onResponse, onCancel }: RequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
        <p className="text-muted-foreground">
          {userType === 'supplier' 
            ? 'Você ainda não recebeu solicitações de parceria.'
            : 'Você ainda não enviou solicitações de parceria.'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {requests.map((request) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage 
                      src={userType === 'supplier' 
                        ? request.company?.logo 
                        : request.supplier.company.logo
                      } 
                    />
                    <AvatarFallback>
                      {userType === 'supplier' 
                        ? request.company?.name[0]
                        : request.supplier.company.name[0]
                      }
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {userType === 'supplier' 
                          ? request.company?.name 
                          : request.supplier.company.name
                        }
                      </h3>
                      <Badge color={statusColors[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {userType === 'supplier' 
                          ? request.requester.email 
                          : request.supplier.company.email
                        }
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Solicitado em {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {request.message && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Mensagem:</p>
                        <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                          {request.message}
                        </p>
                      </div>
                    )}

                    {request.expectedVolume && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Volume esperado:</strong> {request.expectedVolume}
                      </p>
                    )}

                    {request.budget && (
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <strong>Orçamento:</strong> R$ {request.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}

                    {request.timeline && (
                      <p className="text-sm text-muted-foreground mb-4">
                        <strong>Timeline:</strong> {request.timeline}
                      </p>
                    )}

                    {request.response && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Resposta:</p>
                        <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                          {request.response}
                        </p>
                        {request.respondedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Respondido em {new Date(request.respondedAt).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {request.status === 'PENDING' && userType === 'supplier' && onResponse && (
                      <Button 
                        onClick={() => onResponse(request)}
                        size="sm"
                      >
                        Responder
                      </Button>
                    )}

                    {request.status === 'PENDING' && userType === 'company' && onCancel && (
                      <Button 
                        onClick={() => onCancel(request.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    )}

                    <Button size="sm" variant="ghost" asChild>
                      <a 
                        href={userType === 'supplier' 
                          ? `/company-profile/${request.companyId}` 
                          : `/supplier-profile/${request.supplier.id}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver Perfil
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}