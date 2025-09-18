'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function TestPaymentPage() {
  const testCards = [
    {
      type: 'Visa',
      number: '4235 6477 2802 5682',
      cvv: '123',
      expiry: '11/25',
      status: 'approved',
      icon: '💳',
      color: 'bg-green-100 text-green-800'
    },
    {
      type: 'Mastercard',
      number: '5031 7557 3453 0604',
      cvv: '123', 
      expiry: '11/25',
      status: 'approved',
      icon: '💳',
      color: 'bg-green-100 text-green-800'
    },
    {
      type: 'Visa (Rejeitado)',
      number: '4013 5406 8274 6260',
      cvv: '123',
      expiry: '11/25', 
      status: 'rejected',
      icon: '❌',
      color: 'bg-red-100 text-red-800'
    },
    {
      type: 'Mastercard (Pendente)',
      number: '5031 4332 1540 6351',
      cvv: '123',
      expiry: '11/25',
      status: 'pending',
      icon: '⏳',
      color: 'bg-yellow-100 text-yellow-800'
    }
  ]

  const testUsers = [
    {
      name: 'João Silva',
      email: 'test_user_123456@testuser.com',
      cpf: '12345678909',
      description: 'Usuário de teste padrão'
    },
    {
      name: 'Maria Santos', 
      email: 'test_user_789012@testuser.com',
      cpf: '98765432100',
      description: 'Usuário de teste alternativo'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Testes de Pagamento - Stripe
            </h1>
            <p className="text-gray-600">
              Use os dados abaixo para testar pagamentos no ambiente de desenvolvimento
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cartões de Teste */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Cartões de Teste
                </CardTitle>
                <CardDescription>
                  Use estes cartões para simular diferentes cenários de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {testCards.map((card, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{card.icon}</span>
                        <span className="font-medium">{card.type}</span>
                      </div>
                      <Badge className={card.color}>
                        {card.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {card.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {card.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {card.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div><strong>Número:</strong> {card.number}</div>
                      <div><strong>CVV:</strong> {card.cvv}</div>
                      <div><strong>Validade:</strong> {card.expiry}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Usuários de Teste */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Usuários de Teste
                </CardTitle>
                <CardDescription>
                  Dados de usuários válidos para testes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {testUsers.map((user, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="text-sm space-y-1">
                      <div><strong>Nome:</strong> {user.name}</div>
                      <div><strong>Email:</strong> {user.email}</div>
                      <div><strong>CPF:</strong> {user.cpf}</div>
                      <div className="text-gray-600 text-xs mt-2">{user.description}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle>Instruções para Teste</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Como testar:</h4>
                <ol className="list-decimal list-inside space-y-2 text-blue-800">
                  <li>Acesse a página de cadastro em <code>/signup</code></li>
                  <li>Preencha todos os dados do formulário</li>
                  <li>Escolha um plano na etapa final</li>
                  <li>Clique em &quot;Finalizar Cadastro&quot;</li>
                  <li>No checkout do Stripe, use um dos cartões de teste acima</li>
                  <li>Complete o pagamento para ver o resultado</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Importante:</h4>
                <ul className="list-disc list-inside space-y-1 text-yellow-800">
                  <li>Certifique-se de estar usando o token de teste</li>
                  <li>Use apenas os cartões listados acima</li>
                  <li>Os valores serão simulados, não haverá cobrança real</li>
                  <li>Para testes em produção, substitua pelas credenciais reais</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">✅ Status esperados:</h4>
                <ul className="list-disc list-inside space-y-1 text-green-800">
                  <li><strong>Approved:</strong> Pagamento aprovado - usuário redirecionado para /payment/success</li>
                  <li><strong>Rejected:</strong> Pagamento rejeitado - usuário volta para /signup</li>
                  <li><strong>Pending:</strong> Pagamento pendente - usuário redirecionado para /payment/pending</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
