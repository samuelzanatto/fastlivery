'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface Business {
  id: string
  name: string
}

const roles = [
  { value: 'platformAdmin', label: 'Admin da Plataforma', description: 'Acesso total ao sistema' },
  { value: 'platformSupport', label: 'Suporte da Plataforma', description: 'Acesso para ajudar usuários' },
  { value: 'businessOwner', label: 'Dono de Empresa', description: 'Gerencia sua própria empresa' },
  { value: 'customer', label: 'Cliente', description: 'Usuário final' },
]

export default function NewUserPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'businessOwner',
    businessId: '',
    isActive: false,
    sendSetupEmail: true,
  })

  useEffect(() => {
    // Buscar lista de empresas
    const fetchBusinesses = async () => {
      try {
        const response = await fetch('/api/admin/businesses')
        if (response.ok) {
          const data = await response.json()
          setBusinesses(data)
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error)
      }
    }
    fetchBusinesses()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        notify('success', 'Usuário cadastrado com sucesso!')
        router.push('/admin/dashboard/users')
      } else {
        const error = await response.json()
        notify('error', error.message || 'Erro ao cadastrar usuário')
      }
    } catch (error) {
      console.error('Erro:', error)
      notify('error', 'Erro ao cadastrar usuário')
    } finally {
      setIsLoading(false)
    }
  }

  const showBusinessSelect = formData.role === 'businessOwner'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard/users">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Novo Usuário</h2>
          <p className="text-slate-400">Cadastre um novo usuário na plataforma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Dados do Usuário */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Dados do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Nome Completo *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="Nome do usuário"
                />
              </div>

              <div>
                <Label className="text-slate-300">Email *</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label className="text-slate-300">Telefone</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <Label className="text-slate-300">Cargo *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="mt-1 bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {roles.map((role) => (
                      <SelectItem
                        key={role.value}
                        value={role.value}
                        className="text-white focus:bg-slate-700"
                      >
                        <div>
                          <p>{role.label}</p>
                          <p className="text-xs text-slate-400">{role.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showBusinessSelect && (
                <div>
                  <Label className="text-slate-300">Empresa</Label>
                  <Select
                    value={formData.businessId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, businessId: value }))}
                  >
                    <SelectTrigger className="mt-1 bg-slate-900/50 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione uma empresa (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="_none" className="text-slate-400">
                        Nenhuma (criar empresa depois)
                      </SelectItem>
                      {businesses.map((business) => (
                        <SelectItem
                          key={business.id}
                          value={business.id}
                          className="text-white focus:bg-slate-700"
                        >
                          {business.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Configurações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Usuário Ativo</span>
                  <p className="text-sm text-slate-500">
                    Usuários inativos não podem fazer login
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Enviar Email de Configuração</span>
                  <p className="text-sm text-slate-500">
                    O usuário receberá um email para definir sua senha
                  </p>
                </div>
                <Switch
                  checked={formData.sendSetupEmail}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, sendSetupEmail: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/dashboard/users">
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
                Cadastrar Usuário
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
