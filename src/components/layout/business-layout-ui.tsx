'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Menu,
  X,
  Home,
  Package,
  Settings,
  LogOut,
  ShoppingBag, 
  Users, 
  Store,
  QrCode,
  HeadphonesIcon,
  BarChart,
  MoreVertical,
  Shield,
  Grid3x3,
  Plus,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth/auth-client'
import { useBusinessContext } from '@/hooks/business/use-business-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserProfile } from '@/components/profile/unified-user-profile'
import { useBusinessLayout } from '@/providers/business-layout-provider'

interface BusinessLayoutUIProps {
  children: React.ReactNode
}

export function BusinessLayoutUI({ children }: BusinessLayoutUIProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending: sessionPending } = useSession()
  const { permissions, loading: businessLoading, initialized: businessInitialized } = useBusinessContext()
  const { isOwner } = permissions
  const {
    userProfileData,
    avatarKey,
    isLoading
  } = useBusinessLayout()

  // initialLoad só deve ser true na primeira montagem, não a cada navegação
  const [initialLoad, setInitialLoad] = useState(() => !businessInitialized)
  
  useEffect(() => {
    // Só atualizar initialLoad se ainda estiver carregando
    if (initialLoad && !isLoading && !businessLoading && businessInitialized) {
      // Pequeno delay para transição suave
      const t = setTimeout(() => setInitialLoad(false), 50)
      return () => clearTimeout(t)
    }
  }, [initialLoad, isLoading, businessLoading, businessInitialized])

  // Não retornar null - sempre renderizar o layout
  // O AuthGuard no layout.tsx já garante que temos sessão válida

  const hasPermission = (resource: string, action: string) => {
    if (isOwner) return true
    
    switch (resource) {
      case 'dashboard':
        return true
      case 'orders':
        return permissions.canManageOrders
      case 'products':
        return permissions.canManageProducts
      case 'reports':
        return permissions.canViewAnalytics
      case 'tables':
        return permissions.canManageOrders
      case 'employees':
        return permissions.canManageEmployees
      case 'permissions':
        return action === 'MANAGE' ? permissions.canManageEmployees : true
      case 'settings':
        return permissions.canManageBusiness
      default:
        return false
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const allSidebarItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: Home, href: '/dashboard', resource: 'dashboard', action: 'READ' as const },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag, href: '/orders', resource: 'orders', action: 'READ' as const },
    { id: 'products', label: 'Produtos', icon: Package, href: '/products', resource: 'products', action: 'READ' as const },
    { id: 'categories', label: 'Categorias', icon: Grid3x3, href: '/categories', resource: 'products', action: 'READ' as const },
    { id: 'additionals', label: 'Adicionais', icon: Plus, href: '/additionals', resource: 'products', action: 'READ' as const },
    { id: 'analytics', label: 'Relatórios', icon: BarChart, href: '/analytics', resource: 'reports', action: 'READ' as const },
    { id: 'tables', label: 'Mesas & QR', icon: QrCode, href: '/tables', resource: 'tables', action: 'READ' as const },
    { id: 'users', label: 'Funcionários', icon: Users, href: '/users', resource: 'employees', action: 'READ' as const },
    { id: 'permissions', label: 'Permissões', icon: Shield, href: '/permissions', resource: 'permissions', action: 'MANAGE' as const },
    { id: 'settings', label: 'Configurações', icon: Settings, href: '/settings', resource: 'settings', action: 'READ' as const }
  ]

  const sidebarItems = allSidebarItems.filter(item => {
    if (isOwner) return true
    return hasPermission(item.resource, item.action)
  })

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col h-full`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-2">
            <Store className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold text-slate-800">FastLivery</span>
          </div>
          <Button
            variant="ghost" 
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-1 pb-4 space-y-2 overflow-y-auto scrollbar-hide">
          {initialLoad ? (
            <>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3 px-3 py-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
              ))}
            </>
          ) : (
            sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/')
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })
          )}
        </nav>

        {/* User Info - Footer */}
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {initialLoad ? (
                <>
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      key={avatarKey}
                      src={userProfileData.image || session?.user?.image || undefined} 
                      alt={session?.user?.name || 'Avatar'} 
                    />
                    <AvatarFallback className="text-sm font-medium bg-slate-200 text-slate-600">
                      {session?.user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-slate-600 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {!initialLoad ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSupportDialogOpen(true)}>
                    <HeadphonesIcon className="h-4 w-4 mr-2" />
                    Suporte
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5" />
              Suporte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600">
              Entre em contato com nosso suporte através dos canais abaixo:
            </p>
            <div className="space-y-2">
              <p><strong>Email:</strong> suporte@fastlivery.com</p>
              <p><strong>WhatsApp:</strong> (11) 99999-9999</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UserProfile 
        open={profileDialogOpen} 
        onOpenChange={setProfileDialogOpen}
      />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col h-full">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 h-16 flex items-center lg:hidden flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </main>
      </div>
    </div>
  )
}
