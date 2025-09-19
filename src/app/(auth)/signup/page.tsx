'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Input as FormattedInput } from '@/components/ui/input-formatted'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PasswordStrength, usePasswordStrength } from '@/components/ui/password-strength'
import { ModernEmailOtpVerification } from '@/components/modern-email-otp-verification'
import { 
  Zap, 
  Eye, 
  EyeOff, 
  Check, 
  CreditCard, 
  Loader2,
  Phone,
  User,
  Building,
  AlertTriangle,
  Mail
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { PlanInfo } from '@/lib/subscription-service'
// Fluxo público não usa auth-client diretamente

// Interfaces de tipos
interface PlanLimits {
  orders: number | string
  products: number | string 
  tables: number | string
  admins: number | string
}

interface Plan {
  id: string
  name: string
  price: number
  stripePriceId: string
  description: string
  limits: PlanLimits
  features: string[]
  popular?: boolean
  planKey?: string
}

function SignupPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Estados do usuário
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Estados do restaurante
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantPhone, setRestaurantPhone] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [restaurantNumber, setRestaurantNumber] = useState('')
  const [restaurantNeighborhood, setRestaurantNeighborhood] = useState('')
  const [restaurantCity, setRestaurantCity] = useState('')
  const [restaurantState, setRestaurantState] = useState('')
  const [restaurantCep, setRestaurantCep] = useState('')
  const [category, setCategory] = useState('restaurant')
  
  // Estados de controle
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [isLoading, setIsLoading] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  
  // Estados de verificação de email
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  
  // Novo estado para planos dinâmicos
  const [dynamicPlans, setDynamicPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState<string | null>(null)
  
  // Hook de validação de força da senha
  const { isValid: isPasswordValid } = usePasswordStrength(password)

  // Função para navegação com animação de saída
  const handleNavigation = (path: string) => {
    setIsExiting(true)
    setTimeout(() => {
      router.push(path)
    }, 800)
  }

  // Variantes de animação consistentes
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const fadeInLeft = {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  }

  const fadeInRight = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  }

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }

  // Função para buscar planos dinâmicos do Stripe (usada no "Tentar novamente")
  const fetchDynamicPlans = useCallback(async () => {
    setPlansLoading(true)
    setPlansError(null)
    
    try {
      const response = await fetch('/api/subscription/plans')
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar planos: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.plans && data.plans.length > 0) {
        const convertedPlans = data.plans.map((planInfo: PlanInfo) => ({
          id: planInfo.id,
          name: planInfo.name,
          price: planInfo.price / 100,
          stripePriceId: planInfo.stripePriceId,
          description: planInfo.description,
          limits: {
            orders: planInfo.limits.maxOrders === -1 ? 'unlimited' : planInfo.limits.maxOrders,
            products: planInfo.limits.maxProducts === -1 ? 'unlimited' : planInfo.limits.maxProducts,
            tables: planInfo.limits.maxTables === -1 ? 'unlimited' : planInfo.limits.maxTables,
            admins: planInfo.limits.maxUsers === -1 ? 'unlimited' : planInfo.limits.maxUsers
          },
          planKey: planInfo.id,
          popular: planInfo.id === 'pro'
        }))
        setDynamicPlans(convertedPlans)
      } else {
        throw new Error('Nenhum plano disponível no momento')
      }
    } catch (error) {
      console.error('Erro ao carregar planos dinâmicos:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao carregar planos'
      setPlansError(errorMessage)
      setDynamicPlans([])
      toast.error(errorMessage)
    } finally {
      setPlansLoading(false)
    }
  }, [])

  // Carregar planos dinâmicos ao montar o componente
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const loadPlans = async () => {
      try {
        setPlansLoading(true)
        setPlansError(null)
        
        // Definir timeout
        timeoutId = setTimeout(() => {
          console.log('⏰ Timeout de carregamento de planos')
          setPlansLoading(false)
          setPlansError('Timeout: Os planos estão demorando muito para carregar')
          setDynamicPlans([])
        }, 15000) // 15 segundos
        
        const response = await fetch('/api/subscription/plans')
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar planos: ${response.status}`)
        }

        const data = await response.json()
        
        console.log('🔍 API Response:', data)
        console.log('🔍 Plans from API:', data.plans)
        
        if (data.plans && data.plans.length > 0) {
          console.log(`🔍 Converting ${data.plans.length} plans`)
          const convertedPlans = data.plans.map((planInfo: PlanInfo) => ({
            id: planInfo.id,
            name: planInfo.name,
            price: planInfo.price / 100,
            stripePriceId: planInfo.stripePriceId,
            description: planInfo.description,
            limits: {
              orders: planInfo.limits.maxOrders === -1 ? 'unlimited' : planInfo.limits.maxOrders,
              products: planInfo.limits.maxProducts === -1 ? 'unlimited' : planInfo.limits.maxProducts,
              tables: planInfo.limits.maxTables === -1 ? 'unlimited' : planInfo.limits.maxTables,
              admins: planInfo.limits.maxUsers === -1 ? 'unlimited' : planInfo.limits.maxUsers
            },
            planKey: planInfo.id,
            popular: planInfo.id === 'pro'
          }))
          
          console.log('🔍 Converted plans:', convertedPlans)
          console.log('🔍 Number of converted plans:', convertedPlans.length)
          
          setDynamicPlans(convertedPlans)
          
          // Limpar timeout se sucesso
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
        } else {
          throw new Error('Nenhum plano disponível no momento')
        }
      } catch (error) {
        console.error('Erro ao carregar planos dinâmicos:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao carregar planos'
        setPlansError(errorMessage)
        setDynamicPlans([])
        toast.error(errorMessage)
      } finally {
        setPlansLoading(false)
      }
    }
    
    loadPlans()
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, []) // Executa apenas uma vez ao montar

  // UseEffect separado para selecionar automaticamente o primeiro plano
  useEffect(() => {
    if (dynamicPlans.length > 0) {
      const currentSelectedExists = dynamicPlans.some((p: Plan) => p.id === selectedPlan)
      if (!currentSelectedExists) {
        setSelectedPlan(dynamicPlans[0].id)
        console.log('🔄 Plano selecionado automaticamente:', dynamicPlans[0].id)
      }
    }
  }, [dynamicPlans, selectedPlan])

  // Verificar se há erros na URL
  useEffect(() => {
    const error = searchParams.get('error')
    const details = searchParams.get('details')
    
    if (error) {
      let errorMessage = 'Ocorreu um erro inesperado'
      
      switch (error) {
        case 'payment_failed':
          errorMessage = 'Pagamento não foi concluído. Tente novamente.'
          break
        case 'signup_failed':
          errorMessage = details ? decodeURIComponent(details) : 'Erro ao criar conta. Tente novamente.'
          break
        case 'verification_failed':
          errorMessage = 'Erro ao verificar pagamento. Entre em contato com o suporte.'
          break
        default:
          errorMessage = error
      }
      
      toast.error(errorMessage, { duration: 6000 })
      
      // Limpar a URL após mostrar o erro
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      url.searchParams.delete('details')
      window.history.replaceState({}, '', url.toString())
    }

    const cancelled = searchParams.get('cancelled')
    if (cancelled) {
      toast('Pagamento cancelado. Você pode tentar novamente.', { 
        icon: 'ℹ️',
        duration: 4000 
      })
      
      // Limpar a URL
      const url = new URL(window.location.href)
      url.searchParams.delete('cancelled')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // Verificar plano selecionado via URL
  useEffect(() => {
    const planFromUrl = searchParams.get('plan')
    if (planFromUrl && ['starter', 'pro', 'enterprise'].includes(planFromUrl)) {
      setSelectedPlan(planFromUrl)
    }
  }, [searchParams])

  // Função utilitária para gerar features baseadas nos limites
  const generateFeatures = (planKey: string, limits: PlanLimits | null) => {
    const baseFeatures: { [key: string]: string[] } = {
      starter: [
        'Dashboard básico',
        'Relatórios simples',
        'Suporte por email'
      ],
      pro: [
        'Tudo do Starter',
        'App PWA personalizado',
        'Pagamentos via Stripe',
        'Relatórios avançados',
        'Integração WhatsApp',
        'Suporte prioritário 24/7',
        'Backup automático'
      ],
      enterprise: [
        'Tudo do Pro',
        'Multi-restaurantes',
        'API personalizada',
        'White label completo',
        'Integração ERP/POS',
        'Gerente de conta dedicado',
        'SLA de 99.9% uptime'
      ]
    }

    const features = [...(baseFeatures[planKey] || [])]
    
    // Adicionar features baseadas nos limites
    if (limits) {
      if (limits.orders === 'unlimited') {
        features.push('Pedidos ilimitados')
      } else if (limits.orders) {
        features.push(`Até ${limits.orders} pedidos/mês`)
      }

      if (limits.products === 'unlimited') {
        features.push('Produtos ilimitados no cardápio')
      } else if (limits.products) {
        features.push(`Até ${limits.products} produtos no cardápio`)
      }

      if (limits.tables === 'unlimited') {
        features.push('Mesas ilimitadas com QR Code')
      } else if (limits.tables) {
        features.push(`Até ${limits.tables} mesas com QR Code`)
      }
    }

    return features
  }

  // Usar apenas planos dinâmicos (sem fallback) com deduplicação
  const plans = dynamicPlans
    .filter((plan, index, self) => index === self.findIndex(p => p.id === plan.id))
    .map(plan => ({
      ...plan,
      features: generateFeatures(plan.planKey || plan.id, plan.limits)
    }))

  // Debug logs temporários
  console.log('🔍 DynamicPlans state:', dynamicPlans)
  console.log('🔍 Final plans after processing:', plans)
  console.log('🔍 Plan count:', plans.length)

  const handleSubmit = async () => {
    if (!name || !email || !password || !restaurantName || !restaurantPhone || 
        !restaurantAddress || !restaurantNumber || !restaurantNeighborhood || 
        !restaurantCity || !restaurantState || !restaurantCep) {
      toast.error('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (!isPasswordValid) {
      toast.error('A senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número')
      return
    }

    // Verificação obrigatória de email
    if (!isEmailVerified) {
      toast.error('Você precisa verificar seu email antes de continuar')
      handleStartEmailVerification()
      return
    }

    // Verificar se há um plano válido selecionado
    const selectedPlanData = plans.find(p => p.id === selectedPlan)
    if (!selectedPlanData) {
      toast.error('Por favor, selecione um plano válido ou aguarde o carregamento dos planos')
      return
    }

    setIsLoading(true)
    
    const loadingToast = toast.loading('Preparando pagamento...')

    const fullAddress = `${restaurantAddress}, ${restaurantNumber} - ${restaurantNeighborhood}, ${restaurantCity}/${restaurantState} - ${restaurantCep}`

  try {
      // Obter plano selecionado
      const plan = plans.find(p => p.id === selectedPlan)
      if (!plan) throw new Error('Plano não encontrado')

      // Novo fluxo: NADA é criado antes do pagamento. Iniciamos uma sessão de checkout pública.
      const res = await fetch('/api/checkout/public/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.id,
          email,
          name,
          restaurantName,
          restaurantPhone,
          restaurantAddress: fullAddress,
          category,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Falha ao iniciar checkout')
      }

      // Guardar a senha temporariamente vinculada à sessão do Stripe
      try {
        if (typeof window !== 'undefined' && data.id) {
          const key = `signup:pwd:${data.id}`
          sessionStorage.setItem(key, password)
          console.log('[Signup] Senha salva no sessionStorage com key:', key)
          console.log('[Signup] Verificando se foi salva:', !!sessionStorage.getItem(key))
        }
      } catch {}

      toast.success('Redirecionando para pagamento...', { id: loadingToast })
      
      // Trigger exit animation before redirect
      setIsExiting(true)
      
      setTimeout(() => {
        window.location.href = data.url
      }, 800) // Match other pages timeout
      return
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      toast.error(errorMessage, { id: loadingToast })
      setIsLoading(false)
    }
  }

  const selectedPlanData = plans.find(p => p.id === selectedPlan)

  // Função para iniciar verificação de email
  const handleStartEmailVerification = async () => {
    if (!email) {
      toast.error('Por favor, digite seu email primeiro')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Por favor, digite um email válido')
      return
    }

    // Enviar OTP antes de abrir o dialog
    const loadingToast = toast.loading('Enviando código de verificação...')
    
    try {
      const response = await fetch('/api/signup/send-verification-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao enviar código')
      }

      toast.success('Código enviado para seu email!', { id: loadingToast })
      setShowEmailVerification(true)
      
    } catch (error) {
      console.error('Erro ao enviar OTP:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar código', { id: loadingToast })
    }
  }

  // Função chamada quando email é verificado com sucesso
  const handleEmailVerified = () => {
    setIsEmailVerified(true)
    setShowEmailVerification(false)
    toast.success('Email verificado! Agora você pode finalizar seu cadastro.')
  }

  // Função para voltar da verificação
  const handleBackFromVerification = () => {
    setShowEmailVerification(false)
  }

  return (
    <>
      {/* Modal/Overlay de Verificação de Email */}
      <ModernEmailOtpVerification
        open={showEmailVerification}
        email={email}
        onVerified={handleEmailVerified}
        onBack={handleBackFromVerification}
        title="Verificar Email"
        description="Digite o código de 6 dígitos enviado para seu email"
        sendEndpoint="/api/signup/send-verification-otp"
        verifyEndpoint="/api/signup/verify-verification-otp"
        verificationType="signup"
        autoSend={false}
      />

      <motion.div 
        className="min-h-screen bg-white"
        initial="initial"
        animate={isExiting ? "exit" : "animate"}
        exit="exit"
        variants={fadeIn}
        transition={{ duration: 0.3 }}
      > 
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-8"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.1 : 0 }}
          >
            <motion.div 
              className="flex items-center justify-center mb-4"
              initial="initial"
              animate={isExiting ? "exit" : "animate"}
              variants={fadeIn}
              transition={{ duration: 0.8, delay: isExiting ? 0.2 : 0.2 }}
            >
              <Zap className="h-8 w-8 text-orange-500" />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-800">ZapLivery</h1>
            <p className="text-slate-600 mt-2">Comece seu negócio digital hoje</p>
          </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulário - 2 colunas */}
          <motion.div 
            className="lg:col-span-2"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInLeft}
            transition={{ duration: 0.8, delay: isExiting ? 0.3 : 0.3 }}
          >
            <Card className="border-1 shadow-xl h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Criar sua conta
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Dados Pessoais */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Seus dados
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center justify-between">
                          <span>Email *</span>
                          {isEmailVerified && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Check className="h-3 w-3 mr-1" />
                              Verificado
                            </Badge>
                          )}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={isEmailVerified ? "border-green-200 bg-green-50" : ""}
                          />
                          <Button
                            type="button"
                            variant={isEmailVerified ? "outline" : "default"}
                            onClick={handleStartEmailVerification}
                            disabled={!email || isEmailVerified}
                            className={isEmailVerified ? "bg-green-50 border-green-200 text-green-700" : "bg-blue-600 hover:bg-blue-700"}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                        {!isEmailVerified && (
                          <p className="text-xs text-amber-600">
                            ⚠️ Você deve verificar seu email antes de continuar
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Digite uma senha segura"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {/* Componente de força da senha */}
                      <PasswordStrength password={password} className="mt-3" />
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Restaurante */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Dados do seu negócio
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="restaurantName">Nome do restaurante *</Label>
                        <Input
                          id="restaurantName"
                          type="text"
                          placeholder="Ex: Pizzaria do João"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="restaurantPhone">
                            <Phone className="h-4 w-4 inline mr-1" />
                            Telefone *
                          </Label>
                          <FormattedInput
                            id="restaurantPhone"
                            formatter="phone"
                            placeholder="(11) 99999-9999"
                            value={restaurantPhone}
                            onChange={(e) => setRestaurantPhone(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Categoria</Label>
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="restaurant">Restaurante</SelectItem>
                              <SelectItem value="pizzaria">Pizzaria</SelectItem>
                              <SelectItem value="lanchonete">Lanchonete</SelectItem>
                              <SelectItem value="hamburgueria">Hamburgueria</SelectItem>
                              <SelectItem value="confeitaria">Confeitaria</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="restaurantCep">CEP *</Label>
                          <FormattedInput
                            id="restaurantCep"
                            formatter="cep"
                            placeholder="12345-678"
                            value={restaurantCep}
                            onChange={(e) => setRestaurantCep(e.target.value)}
                            onAddressFound={(addressData) => {
                              setRestaurantAddress(addressData.address)
                              setRestaurantNeighborhood(addressData.neighborhood)
                              setRestaurantCity(addressData.city)
                              setRestaurantState(addressData.state)
                            }}
                            required
                          />
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="restaurantAddress">Endereço *</Label>
                            <Input
                              id="restaurantAddress"
                              placeholder="Rua das Flores"
                              value={restaurantAddress}
                              onChange={(e) => setRestaurantAddress(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="restaurantNumber">Número *</Label>
                            <Input
                              id="restaurantNumber"
                              placeholder="123"
                              value={restaurantNumber}
                              onChange={(e) => setRestaurantNumber(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="restaurantNeighborhood">Bairro *</Label>
                            <Input
                              id="restaurantNeighborhood"
                              placeholder="Centro"
                              value={restaurantNeighborhood}
                              onChange={(e) => setRestaurantNeighborhood(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="restaurantCity">Cidade *</Label>
                            <Input
                              id="restaurantCity"
                              placeholder="São Paulo"
                              value={restaurantCity}
                              onChange={(e) => setRestaurantCity(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="restaurantState">Estado *</Label>
                            <Input
                              id="restaurantState"
                              placeholder="SP"
                              value={restaurantState}
                              onChange={(e) => setRestaurantState(e.target.value)}
                              maxLength={2}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Link para login - no final do card */}
                <div className="text-center mt-6 pt-6 border-t border-gray-100">
                  <p className="text-sm text-slate-600">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium">
                      Faça login
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Seleção de Planos - 1 coluna */}
          <motion.div 
            className="space-y-6"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInRight}
            transition={{ duration: 0.8, delay: isExiting ? 0.4 : 0.4 }}
          >
            <Card className="border-1 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {searchParams.get('plan') ? 
                    `Confirmando plano ${plans.find(p => p.id === selectedPlan)?.name}` :
                    'Escolha seu plano'
                  }
                </CardTitle>
                {searchParams.get('plan') && (
                  <div className="text-xs text-gray-600">
                    <Link href="/signup" className="text-orange-600 hover:underline">
                      Alterar plano
                    </Link>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {plansLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <span className="ml-2 text-sm text-gray-600">Carregando planos...</span>
                  </div>
                ) : plansError || plans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Erro ao carregar planos
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 max-w-md">
                      {plansError || 'Não foi possível carregar os planos de assinatura. Verifique sua conexão e tente novamente.'}
                    </p>
                    <Button
                      onClick={() => fetchDynamicPlans()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  plans.map((plan, planIndex) => (
                    <div
                      key={`${plan.id}-${planIndex}`}
                    className={`relative border rounded-lg p-3 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-3 bg-orange-500 text-xs">
                        Popular
                      </Badge>
                    )}
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={selectedPlan === plan.id}
                          onChange={() => setSelectedPlan(plan.id)}
                          className="text-orange-500"
                        />
                        <div>
                          <h3 className="font-semibold text-sm">{plan.name}</h3>
                          <p className="text-lg font-bold text-orange-600">
                            R$ {plan.price.toFixed(2)}
                            <span className="text-xs text-gray-500 font-normal">/mês</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {plan.features.slice(0, 3).map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{plan.features.length - 3} recursos
                        </p>
                      )}
                    </div>
                  </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Resumo */}
            {selectedPlanData && (
              <Card className="border-1 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Plano {selectedPlanData.name}</span>
                      <span className="text-sm">R$ {selectedPlanData.price.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>R$ {selectedPlanData.price.toFixed(2)}/mês</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Botão de Finalizar Cadastro - Abaixo dos planos */}
        <motion.div 
          className="mt-8"
          initial="initial"
          animate={isExiting ? "exit" : "animate"}
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: isExiting ? 0.5 : 0.5 }}
        >
          <Button 
            onClick={handleSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600 shadow-xl"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Finalizar Cadastro
              </>
            )}
          </Button>
        </motion.div>

        {/* Mini botão de voltar para landing */}
        <motion.div 
          className="text-center mt-4"
          initial="initial"
          animate={isExiting ? "exit" : "animate"}
          variants={fadeIn}
          transition={{ duration: 0.8, delay: isExiting ? 0.6 : 0.6 }}
        >
          <button 
            onClick={() => handleNavigation('/')}
            className="text-sm text-slate-600 hover:text-orange-600 transition-colors inline-flex items-center gap-1"
          >
            ← Voltar para página inicial
          </button>
        </motion.div>

        <motion.div 
          className="text-center mt-24"
          initial="initial"
          animate={isExiting ? "exit" : "animate"}
          variants={fadeIn}
          transition={{ duration: 0.8, delay: isExiting ? 0.7 : 0.7 }}
        >
          <p className="text-xs text-slate-500">
            Ao continuar, você concorda com nossos{' '}
            <Link href="/terms" className="underline">termos de serviço</Link> e{' '}
            <Link href="/privacy" className="underline">política de privacidade</Link>.
            Você pode cancelar a qualquer momento.
          </p>
        </motion.div>
        </div>
      </div>
    </motion.div>
    </> 
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-600">Carregando…</div>}>
      <SignupPageContent />
    </Suspense>
  )
}
