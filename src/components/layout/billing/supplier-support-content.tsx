'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock, 
  BookOpen, 
  Video,
  ExternalLink,
  CheckCircle
} from "lucide-react"

export function SupplierSupportContent() {
  const supportChannels = [
    {
      icon: MessageCircle,
      title: "Chat ao Vivo",
      description: "Suporte instantâneo durante horário comercial",
      availability: "Seg-Sex: 8h às 18h",
      status: "online",
      action: "Iniciar Chat",
      priority: "high"
    },
    {
      icon: Mail,
      title: "Email Suporte", 
      description: "Para questões detalhadas e não urgentes",
      availability: "Resposta em até 4 horas",
      status: "available",
      action: "Enviar Email",
      priority: "medium"
    },
    {
      icon: Phone,
      title: "Telefone",
      description: "Suporte telefônico para questões urgentes",
      availability: "Seg-Sex: 9h às 17h",
      status: "available", 
      action: "(11) 1234-5678",
      priority: "high"
    },
    {
      icon: Video,
      title: "Videochamada",
      description: "Suporte personalizado por videochamada",
      availability: "Agendamento necessário",
      status: "schedule",
      action: "Agendar",
      priority: "premium"
    }
  ]

  const resources = [
    {
      icon: BookOpen,
      title: "Central de Ajuda",
      description: "Documentação completa e tutoriais",
      link: "#"
    },
    {
      icon: Video,
      title: "Vídeo Tutoriais",
      description: "Aprenda com nossos vídeos explicativos",
      link: "#"
    },
    {
      icon: MessageCircle,
      title: "Comunidade",
      description: "Fórum de discussão entre fornecedores",
      link: "#"
    }
  ]

  const commonQuestions = [
    {
      question: "Como adicionar novos produtos?",
      answer: "Acesse 'Meus Produtos' > 'Adicionar Produto' e preencha as informações."
    },
    {
      question: "Como funciona o sistema de parcerias?",
      answer: "Restaurantes podem solicitar parcerias que você pode aprovar ou rejeitar."
    },
    {
      question: "Como alterar meu plano de assinatura?",
      answer: "Use a opção 'Gerenciar Assinatura' no menu do usuário para alterar seu plano."
    },
    {
      question: "Como acompanhar meus pedidos?",
      answer: "Na seção 'Pedidos Recebidos' você pode ver todos os pedidos e seus status."
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-100 text-green-800">Online</Badge>
      case "available":
        return <Badge className="bg-blue-100 text-blue-800">Disponível</Badge>
      case "schedule":
        return <Badge className="bg-orange-100 text-orange-800">Agendar</Badge>
      default:
        return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-green-200 hover:border-green-300"
      case "premium":
        return "border-purple-200 hover:border-purple-300"
      default:
        return "border-gray-200 hover:border-gray-300"
    }
  }

  return (
    <div className="space-y-6">
      {/* Support Channels */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Canais de Suporte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportChannels.map((channel, index) => {
            const Icon = channel.icon
            return (
              <Card key={index} className={`transition-colors ${getPriorityColor(channel.priority)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-base">{channel.title}</CardTitle>
                    </div>
                    {getStatusBadge(channel.status)}
                  </div>
                  <CardDescription className="text-sm">
                    {channel.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{channel.availability}</span>
                    </div>
                    <Button className="w-full" variant={channel.priority === 'high' ? 'default' : 'outline'}>
                      {channel.action}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Resources */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recursos de Ajuda</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((resource, index) => {
            const Icon = resource.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-base">{resource.title}</CardTitle>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {resource.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Perguntas Frequentes</h3>
        <div className="space-y-3">
          {commonQuestions.map((faq, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">Ainda precisa de ajuda?</CardTitle>
          <CardDescription>
            Nossa equipe está pronta para ajudar você a ter sucesso como fornecedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com Suporte
            </Button>
            <Button variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Enviar Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}