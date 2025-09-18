'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
  CreditCard,
  MoreVertical,
  Mail,
  Phone,
  MessageSquare,
  Crown,
  CheckCircle,
  Calendar,
  Zap,
  AlertTriangle,
  UserCheck,
  Shield,
  Grid3x3,
  Plus,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { useRestaurantContext } from '@/hooks/useRestaurantContext'
import { useAutoOpenClose } from '@/hooks/use-auto-open-close'
import { usePermissions } from '@/hooks/useRestaurantContext'
import { PasswordChangeProvider } from '@/components/password-change-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserProfileDialog } from '@/components/user-profile-dialog'

interface LayoutProps {
  children: React.ReactNode
}

interface RestaurantData {
  name: string
  isOpen: boolean
  plan: string
}

interface UsageData {
  planId: string
  usage: {
    orders: number
    products: number
    tables: number
    users: number
  }
  limits: {
    orders: number
    products: number
    tables: number
    users: number
  }
  billing: {
    currentPeriodEnd: string
  }
  features: {
    hasAdvancedAnalytics: boolean
    hasPrioritySupport: boolean
    hasCustomBranding: boolean
  }
}

// Componente de conteúdo para Billing Overview
function BillingOverviewContent() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([])

  const fetchUsageData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscription/usage')
      if (!response.ok) throw new Error('Erro ao carregar dados')
      const data = await response.json()
      setUsageData(data)
    } catch (error) {
      console.error('Erro ao carregar dados de uso:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStripePlans = async () => {
    try {
      const response = await fetch('/api/billing/plans')
      if (response.ok) {
        const data = await response.json()
        setStripePlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error fetching Stripe plans:', error)
    }
  }

  const getPlanInfo = (planId: string) => {
    // First try to get from Stripe data
    const stripePlan = stripePlans.find(sp => sp.id === planId)
    if (stripePlan) {
      const colorMap = {
        basic: 'text-blue-600',
        pro: 'text-orange-600',
        enterprise: 'text-purple-600'
      }
      return {
        name: stripePlan.name,
        price: stripePlan.price ? `R$ ${stripePlan.price}` : 'N/A',
        color: colorMap[planId as keyof typeof colorMap] || 'text-blue-600'
      }
    }

    // Fallback to hardcoded values
    const plans = {
      basic: { name: 'Basic', price: 'R$ 97', color: 'text-blue-600' },
      pro: { name: 'Pro', price: 'R$ 197', color: 'text-orange-600' },
      enterprise: { name: 'Enterprise', price: 'R$ 497', color: 'text-purple-600' },
    }
    return plans[planId as keyof typeof plans] || plans.basic
  }

  useEffect(() => {
    fetchUsageData()
    fetchStripePlans()
  }, [])

  if (isLoading || !usageData) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  const planInfo = getPlanInfo(usageData.planId)
  const nextBillingDate = new Date(usageData.billing.currentPeriodEnd)

  return (
    <div className="space-y-6">
      {/* Status da Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5" />
              <span>Plano Atual</span>
            </div>
            <Badge variant="outline" className={planInfo.color}>
              {planInfo.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${planInfo.color}`}>
                {planInfo.price}
              </div>
              <p className="text-sm text-gray-600">por mês</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Ativo</span>
              </div>
              <p className="text-sm text-gray-600">Status da assinatura</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {nextBillingDate.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-sm text-gray-600">Próxima cobrança</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas de Uso */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Uso Mensal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageCard
            title="Pedidos"
            current={usageData.usage.orders}
            limit={usageData.limits.orders}
            description="Este mês"
          />
          <UsageCard
            title="Produtos"
            current={usageData.usage.products}
            limit={usageData.limits.products}
            description="Cadastrados"
          />
          <UsageCard
            title="Mesas"
            current={usageData.usage.tables}
            limit={usageData.limits.tables}
            description="Ativas"
          />
          <UsageCard
            title="Usuários"
            current={usageData.usage.users}
            limit={usageData.limits.users}
            description="Ativos"
          />
        </div>
      </div>

      {/* Recursos Inclusos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Recursos do Plano</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {usageData.features.hasAdvancedAnalytics ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className={usageData.features.hasAdvancedAnalytics ? '' : 'text-gray-400'}>
                Analytics Avançado
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {usageData.features.hasPrioritySupport ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className={usageData.features.hasPrioritySupport ? '' : 'text-gray-400'}>
                Suporte Prioritário
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {usageData.features.hasCustomBranding ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              )}
              <span className={usageData.features.hasCustomBranding ? '' : 'text-gray-400'}>
                Marca Personalizada
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente de conteúdo para Billing Plans
function BillingPlansContent() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const fetchUsageData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscription/usage')
      if (!response.ok) throw new Error('Erro ao carregar dados')
      const data = await response.json()
      setUsageData(data)
    } catch (error) {
      console.error('Erro ao carregar dados de uso:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (newPlanId: string) => {
    setIsUpgrading(true)
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlanId }),
      })
      
      if (!response.ok) throw new Error('Erro ao fazer upgrade')
      
      const { url } = await response.json()
      if (url) {
        window.location.href = url
      } else {
        alert('Plano atualizado com sucesso!')
        fetchUsageData()
      }
    } catch (error) {
      console.error('Erro ao fazer upgrade do plano:', error)
      alert('Erro ao fazer upgrade do plano')
    } finally {
      setIsUpgrading(false)
    }
  }

  useEffect(() => {
    fetchUsageData()
  }, [])

  if (isLoading || !usageData) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <PlansComparison currentPlan={usageData.planId} onUpgrade={handleUpgrade} isUpgrading={isUpgrading} />
  )
}

// Componente para Cards de Uso (similar ao billing-dialog mas sem ícones)
interface UsageCardProps {
  title: string
  current: number
  limit: number
  description: string
}

function UsageCard({ title, current, limit, description }: UsageCardProps) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
  const isNearLimit = percentage > 80
  const isOverLimit = percentage >= 100

  return (
    <Card className={`${isOverLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-yellow-200 bg-yellow-50' : ''}`}>
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <div>
            <h3 className="font-medium text-sm text-slate-800">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-slate-800">
                {current.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600">
                {isUnlimited ? 'Ilimitado' : `de ${limit.toLocaleString()}`}
              </span>
            </div>
            
            {!isUnlimited && (
              <Progress 
                value={percentage} 
                className={`h-2 ${
                  isOverLimit ? '[&>div]:bg-red-500' : 
                  isNearLimit ? '[&>div]:bg-yellow-500' : 
                  '[&>div]:bg-green-500'
                }`}
              />
            )}
            
            {isOverLimit && (
              <div className="flex items-center justify-center space-x-1 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Limite excedido</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para comparação de planos
interface PlansComparisonProps {
  currentPlan: string
  onUpgrade: (planId: string) => void
  isUpgrading: boolean
}

interface StripePlan {
  id: string
  name: string
  price: string
  productId: string
  priceId: string
  description?: string
  metadata?: Record<string, string>
}

interface PlanData {
  id: string
  name: string
  price: string
  description: string
  features: string[]
  color: string
  buttonColor: string
  textColor: string
  popular?: boolean
  stripeProductId?: string
  stripePriceId?: string
}

function PlansComparison({ currentPlan, onUpgrade, isUpgrading }: PlansComparisonProps) {
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch plans from Stripe
  useEffect(() => {
    const fetchStripePlans = async () => {
      try {
        const response = await fetch('/api/billing/plans')
        if (response.ok) {
          const data = await response.json()
          setStripePlans(data.plans || [])
        }
      } catch (error) {
        console.error('Error fetching Stripe plans:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStripePlans()
  }, [])

  // Fallback plans if Stripe data is not available
  const fallbackPlans: PlanData[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'R$ 97',
      description: 'Ideal para pequenos negócios',
      features: [
        '100 pedidos/mês',
        '50 produtos',
        '5 mesas',
        '2 usuários',
        'Suporte por email',
        'Relatórios básicos'
      ],
      color: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-blue-600'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 197',
      description: 'Para negócios em crescimento',
      popular: true,
      features: [
        'Pedidos ilimitados',
        '200 produtos',
        '20 mesas',
        '5 usuários',
        'Suporte prioritário',
        'Analytics avançado',
        'Relatórios detalhados'
      ],
      color: 'border-orange-200',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      textColor: 'text-orange-600'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'R$ 497',
      description: 'Para grandes operações',
      features: [
        'Tudo ilimitado',
        'Produtos ilimitados',
        'Mesas ilimitadas',
        'Usuários ilimitados',
        'Suporte dedicado 24/7',
        'Analytics avançado',
        'Marca personalizada',
        'API completa'
      ],
      color: 'border-purple-200',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      textColor: 'text-purple-600'
    }
  ]

  // Merge Stripe data with fallback plans
  const getPlansWithStripeData = (): PlanData[] => {
    if (stripePlans.length === 0) return fallbackPlans

    return fallbackPlans.map(fallbackPlan => {
      const stripePlan = stripePlans.find(sp => sp.id === fallbackPlan.id)
      if (stripePlan) {
        return {
          ...fallbackPlan,
          name: stripePlan.name || fallbackPlan.name,
          price: stripePlan.price ? `R$ ${stripePlan.price}` : fallbackPlan.price,
          stripeProductId: stripePlan.productId,
          stripePriceId: stripePlan.priceId
        }
      }
      return fallbackPlan
    })
  }

  const plans = getPlansWithStripeData()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-2">Carregando planos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Escolha o melhor plano para você</h3>
        <p className="text-gray-600">Faça upgrade ou downgrade a qualquer momento</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.color} ${
                plan.popular ? 'border border-orange-500' : ''
              } ${isCurrentPlan ? 'bg-gray-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white">Mais Popular</Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white">Plano Atual</Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className={`text-xl ${plan.textColor}`}>
                  {plan.name}
                </CardTitle>
                <div className={`text-3xl font-bold ${plan.textColor}`}>
                  {plan.price}
                  <span className="text-sm text-gray-500 font-normal">/mês</span>
                </div>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button className="w-full" disabled variant="outline">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Plano Atual
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${plan.buttonColor} text-white`}
                      onClick={() => onUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Processando...' : `Trocar para ${plan.name}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// Componente de conteúdo para Support
function SupportContent() {
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

export default function PrivateLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [avatarKey, setAvatarKey] = useState(0) // Para forçar recarga do avatar
  const [userProfileData, setUserProfileData] = useState<{ image?: string | null }>({})
  const [restaurantData, setRestaurantData] = useState<RestaurantData>({
    name: '',
    isOpen: true,
    plan: 'pro'
  })
  // Evita mostrar tela de carregamento completa em cada navegação depois do primeiro bootstrap
  const [bootstrapped, setBootstrapped] = useState(false)
  const firstMountRef = useRef(true)
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = useSession()
  const { restaurant, isLoading: isLoadingRestaurant, isOwner } = useRestaurantContext()
  const { hasPermission } = usePermissions()
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  // Buscar dados do perfil do usuário (especialmente o avatar)
  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch(`/api/profile/${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserProfileData({
          image: data.user.image
        })
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error)
    }
  }, [session?.user?.id, setUserProfileData])

  // Função para forçar recarga do avatar
  const handleAvatarUpdate = () => {
    setAvatarKey(prev => prev + 1)
    fetchUserProfile()
  }

  // Carregar dados do perfil quando a sessão estiver disponível
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session?.user?.id, fetchUserProfile])

  // Auto abre/fecha com persistência no servidor para manter status coerente
  useAutoOpenClose(restaurant?.openingHours ?? null, {
    syncToServer: true,
    onStatusChange: (isOpen) => {
      setRestaurantData(prev => ({ ...prev, isOpen }))
    }
  })

  useEffect(() => {
    if (firstMountRef.current) {
      console.log('[PrivateLayout] mount path=', pathname)
      firstMountRef.current = false
    } else {
      console.log('[PrivateLayout] route change path=', pathname, 'isPending=', isPending)
    }

    if (!isPending && !session) {
      console.log('[PrivateLayout] sem sessão -> redirect /login')
      router.push('/login')
      return
    }

    if (session && restaurant) {
      setRestaurantData({
        name: restaurant.name || (session.user?.name ? `Restaurante do ${session.user.name.split(' ')[0]}` : 'Meu Restaurante'),
        isOpen: restaurant.isOpen ?? true,
        plan: restaurant.subscription?.planId || 'pro'
      })
    }

    // Marca bootstrap completo somente após termos resolvido o estado inicial (primeira vez que deixa de estar pendente)
    if (!bootstrapped && !isPending && !isLoadingRestaurant) {
      setBootstrapped(true)
      console.log('[PrivateLayout] bootstrapped')
    }
  }, [session, restaurant, isPending, router, pathname, isLoadingRestaurant, bootstrapped])

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const allSidebarItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: Home, href: '/dashboard', resource: 'dashboard', action: 'READ' as const },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag, href: '/orders', resource: 'orders', action: 'READ' as const },
    { id: 'waiter-orders', label: 'Pedidos Garçons', icon: UserCheck, href: '/waiter-orders', resource: 'orders', action: 'READ' as const },
    { id: 'products', label: 'Produtos', icon: Package, href: '/products', resource: 'products', action: 'READ' as const },
    { id: 'categories', label: 'Categorias', icon: Grid3x3, href: '/categories', resource: 'products', action: 'READ' as const },
    { id: 'additionals', label: 'Adicionais', icon: Plus, href: '/additionals', resource: 'products', action: 'READ' as const },
    { id: 'analytics', label: 'Relatórios', icon: BarChart, href: '/analytics', resource: 'reports', action: 'READ' as const },
    { id: 'tables', label: 'Mesas & QR', icon: QrCode, href: '/tables', resource: 'tables', action: 'READ' as const },
    { id: 'users', label: 'Funcionários', icon: Users, href: '/users', resource: 'employees', action: 'READ' as const },
    { id: 'permissions', label: 'Permissões', icon: Shield, href: '/permissions', resource: 'permissions', action: 'MANAGE' as const },
    { id: 'settings', label: 'Configurações', icon: Settings, href: '/settings', resource: 'settings', action: 'READ' as const }
  ]

  // Filtrar itens do sidebar baseado nas permissões do usuário
  const sidebarItems = allSidebarItems.filter(item => {
    // Dono do restaurante tem acesso a tudo
    if (isOwner) return true
    // Verificar se o usuário tem permissão para acessar o item
    return hasPermission(item.resource, item.action)
  })

  // Exibir tela de carregamento completa apenas no bootstrap inicial
  if (!bootstrapped && (isPending || isLoadingRestaurant)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <PasswordChangeProvider>
      <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col h-full`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Store className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold text-slate-800">ZapLivery</span>
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
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/')
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Restaurant Info */}
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">
                  {restaurantData.name}
                </p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    restaurantData.isOpen ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-slate-600">
                    {restaurantData.isOpen ? 'Aberto' : 'Fechado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Info - Footer */}
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Avatar className="w-8 h-8">
                <AvatarImage 
                  key={avatarKey}
                  src={userProfileData.image || session.user?.image || undefined} 
                  alt={session.user?.name || 'Avatar'} 
                />
                <AvatarFallback className="text-sm font-medium bg-slate-200 text-slate-600">
                  {session.user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {session.user?.name}
                </p>
                <p className="text-xs text-slate-600 truncate">
                  {session.user?.email}
                </p>
              </div>
            </div>
            
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
                <DropdownMenuItem onClick={() => setBillingDialogOpen(true)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gerenciar Assinatura
                </DropdownMenuItem>
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
          </div>
        </div>
      </div>

      {/* Billing Dialog */}
      <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
        <DialogContent className="min-w-6xl w-full max-h-[90vh] h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Gerenciar Assinatura
            </DialogTitle>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="plans">Planos Disponíveis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6 h-[70vh] overflow-y-auto">
                <BillingOverviewContent />
              </TabsContent>

              <TabsContent value="plans" className="space-y-6 mt-6 h-[70vh] overflow-y-auto">
                <BillingPlansContent />
              </TabsContent>
            </Tabs>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5" />
              Suporte
            </DialogTitle>
          </DialogHeader>
          <SupportContent />
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <UserProfileDialog 
        open={profileDialogOpen} 
        onOpenChange={setProfileDialogOpen}
        onAvatarUpdate={handleAvatarUpdate}
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
        <main className="flex-1 overflow-y-auto">
          {/* Indicador sutil de carregamento em transições subsequentes */}
          {(isPending || isLoadingRestaurant) && bootstrapped && (
            <div className="h-1 w-full bg-slate-100">
              <div className="h-1 bg-orange-500 animate-pulse w-1/2" />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
    </PasswordChangeProvider>
  )
}
