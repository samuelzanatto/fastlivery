'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, DollarSign, Calendar, Package, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createPartnershipRequest, CreatePartnershipRequestData } from '@/actions/partnerships/manage-partnership-requests'

interface SendPartnershipRequestProps {
  supplierId: string
  supplierName: string
  services?: Array<{
    id: string
    name: string
    category: string
  }>
}

export function SendPartnershipRequest({ 
  supplierId, 
  supplierName, 
  services = [] 
}: SendPartnershipRequestProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreatePartnershipRequestData>({
    supplierId,
    message: '',
    serviceIds: [],
    expectedVolume: '',
    budget: undefined,
    timeline: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const result = await createPartnershipRequest(formData)
      
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        
        // Reset form
        setFormData({
          supplierId,
          message: '',
          serviceIds: [],
          expectedVolume: '',
          budget: undefined,
          timeline: ''
        })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Erro ao enviar solicitação')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFormData((prev: any) => ({
      ...prev,
      serviceIds: prev.serviceIds?.includes(serviceId)
        ? prev.serviceIds.filter((id: string) => id !== serviceId)
        : [...(prev.serviceIds || []), serviceId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Solicitar Parceria
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Parceria</DialogTitle>
          <DialogDescription>
            Envie uma solicitação de parceria para <strong>{supplierName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Mensagem (opcional)
            </Label>
            <Textarea
              id="message"
              placeholder="Descreva seus objetivos para esta parceria..."
              value={formData.message}
              onChange={(e) => setFormData((prev: CreatePartnershipRequestData) => ({ ...prev, message: e.target.value }))}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Explique o que você espera desta parceria e como ela pode beneficiar ambas as partes.
            </p>
          </div>

          {/* Serviços de Interesse */}
          {services.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Serviços de Interesse
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.id}
                      checked={formData.serviceIds?.includes(service.id)}
                      onCheckedChange={() => handleServiceToggle(service.id)}
                    />
                    <Label 
                      htmlFor={service.id} 
                      className="text-sm font-normal flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.category}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione os serviços que interessam à sua empresa.
              </p>
            </div>
          )}

          {/* Volume Esperado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedVolume" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Volume Esperado
              </Label>
              <Select 
                value={formData.expectedVolume} 
                onValueChange={(value) => setFormData((prev: CreatePartnershipRequestData) => ({ ...prev, expectedVolume: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o volume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo (até R$ 10k/mês)</SelectItem>
                  <SelectItem value="medio">Médio (R$ 10k - R$ 50k/mês)</SelectItem>
                  <SelectItem value="alto">Alto (R$ 50k - R$ 200k/mês)</SelectItem>
                  <SelectItem value="muito-alto">Muito Alto (acima R$ 200k/mês)</SelectItem>
                  <SelectItem value="negociar">A negociar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orçamento */}
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Orçamento (R$)
              </Label>
              <Input
                id="budget"
                type="number"
                placeholder="Ex: 25000"
                value={formData.budget || ''}
                onChange={(e) => setFormData((prev: CreatePartnershipRequestData) => ({ 
                  ...prev, 
                  budget: e.target.value ? Number(e.target.value) : undefined 
                }))}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <Label htmlFor="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline Desejado
            </Label>
            <Select 
              value={formData.timeline} 
              onValueChange={(value) => setFormData((prev: CreatePartnershipRequestData) => ({ ...prev, timeline: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Quando gostaria de iniciar?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imediato">Imediato (até 1 semana)</SelectItem>
                <SelectItem value="curto">Curto prazo (1-4 semanas)</SelectItem>
                <SelectItem value="medio">Médio prazo (1-3 meses)</SelectItem>
                <SelectItem value="longo">Longo prazo (3-6 meses)</SelectItem>
                <SelectItem value="flexivel">Flexível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resumo */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Resumo da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fornecedor:</span>
                <span className="text-sm font-medium">{supplierName}</span>
              </div>
              
              {formData.serviceIds && formData.serviceIds.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Serviços:</span>
                  <span className="text-sm font-medium">{formData.serviceIds.length} selecionados</span>
                </div>
              )}
              
              {formData.expectedVolume && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Volume:</span>
                  <span className="text-sm font-medium">
                    {formData.expectedVolume.charAt(0).toUpperCase() + formData.expectedVolume.slice(1)}
                  </span>
                </div>
              )}
              
              {formData.budget && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Orçamento:</span>
                  <span className="text-sm font-medium">
                    R$ {formData.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              
              {formData.timeline && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Timeline:</span>
                  <span className="text-sm font-medium">
                    {formData.timeline.charAt(0).toUpperCase() + formData.timeline.slice(1)} prazo
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="flex-1"
            >
              {loading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}