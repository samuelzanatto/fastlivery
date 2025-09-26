'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  startStripeOnboarding,
  checkStripeAccountStatus,
  getUserSuppliersStripeStatus,
} from '@/actions/stripe/stripe-connect-actions'
import { ExternalLink, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'

interface SupplierStripeStatus {
  id: string
  category: string
  companyName: string
  companyEmail: string
  stripeAccountId: string | null
  stripeStatus: string | null
  chargesEnabled: boolean | null
  payoutsEnabled: boolean | null
  onboardedAt: Date | null
  commissionRate: number | null
}

export function StripeConnectDashboard() {
  const [suppliers, setSuppliers] = useState<SupplierStripeStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [onboardingLoading, setOnboardingLoading] = useState<string | null>(null)

  useEffect(() => {
    loadSuppliersStatus()
  }, [])

  const loadSuppliersStatus = async () => {
    try {
      const result = await getUserSuppliersStripeStatus()
      if (result.success) {
        setSuppliers(result.suppliers as SupplierStripeStatus[])
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Erro ao carregar fornecedores')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartOnboarding = async (supplierId: string) => {
    setOnboardingLoading(supplierId)
    try {
      const currentUrl = window.location.origin
      const result = await startStripeOnboarding({
        supplierId,
        returnUrl: `${currentUrl}/stripe-connect?onboarding=success`,
        refreshUrl: `${currentUrl}/stripe-connect?onboarding=refresh`,
      })

      if (result.success && result.onboardingUrl) {
        // Redireciona para o Stripe Connect
        window.location.href = result.onboardingUrl
      } else {
        toast.error(result.error || 'URL de onboarding não disponível')
      }
    } catch (error) {
      toast.error('Erro ao iniciar onboarding')
      console.error(error)
    } finally {
      setOnboardingLoading(null)
    }
  }

  const handleCheckStatus = async (accountId: string) => {
    try {
      const result = await checkStripeAccountStatus(accountId)
      if (result.success) {
        toast.success('Status atualizado com sucesso')
        await loadSuppliersStatus() // Recarrega a lista
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Erro ao verificar status')
      console.error(error)
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'CONNECTED':
        return <Badge className="bg-green-100 text-green-800">Conectado</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      case 'RESTRICTED':
        return <Badge className="bg-red-100 text-red-800">Restrito</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejeitado</Badge>
      case 'NOT_CONNECTED':
      default:
        return <Badge variant="secondary">Não conectado</Badge>
    }
  }

  const getCapabilitiesBadges = (chargesEnabled: boolean | null, payoutsEnabled: boolean | null) => {
    return (
      <div className="flex gap-1">
        <Badge variant={chargesEnabled ? 'default' : 'secondary'} className="text-xs">
          {chargesEnabled ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
          Pagamentos
        </Badge>
        <Badge variant={payoutsEnabled ? 'default' : 'secondary'} className="text-xs">
          {payoutsEnabled ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
          Transferências
        </Badge>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Carregando fornecedores...</div>
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Fornecedores</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conectados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {suppliers.filter(s => s.stripeStatus === 'CONNECTED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {suppliers.filter(s => s.stripeStatus === 'PENDING').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão Média</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.length > 0
                ? (suppliers.reduce((acc, s) => acc + (s.commissionRate || 0), 0) / suppliers.length).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Fornecedores */}
      <Card>
        <CardHeader>
          <CardTitle>Fornecedores e Status Stripe Connect</CardTitle>
          <CardDescription>
            Gerencie as contas conectadas dos seus fornecedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum fornecedor cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status Stripe</TableHead>
                  <TableHead>Capacidades</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{supplier.companyName}</div>
                        <div className="text-sm text-muted-foreground">{supplier.companyEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{supplier.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(supplier.stripeStatus)}
                    </TableCell>
                    <TableCell>
                      {supplier.stripeStatus === 'CONNECTED' ? (
                        getCapabilitiesBadges(supplier.chargesEnabled, supplier.payoutsEnabled)
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.commissionRate ? `${supplier.commissionRate}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!supplier.stripeAccountId || supplier.stripeStatus === 'NOT_CONNECTED' ? (
                          <Button
                            size="sm"
                            onClick={() => handleStartOnboarding(supplier.id)}
                            disabled={onboardingLoading === supplier.id}
                          >
                            {onboardingLoading === supplier.id ? 'Iniciando...' : 'Conectar Stripe'}
                            <ExternalLink className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <>
                            {supplier.stripeStatus !== 'CONNECTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartOnboarding(supplier.id)}
                                disabled={onboardingLoading === supplier.id}
                              >
                                {onboardingLoading === supplier.id ? 'Continuando...' : 'Continuar Setup'}
                                <ExternalLink className="w-4 h-4 ml-1" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckStatus(supplier.stripeAccountId!)}
                            >
                              Verificar Status
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona o Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">1. Conectar Conta</h4>
              <p className="text-sm text-muted-foreground">
                O fornecedor conecta sua conta bancária ao Stripe Connect para receber pagamentos.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Configurar Comissão</h4>
              <p className="text-sm text-muted-foreground">
                Defina a taxa de comissão que a plataforma irá cobrar em cada transação.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Pagamentos Automáticos</h4>
              <p className="text-sm text-muted-foreground">
                Os pagamentos são automaticamente divididos entre o fornecedor e a plataforma.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. Transferências Semanais</h4>
              <p className="text-sm text-muted-foreground">
                O Stripe transfere o dinheiro do fornecedor para sua conta bancária semanalmente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}