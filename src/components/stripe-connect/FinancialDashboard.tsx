'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { getSupplierTransactions } from '@/actions/stripe/stripe-payments-actions'
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Transaction {
  id: string
  stripeTransactionId: string
  type: string
  status: string
  amount: number
  currency: string
  platformCommission: number
  supplierAmount: number
  description: string | null
  stripeCreatedAt: Date
  createdAt: Date
}

interface TransactionListProps {
  supplierId: string
}

export function FinancialDashboard({ supplierId }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadTransactions = React.useCallback(async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)

      const result = await getSupplierTransactions(supplierId, 20, offset)
      
      if (result.success) {
        if (offset === 0) {
          setTransactions(result.transactions as Transaction[])
        } else {
          setTransactions(prev => [...prev, ...(result.transactions as Transaction[])])
        }
        setTotalCount(result.totalCount || 0)
        setHasMore(result.hasMore || false)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Erro ao carregar transações')
      console.error(error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [supplierId])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleLoadMore = () => {
    loadTransactions(transactions.length)
  }

  // Estatísticas calculadas
  const stats = React.useMemo(() => {
    const totalReceived = transactions
      .filter(t => t.status === 'SUCCEEDED')
      .reduce((acc, t) => acc + t.supplierAmount, 0)

    const totalCommission = transactions
      .filter(t => t.status === 'SUCCEEDED')
      .reduce((acc, t) => acc + t.platformCommission, 0)

    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const monthlyReceived = transactions
      .filter(t => t.status === 'SUCCEEDED' && new Date(t.stripeCreatedAt) >= thisMonth)
      .reduce((acc, t) => acc + t.supplierAmount, 0)

    const monthlyCommission = transactions
      .filter(t => t.status === 'SUCCEEDED' && new Date(t.stripeCreatedAt) >= thisMonth)
      .reduce((acc, t) => acc + t.platformCommission, 0)

    return {
      totalReceived: totalReceived / 100, // Convertendo de centavos para reais
      totalCommission: totalCommission / 100,
      monthlyReceived: monthlyReceived / 100,
      monthlyCommission: monthlyCommission / 100,
      totalTransactions: transactions.length,
      successfulTransactions: transactions.filter(t => t.status === 'SUCCEEDED').length,
    }
  }, [transactions])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Falhou</Badge>
      case 'CANCELED':
        return <Badge variant="secondary">Cancelado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <Badge variant="outline">Pagamento</Badge>
      case 'REFUND':
        return <Badge variant="outline">Reembolso</Badge>
      case 'ADJUSTMENT':
        return <Badge variant="outline">Ajuste</Badge>
      case 'PAYOUT':
        return <Badge variant="outline">Saque</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatCurrency = (amount: number, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  if (loading) {
    return <div className="text-center py-8">Carregando transações...</div>
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.successfulTransactions} transações
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão Plataforma</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.totalCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de comissões
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.monthlyReceived)}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissão: {formatCurrency(stats.monthlyCommission)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.successfulTransactions} bem-sucedidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Visualize todas as transações e seus detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">
                            {new Date(transaction.stripeCreatedAt).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(transaction.stripeCreatedAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(transaction.type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {transaction.description || 'Sem descrição'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {transaction.stripeTransactionId.slice(-8)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.amount / 100)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        -{formatCurrency(transaction.platformCommission / 100)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(transaction.supplierAmount / 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Carregando...' : 'Carregar Mais'}
                  </Button>
                </div>
              )}
              
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Mostrando {transactions.length} de {totalCount} transações
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}