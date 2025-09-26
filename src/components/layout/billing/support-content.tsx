import { Button } from '@/components/ui/button'
import {
  Mail,
  Phone,
  MessageSquare,
} from 'lucide-react'

export function SupportContent() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Como podemos ajudar?</h3>
        <p className="text-gray-600 mb-6">
          Entre em contato conosco através de um dos canais abaixo
        </p>
      </div>

      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full justify-start h-auto p-4"
          onClick={() => window.open('mailto:suporte@zapdelivery.com', '_blank')}
        >
          <Mail className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-medium">Email</div>
            <div className="text-sm text-gray-600">suporte@zapdelivery.com</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start h-auto p-4"
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
        >
          <MessageSquare className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-medium">WhatsApp</div>
            <div className="text-sm text-gray-600">(11) 99999-9999</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start h-auto p-4"
          onClick={() => window.open('tel:+5511999999999', '_blank')}
        >
          <Phone className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-medium">Telefone</div>
            <div className="text-sm text-gray-600">(11) 99999-9999</div>
          </div>
        </Button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Horário de Atendimento</h4>
        <p className="text-sm text-gray-600">
          Segunda a Sexta: 8h às 18h<br />
          Sábado: 9h às 14h<br />
          Domingo: Fechado
        </p>
      </div>
    </div>
  )
}