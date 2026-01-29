'use client'

import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth/auth-client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Menu,
  ShoppingBag,
  MapPin,
  User,
  LogOut,
  Heart,
  Zap,
  DollarSign,
  Star,
  LogIn,
  UserPlus,
  MessageCircle
} from 'lucide-react'

/**
 * PWA Header Component
 * 
 * Para páginas que usam showBackButton={true}, adicione pt-20 (ou classe .pwa-header-spacing) 
 * no container principal para evitar que o conteúdo fique atrás do header fixo.
 * 
 * Exemplo:
 * <div className="p-4 pt-20"> ou <div className="p-4 pwa-header-spacing">
 */

interface PWAHeaderProps {
  title?: string
  showBackButton?: boolean
  showMenu?: boolean
  className?: string
  menuOnly?: boolean
  onBack?: () => void
  scrollBlur?: boolean
  menuType?: 'landing' | 'business' // Nova prop para tipo do menu
  isStatic?: boolean // Nova prop para header não fixo (landing page)
  noBorder?: boolean // Nova prop para remover borda e sombra
}

export function PWAHeader({
  title,
  showBackButton = false,
  onBack,
  showMenu = true,
  className = "",
  menuOnly = false,
  scrollBlur = false,
  menuType = 'business', // Default para backward compatibility
  isStatic = false, // Default para comportamento atual (fixo)
  noBorder = false // Default sem remover borda
}: PWAHeaderProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!scrollBlur) return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollBlur])

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    if (item.href.startsWith('#')) {
      // Handle anchor links (smooth scroll)
      const element = document.querySelector(item.href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // Regular navigation
      router.push(item.href)
    }
  }

  const menuItems = menuType === 'landing'
    ? [
      // Menu para landing page (desktop content)
      {
        icon: Zap,
        label: 'Recursos',
        href: '#features',
      },
      {
        icon: DollarSign,
        label: 'Preços',
        href: '#pricing',
      },
      {
        icon: Star,
        label: 'Depoimentos',
        href: '#testimonials',
      },
      {
        icon: LogIn,
        label: 'Login',
        href: '/login',
      },
    ]
    : [
      // Menu para rotas públicas dos negócios (clientes)
      {
        icon: ShoppingBag,
        label: 'Meus Pedidos',
        href: '/meus-pedidos',
      },
      {
        icon: MessageCircle,
        label: 'Chats',
        href: '/chats',
      },
      {
        icon: MapPin,
        label: 'Endereços',
        href: '/enderecos',
      },
      {
        icon: Heart,
        label: 'Favoritos',
        href: '/favoritos',
      },
      {
        icon: User,
        label: 'Minha Conta',
        href: '/conta',
      },
      ...(session?.user ? [] : [
        {
          icon: LogIn,
          label: 'Login',
          href: '/customer-login',
        },
      ]),
    ]

  // Dynamic header styles based on scroll
  const getHeaderStyles = () => {
    const borderAndShadow = noBorder ? '' : 'border-b border-slate-200 shadow-sm'
    const borderAndShadowScrolled = noBorder ? '' : 'border-b border-slate-200/50 shadow-sm'

    if (isStatic) {
      // Para landing page - header fixo mas sem afetar o layout (sem padding necessário)
      if (scrollBlur) {
        return isScrolled
          ? `fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md ${borderAndShadowScrolled} transition-all duration-300`
          : 'fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-300'
      }
      return `fixed top-0 left-0 right-0 z-50 bg-white ${borderAndShadow}`
    }

    // Para páginas normais - header fixo
    if (scrollBlur) {
      return isScrolled
        ? `fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md ${borderAndShadowScrolled} transition-all duration-300`
        : 'fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-300'
    }
    return `fixed top-0 left-0 right-0 z-50 bg-white ${borderAndShadow}`
  }

  // Menu only mode - just the menu button in top right
  if (menuOnly) {
    return (
      <header className={`${getHeaderStyles()} ${className || ''}`}>
        <div className="flex items-center justify-end px-4 py-3">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-2 h-auto transition-all duration-300 ${scrollBlur && !isScrolled
                  ? 'hover:bg-black/20 text-slate-800 drop-shadow-sm'
                  : 'hover:bg-slate-100 text-slate-700'
                  }`}
              >
                {session?.user ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || undefined} />
                    <AvatarFallback className="text-xs bg-orange-100 text-orange-600">
                      {session.user.name?.slice(0, 2).toUpperCase() || 'US'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-80 rounded-l-2xl border-l-0">
              <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
              <div className="flex flex-col h-full">
                {/* User Info */}
                {session?.user ? (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-tl-2xl mb-6">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={session.user.image || undefined} />
                      <AvatarFallback className="bg-orange-200 text-orange-700 font-medium">
                        {session.user.name?.slice(0, 2).toUpperCase() || 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate text-base">
                        {session.user.name || 'Usuário'}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {session.user.email}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1 bg-orange-200/50 text-orange-700 border-orange-200">
                        {session.user.role === 'businessOwner' ? 'Proprietário' : session.user.role === 'businessStaff' ? 'Funcionário' : 'Cliente'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl text-center mb-6">
                    <div className="mb-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="h-6 w-6 text-orange-600" />
                      </div>
                      <p className="text-slate-700 text-sm font-medium">
                        Faça login para acessar sua conta
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push('/customer-login')}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      size="sm"
                    >
                      Entrar
                    </Button>
                  </div>
                )}

                {/* Menu Items */}
                <nav className="flex-1 space-y-1 px-2">
                  {menuItems.map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="w-full justify-start text-left h-12 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
                      onClick={() => handleMenuItemClick(item)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-orange-100 transition-colors">
                          <item.icon className="h-4 w-4 text-slate-600 group-hover:text-orange-600 transition-colors" />
                        </div>
                        <span className="text-slate-700 font-medium">{item.label}</span>
                      </div>
                    </Button>
                  ))}
                </nav>

                {session?.user && (
                  <div className="pt-4 px-2 py-4">
                    <Separator className="mb-4" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-12 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 group"
                      onClick={handleSignOut}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="bg-red-50 p-2 rounded-lg group-hover:bg-red-100 transition-colors">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Sair</span>
                      </div>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    )
  }

  return (
    <header className={`${getHeaderStyles()} ${className || ''}`}>
      <div className="flex items-center justify-between px-4 py-3 relative">
        {/* Left Side - Back Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className={`p-2 h-auto transition-all duration-300 ${scrollBlur && !isScrolled
                ? 'hover:bg-black/20 text-slate-800 drop-shadow-sm'
                : 'hover:bg-slate-100 text-slate-700'
                }`}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Title with Logo - Centered regardless of menu */}
        <div className="flex items-center justify-center flex-1 absolute left-0 right-0 pointer-events-none">
          {title && (
            <div className="flex items-center gap-2">
              {title === 'FastLivery' && (
                <img src="/logo with name.png" alt="FastLivery Logo" className="h-10 w-auto" />
              )}
              {title !== 'FastLivery' && (
                <h1 className={`font-semibold text-lg truncate transition-all duration-300 ${scrollBlur && !isScrolled ? 'text-slate-800 drop-shadow-sm' : 'text-slate-800'
                  }`}>
                  {title}
                </h1>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Menu */}
        {showMenu && (
          <div className="flex-shrink-0 z-10">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-2 h-auto transition-all duration-300 ${scrollBlur && !isScrolled
                    ? 'hover:bg-black/20 text-slate-800 drop-shadow-sm'
                    : 'hover:bg-slate-100 text-slate-700'
                    }`}
                >
                  {session?.user ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || undefined} />
                      <AvatarFallback className="text-xs bg-orange-100 text-orange-600">
                        {session.user.name?.slice(0, 2).toUpperCase() || 'US'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-80 rounded-l-2xl border-l-0">
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                <div className="flex flex-col h-full">
                  {/* User Info */}
                  {session?.user ? (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-tl-2xl mb-6">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={session.user.image || undefined} />
                        <AvatarFallback className="bg-orange-200 text-orange-700 font-medium">
                          {session.user.name?.slice(0, 2).toUpperCase() || 'US'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate text-base">
                          {session.user.name || 'Usuário'}
                        </p>
                        <p className="text-sm text-slate-600 truncate">
                          {session.user.email}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1 bg-orange-200/50 text-orange-700 border-orange-200">
                          {session.user.role === 'businessOwner' ? 'Proprietário' : session.user.role === 'businessStaff' ? 'Funcionário' : 'Cliente'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl text-center mb-6">
                      <div className="mb-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <User className="h-6 w-6 text-orange-600" />
                        </div>
                        <p className="text-slate-700 text-sm font-medium">
                          {menuType === 'landing' ? 'Explore o FastLivery' : 'Faça login para acessar sua conta'}
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push(menuType === 'landing' ? '/login' : '/customer-login')}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        size="sm"
                      >
                        {menuType === 'landing' ? 'Login / Cadastro' : 'Entrar'}
                      </Button>
                    </div>
                  )}

                  {/* Menu Items */}
                  <nav className="flex-1 space-y-1 px-2">
                    {menuItems.map((item) => (
                      <Button
                        key={item.href}
                        variant="ghost"
                        className="w-full justify-start text-left h-12 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
                        onClick={() => handleMenuItemClick(item)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-orange-100 transition-colors">
                            <item.icon className="h-4 w-4 text-slate-600 group-hover:text-orange-600 transition-colors" />
                          </div>
                          <span className="text-slate-700 font-medium">{item.label}</span>
                        </div>
                      </Button>
                    ))}
                  </nav>

                  {session?.user && (
                    <div className="pt-4 px-2">
                      <Separator className="mb-4" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left h-12 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 group"
                        onClick={handleSignOut}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="bg-red-50 p-2 rounded-lg group-hover:bg-red-100 transition-colors">
                            <LogOut className="h-4 w-4" />
                          </div>
                          <span className="font-medium">Sair</span>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  )
}

export default PWAHeader
