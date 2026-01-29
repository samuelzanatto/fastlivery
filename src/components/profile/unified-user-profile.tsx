'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth/auth-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ImageUploadDialog } from '@/components/ui/image-upload-dialog'
import { ImageType } from '@/lib/services/image-types'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import {
  User,
  Camera,
  Eye,
  EyeOff,
  LogOut,
  MapPin,
  CreditCard
} from 'lucide-react'
import { notify } from '@/lib/notifications/notify'
import { updateUserProfile } from '@/actions/users/profile'
import { useBusinessLayout } from '@/providers/business-layout-provider'
import { OrdersSheet } from '@/components/orders/orders-sheet'

interface UserProfileProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Modo de exibição: 'sheet' para menu lateral, 'dialog' para edição completa
  mode?: 'sheet' | 'dialog' | 'auto'
  // Se deve mostrar apenas informações básicas ou permitir edição
  readOnly?: boolean
}

export function UserProfile({
  children,
  open = false,
  onOpenChange,
  mode = 'auto',
  readOnly = false
}: UserProfileProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { refreshUserProfile } = useBusinessLayout()
  const [isOpen, setIsOpen] = useState(open)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isOrdersOpen, setIsOrdersOpen] = useState(false)
  const isMobile = useIsMobile()

  // Determinar o modo de exibição
  const displayMode = mode === 'auto' ? (readOnly ? 'sheet' : 'dialog') : mode
  const shouldUseSheet = displayMode === 'sheet' || (isMobile && readOnly)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    avatar: ''
  })

  // Sincronizar com prop open
  useEffect(() => {
    setIsOpen(open)
  }, [open])

  // Carregar dados do usuário
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '', // TODO: adicionar campo phone ao schema do usuário se necessário
        avatar: session.user.image || ''
      }))
    }
  }, [session])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
    if (!newOpen) {
      setIsEditing(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/customer-login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      notify('error', 'Erro ao fazer logout')
    }
  }

  const handleSaveProfile = async () => {
    if (!formData.name || !formData.email) {
      notify('error', 'Nome e email são obrigatórios')
      return
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      notify('error', 'Senhas não coincidem')
      return
    }

    setIsLoading(true)
    try {
      const result = await updateUserProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        ...(formData.avatar && { image: formData.avatar }),
        ...(formData.password && { password: formData.password })
      })

      if (result.success) {
        notify('success', 'Perfil atualizado com sucesso!')
        setIsEditing(false)
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
      } else {
        notify('error', result.error || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      notify('error', 'Erro inesperado ao atualizar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  // Menu lateral simplificado
  const sheetContent = (
    <div className="space-y-6">
      {/* User Info */}
      <div className="text-center space-y-3">
        <Avatar className="w-20 h-20 mx-auto">
          <AvatarImage src={formData.avatar || session?.user?.image || undefined} />
          <AvatarFallback className="text-lg">
            {session?.user?.name?.slice(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div>
          <h3 className="font-semibold text-lg">{session?.user?.name || 'Usuário'}</h3>
          <p className="text-sm text-gray-600">{session?.user?.email}</p>
        </div>

        {session?.user?.role && (
          <Badge variant="secondary">
            {session.user.role}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Menu Items */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => router.push('/enderecos')}
        >
          <MapPin className="w-4 h-4 mr-3" />
          Meus Endereços
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setIsOrdersOpen(true)}
        >
          <CreditCard className="w-4 h-4 mr-3" />
          Meus Pedidos
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            handleOpenChange(false)
            // Reabrir em modo de edição
            setTimeout(() => {
              onOpenChange?.(true)
              setIsEditing(true)
            }, 100)
          }}
        >
          <User className="w-4 h-4 mr-3" />
          Editar Perfil
        </Button>
      </div>

      <Separator />

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-3" />
        Sair da Conta
      </Button>

      <OrdersSheet isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} />
    </div>
  )

  // Dialog completo para edição
  const dialogContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <Avatar className="w-24 h-24">
            <AvatarImage src={formData.avatar || session?.user?.image || undefined} />
            <AvatarFallback className="text-xl">
              {session?.user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <ImageUploadDialog
              entityId={session?.user?.id || ''}
              imageType={ImageType.USER_AVATAR}
              onImageSelect={async (image) => {
                setFormData(prev => ({ ...prev, avatar: image.url }))
                // Atualizar os dados do perfil na sidebar imediatamente
                await refreshUserProfile()
                notify('success', 'Avatar atualizado!')
              }}
              title="Alterar Avatar"
              description="Escolha uma nova foto para seu perfil"
            >
              <Button
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </ImageUploadDialog>
          )}
        </div>

        {!isEditing ? (
          <div>
            <h2 className="text-xl font-semibold">{session?.user?.name || 'Usuário'}</h2>
            <p className="text-gray-600">{session?.user?.email}</p>
          </div>
        ) : (
          <h2 className="text-xl font-semibold">Editar Perfil</h2>
        )}
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
        </div>

        {/* Senha (apenas na edição) */}
        {isEditing && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha (opcional)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Deixe em branco para manter a atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {formData.password && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {!isEditing ? (
          <>
            <Button
              onClick={() => setIsEditing(true)}
              className="flex-1"
            >
              <User className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        )}
      </div>
    </div>
  )

  // Renderizar como Sheet ou Dialog
  if (shouldUseSheet) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        {children && <SheetTrigger asChild>{children}</SheetTrigger>}
        <SheetContent side="right" className="w-80">
          <SheetHeader className="pb-4">
            <SheetTitle className="sr-only">Perfil do Usuário</SheetTitle>
          </SheetHeader>
          {sheetContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && children}
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Perfil do Usuário</DialogTitle>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  )
}

// Exportações para compatibilidade
export { UserProfile as UserProfileDialog }
export { UserProfile as UserProfileSheet }