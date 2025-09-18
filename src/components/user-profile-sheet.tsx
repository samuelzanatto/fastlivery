'use client'

import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User,
  LogOut,
  MapPin,
  CreditCard,
  Bell,
  HelpCircle,
  Shield
} from 'lucide-react'

interface UserProfileSheetProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UserProfileSheet({ children, open, onOpenChange }: UserProfileSheetProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(open || false)

  useEffect(() => {
    const handleOpenProfileSheet = () => {
      setIsOpen(true)
    }

    window.addEventListener('openProfileSheet', handleOpenProfileSheet)
    return () => {
      window.removeEventListener('openProfileSheet', handleOpenProfileSheet)
    }
  }, [])

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const profileMenuItems = [
    {
      icon: User,
      label: 'Editar Perfil',
      href: '/perfil',
      description: 'Informações pessoais'
    },
    {
      icon: MapPin,
      label: 'Endereços',
      href: '/enderecos',
      description: 'Locais de entrega'
    },
    {
      icon: CreditCard,
      label: 'Pagamentos',
      href: '/pagamentos',
      description: 'Cartões e métodos'
    },
    {
      icon: Bell,
      label: 'Notificações',
      href: '/notificacoes',
      description: 'Preferências de aviso'
    },
    {
      icon: Shield,
      label: 'Privacidade',
      href: '/privacidade',
      description: 'Dados e segurança'
    },
    {
      icon: HelpCircle,
      label: 'Ajuda',
      href: '/ajuda',
      description: 'Central de suporte'
    }
  ]

  if (!session?.user) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {children || <div style={{ display: 'none' }} />}
        </SheetTrigger>
        
        <SheetContent side="bottom" className="rounded-t-2xl border-t-0 h-auto">
          <SheetTitle className="sr-only">Login necessário</SheetTitle>
          <div className="flex flex-col items-center text-center py-8 px-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Entre na sua conta
            </h3>
            <p className="text-slate-600 mb-6 max-w-sm">
              Faça login para acessar seu perfil, pedidos e muito mais
            </p>
            <div className="flex gap-3 w-full max-w-sm">
              <Button
                onClick={() => router.push('/customer-login')}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Entrar
              </Button>
              <Button
                onClick={() => router.push('/customer-signup')}
                variant="outline"
                className="flex-1 border-slate-300 hover:bg-slate-50"
              >
                Criar conta
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children || <div style={{ display: 'none' }} />}
      </SheetTrigger>
      
      <SheetContent side="bottom" className="rounded-t-2xl border-t-0 h-auto max-h-[85vh] overflow-y-auto">
        <SheetTitle className="sr-only">Perfil do usuário</SheetTitle>
        
        {/* User Header */}
        <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-2xl mb-6 mt-4">
          <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
            <AvatarImage src={session.user.image || undefined} />
            <AvatarFallback className="bg-orange-200 text-orange-700 font-semibold text-lg">
              {session.user.name?.slice(0, 2).toUpperCase() || 'US'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-xl truncate">
              {session.user.name || 'Usuário'}
            </h2>
            <p className="text-slate-600 truncate mb-2">
              {session.user.email}
            </p>
            <Badge variant="secondary" className="bg-orange-200/50 text-orange-700 border-orange-200">
              Cliente Premium
            </Badge>
          </div>
        </div>

        {/* Menu Options */}
        <div className="space-y-2 mb-6">
          {profileMenuItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className="w-full justify-start text-left h-auto py-4 px-4 rounded-xl hover:bg-slate-50 transition-all duration-200 group"
              onClick={() => router.push(item.href)}
            >
              <div className="flex items-center gap-4 w-full">
                <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-orange-100 transition-colors flex-shrink-0">
                  <item.icon className="h-5 w-5 text-slate-600 group-hover:text-orange-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-base">
                    {item.label}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>

        <Separator className="mb-6" />

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-left h-auto py-4 px-4 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 group mb-4"
          onClick={handleSignOut}
        >
          <div className="flex items-center gap-4 w-full">
            <div className="bg-red-50 p-3 rounded-xl group-hover:bg-red-100 transition-colors">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-base">Sair da conta</p>
              <p className="text-sm text-red-500">Fazer logout do aplicativo</p>
            </div>
          </div>
        </Button>

        {/* Bottom spacing for safe area */}
        <div className="h-4"></div>
      </SheetContent>
    </Sheet>
  )
}
