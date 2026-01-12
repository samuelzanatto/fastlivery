'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notify } from '@/lib/notifications/notify'
import Link from 'next/link'

interface Owner {
  id: string
  name: string
  email: string
}

export default function NewBusinessPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [owners, setOwners] = useState<Owner[]>([])
  const [createNewOwner, setCreateNewOwner] = useState(false)

  const [formData, setFormData] = useState({
    // Dados da empresa
    name: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    slug: '',
    isActive: true,
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsDineIn: false,
    deliveryFee: 0,
    minimumOrder: 0,
    deliveryTime: 30,
    // Dados do dono (existente ou novo)
    ownerId: '',
    // Dados para novo dono
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
  })

  useEffect(() => {
    // Buscar lista de donos disponíveis (usuários com role businessOwner ou sem business)
    const fetchOwners = async () => {
      try {
        const response = await fetch('/api/admin/users?role=businessOwner&available=true')
        if (response.ok) {
          const data = await response.json()
          setOwners(data)
        }
      } catch (error) {
        console.error('Erro ao buscar donos:', error)
      }
    }
    fetchOwners()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createNewOwner,
        }),
      })

      if (response.ok) {
        notify('success', 'Empresa cadastrada com sucesso!')
        router.push('/admin/dashboard/businesses')
      } else {
        const error = await response.json()
        notify('error', error.message || 'Erro ao cadastrar empresa')
      }
    } catch (error) {
      console.error('Erro:', error)
      notify('error', 'Erro ao cadastrar empresa')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard/businesses">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Nova Empresa</h2>
          <p className="text-slate-400">Cadastre uma nova empresa na plataforma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados da Empresa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-slate-300">Nome da Empresa *</Label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleNameChange}
                      required
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                      placeholder="Ex: Pizzaria do João"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-slate-300">Slug (URL)</Label>
                    <Input
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                      placeholder="pizzaria-do-joao"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-slate-300">Email *</Label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                      placeholder="contato@empresa.com"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-slate-300">Telefone *</Label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-slate-300">Endereço *</Label>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-slate-300">Descrição</Label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white min-h-[80px]"
                      placeholder="Descrição da empresa..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dono da Empresa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" />
                  Dono da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                  <span className="text-slate-300">Criar novo dono</span>
                  <Switch
                    checked={createNewOwner}
                    onCheckedChange={setCreateNewOwner}
                  />
                </div>

                {!createNewOwner ? (
                  <div>
                    <Label className="text-slate-300">Selecionar Dono Existente</Label>
                    <Select
                      value={formData.ownerId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, ownerId: value }))}
                    >
                      <SelectTrigger className="mt-1 bg-slate-900/50 border-slate-600 text-white">
                        <SelectValue placeholder="Selecione um dono..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {owners.length === 0 ? (
                          <SelectItem value="_" disabled className="text-slate-400">
                            Nenhum dono disponível
                          </SelectItem>
                        ) : (
                          owners.map((owner) => (
                            <SelectItem
                              key={owner.id}
                              value={owner.id}
                              className="text-white focus:bg-slate-700"
                            >
                              {owner.name} ({owner.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-2">
                      Ou ative &quot;Criar novo dono&quot; para cadastrar um novo usuário
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-300">Nome do Dono *</Label>
                      <Input
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleInputChange}
                        required={createNewOwner}
                        className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Email do Dono *</Label>
                      <Input
                        name="ownerEmail"
                        type="email"
                        value={formData.ownerEmail}
                        onChange={handleInputChange}
                        required={createNewOwner}
                        className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                        placeholder="dono@email.com"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Telefone do Dono</Label>
                      <Input
                        name="ownerPhone"
                        value={formData.ownerPhone}
                        onChange={handleInputChange}
                        className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      O dono receberá um email para definir sua senha
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Configurações de Delivery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Configurações de Atendimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">Taxa de Entrega</Label>
                    <Input
                      name="deliveryFee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.deliveryFee}
                      onChange={handleNumberChange}
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Pedido Mínimo</Label>
                    <Input
                      name="minimumOrder"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minimumOrder}
                      onChange={handleNumberChange}
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Tempo (min)</Label>
                    <Input
                      name="deliveryTime"
                      type="number"
                      min="0"
                      value={formData.deliveryTime}
                      onChange={handleNumberChange}
                      className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                    <span className="text-slate-300">Aceita Delivery</span>
                    <Switch
                      checked={formData.acceptsDelivery}
                      onCheckedChange={(checked) => handleSwitchChange('acceptsDelivery', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                    <span className="text-slate-300">Aceita Retirada</span>
                    <Switch
                      checked={formData.acceptsPickup}
                      onCheckedChange={(checked) => handleSwitchChange('acceptsPickup', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                    <span className="text-slate-300">Aceita Consumo Local</span>
                    <Switch
                      checked={formData.acceptsDineIn}
                      onCheckedChange={(checked) => handleSwitchChange('acceptsDineIn', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                  <div>
                    <span className="text-slate-300 font-medium">Empresa Ativa</span>
                    <p className="text-sm text-slate-500">
                      Empresas inativas não aparecem para clientes
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/dashboard/businesses">
            <Button type="button" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Cadastrar Empresa
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
