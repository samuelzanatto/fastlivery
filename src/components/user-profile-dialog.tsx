'use client'

import React, { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  User, 
  Camera,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  Building,
  AlertCircle
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { toast } from 'sonner'

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAvatarUpdate?: () => void
}

export function UserProfileDialog({ open, onOpenChange, onAvatarUpdate }: UserProfileDialogProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<{
    id: string
    name: string
    email: string
    phone?: string
    image?: string
    role: string
    createdAt: string
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    if (open && session?.user) {
      setLoading(true)
      
      const fetchUserProfile = async () => {
        if (!session?.user?.id) return

        try {
          const response = await fetch(`/api/profile/${session.user.id}`)
          if (response.ok) {
            const data = await response.json()
            // A API retorna { user, employee }, precisamos extrair os dados do user
            setUserProfile({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              phone: data.user.phone,
              image: data.user.image,
              role: data.employee?.role?.name || 'Funcionário',
              createdAt: data.user.createdAt
            })
          }
        } catch (error) {
          console.error('Erro ao carregar perfil:', error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchUserProfile()
    }
  }, [open, session])

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      })

      if (response.ok) {
        toast.success('Senha alterada com sucesso!')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error('Erro ao alterar senha')
      }
    } catch {
      toast.error('Erro ao alterar senha')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!session?.user?.id) {
      toast.error('Usuário não autenticado')
      return
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de arquivo não suportado. Use JPG, PNG ou WebP.')
      return
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5MB')
      return
    }

    setUploadingAvatar(true)
    
    try {
      // Fazer upload da nova imagem (a API automaticamente remove avatares antigos)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityId', session.user.id)
      formData.append('imageType', 'user_avatar')

      toast.info('Fazendo upload do avatar...')

      const response = await fetch('/api/upload/images', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro no upload')
      }

      const uploadedImage = await response.json()
      
      // Atualizar o perfil do usuário com a nova imagem
      const updateResponse = await fetch(`/api/profile/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: uploadedImage.url 
        })
      })

      if (updateResponse.ok) {
        // Atualizar o estado local
        setUserProfile(prev => prev ? { ...prev, image: uploadedImage.url } : null)
        
        toast.success('Avatar atualizado com sucesso!')
        
        // Limpar o input de arquivo para permitir reupload do mesmo arquivo
        event.target.value = ''
        
        // Notificar o componente pai para atualizar o avatar na sidebar
        onAvatarUpdate?.()
        
        // Fechar o dialog para forçar recarregamento quando reabrir
        onOpenChange(false)
      } else {
        toast.error('Erro ao atualizar perfil')
      }

    } catch (error) {
      console.error('Erro no upload do avatar:', error)
      toast.error(error instanceof Error ? error.message : 'Erro no upload do avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Meu Perfil
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-2">Carregando perfil...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meu Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Seção do Avatar e Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={userProfile?.image || session?.user?.image || undefined} 
                      alt={userProfile?.name || session?.user?.name || 'Avatar'} 
                    />
                    <AvatarFallback className="text-2xl">
                      {(userProfile?.name || session?.user?.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full p-1.5"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">
                    {userProfile?.name || session?.user?.name || 'Nome não informado'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {uploadingAvatar 
                      ? 'Fazendo upload do avatar...' 
                      : 'Clique no ícone da câmera para alterar seu avatar'
                    }
                  </p>
                </div>
              </div>

              {/* Informações do Usuário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input 
                    value={userProfile?.email || session?.user?.email || ''} 
                    disabled 
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para alterar o email, solicite ao administrador
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input 
                    value={userProfile?.phone || 'Não informado'} 
                    disabled 
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Criação
                  </Label>
                  <Input 
                    value={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('pt-BR') : 'Não informado'} 
                    disabled 
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Tipo de Usuário
                  </Label>
                  <Input 
                    value={userProfile?.role || 'Funcionário'} 
                    disabled 
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção de Alteração de Senha */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  A senha deve ter pelo menos 6 caracteres
                </p>
                <Button 
                  onClick={handleChangePassword}
                  disabled={!newPassword || !confirmPassword || changingPassword}
                  className="min-w-[120px]"
                >
                  {changingPassword ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Alterando...
                    </div>
                  ) : (
                    'Alterar Senha'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}