'use client'

import { useState, useEffect } from 'react'
import { PWAHeader } from '@/components/pwa-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSession } from '@/lib/auth-client'
import { 
  User,
  Mail,
  Phone,
  Calendar,
  Edit,
  Save,
  X,
  Camera
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContaPage() {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '', // Você pode adicionar phone no schema do usuário
      })
    }
  }, [session])

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Dados atualizados com sucesso!')
      setIsEditing(false)
    } catch {
      toast.error('Erro ao atualizar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '',
      })
    }
    setIsEditing(false)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PWAHeader title="Minha Conta" showBackButton={true} className="lg:hidden" />
        <div className="p-4 pt-20 text-center py-16">
          <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            Acesso necessário
          </h3>
          <p className="text-slate-600 mb-6">
            Faça login para acessar sua conta
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Fazer Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PWAHeader title="Minha Conta" showBackButton={true} className="lg:hidden" />
      
      <div className="p-4 pt-20 space-y-4">
        {/* Profile Card */}
        <Card>
          <CardHeader className="text-center pb-6">
            <div className="relative mx-auto mb-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={session.user.image || undefined} />
                <AvatarFallback className="text-2xl bg-orange-100 text-orange-600">
                  {session.user.name?.slice(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 bg-orange-500 text-white rounded-full p-2 shadow-lg hover:bg-orange-600 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <CardTitle className="text-xl">{session.user.name}</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline">Cliente</Badge>
              {session.user.emailVerified && (
                <Badge className="bg-green-100 text-green-800">Verificado</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Actions */}
            <div className="flex justify-center gap-2">
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar Perfil
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>

            <Separator />

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 text-slate-700">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{formData.name || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{formData.email || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{formData.phone || 'Não informado'}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">Membro desde</span>
              </div>
              <span className="text-sm font-medium">
                {formatDate(session.user.createdAt)}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Status da conta</span>
              <Badge className="bg-green-100 text-green-800">Ativa</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">E-mail verificado</span>
              <Badge className={session.user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {session.user.emailVerified ? 'Verificado' : 'Pendente'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/pedidos'}
            >
              Ver meus pedidos
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/enderecos'}
            >
              Gerenciar endereços
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/favoritos'}
            >
              Meus restaurantes favoritos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
