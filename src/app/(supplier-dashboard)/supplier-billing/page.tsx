'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader, DashboardHeaderButton } from "@/components/ui/dashboard-header"
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  FileText,
  AlertCircle,
  Check,
  Clock
} from "lucide-react"

export default function SupplierBilling() {
  const currentPlan = {
    name: "Plano Profissional",
    price: "R$ 149,90",
    period: "mensal",
    status: "ativo",
    nextBilling: "2024-11-15",
    features: [
      "Até 500 produtos",
      "Relatórios avançados", 
      "Integração com sistemas",
      "Suporte prioritário"
    ]
  }

  const billingHistory = [
    {
      id: "INV-2024-001",
      date: "2024-10-15",
      amount: "R$ 149,90",
      status: "paga",
      description: "Plano Profissional - Outubro 2024",
      downloadUrl: "#"
    },
    {
      id: "INV-2024-002", 
      date: "2024-09-15",
      amount: "R$ 149,90",
      status: "paga",
      description: "Plano Profissional - Setembro 2024",
      downloadUrl: "#"
    },
    {
      id: "INV-2024-003",
      date: "2024-08-15", 
      amount: "R$ 149,90",
      status: "paga",
      description: "Plano Profissional - Agosto 2024",
      downloadUrl: "#"
    },
    {
      id: "INV-2024-004",
      date: "2024-07-15",
      amount: "R$ 149,90", 
      status: "pendente",
      description: "Plano Profissional - Julho 2024",
      downloadUrl: "#"
    }
  ]

  const paymentMethods = [
    {
      id: 1,
      type: "Cartão de Crédito",
      details: "**** **** **** 4532",
      brand: "Visa",
      isDefault: true,
      expiresAt: "12/26"
    },
    {
      id: 2,
      type: "Cartão de Crédito", 
      details: "**** **** **** 8765",
      brand: "Mastercard",
      isDefault: false,
      expiresAt: "08/25"
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paga":
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Paga</Badge>
      case "pendente":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
      case "ativo":
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Ativo</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Cobrança"
        description="Gerencie seu plano e histórico de pagamentos"
      >
        <DashboardHeaderButton>
          <Download className="h-4 w-4 mr-2" />
          Baixar Faturas
        </DashboardHeaderButton>
      </DashboardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Plano Atual
              </span>
              {getStatusBadge(currentPlan.status)}
            </CardTitle>
            <CardDescription>
              Detalhes da sua assinatura atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                  <p className="text-muted-foreground">
                    {currentPlan.price}/{currentPlan.period}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Próxima cobrança</p>
                  <p className="font-medium">{new Date(currentPlan.nextBilling).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Recursos incluídos:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-4 border-t">
                <Button variant="outline">Alterar Plano</Button>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  Cancelar Assinatura
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
            <CardDescription>Gerencie seus métodos de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">{method.details}</p>
                        <p className="text-xs text-muted-foreground">{method.brand} • Expira {method.expiresAt}</p>
                      </div>
                    </div>
                    {method.isDefault && (
                      <Badge variant="secondary" className="text-xs">Padrão</Badge>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                Adicionar Método
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Histórico de Cobrança
          </CardTitle>
          <CardDescription>
            Todas as suas faturas e pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingHistory.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{invoice.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.id} • {new Date(invoice.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium">{invoice.amount}</p>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Cadastrados</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">347</div>
            <p className="text-xs text-muted-foreground">
              de 500 disponíveis
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: "69.4%" }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Processados</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.347</div>
            <p className="text-xs text-muted-foreground">
              neste mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              clientes únicos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}