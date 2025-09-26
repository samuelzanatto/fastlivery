'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Check, 
  Star, 
  Zap, 
  Crown, 
  Building2,
  BarChart3,
  Settings,
  Headphones,
  Shield,
  Sparkles
} from 'lucide-react'
import { SubscriptionPlan } from '@/actions/supplier-subscription-actions'
import { toast } from 'sonner'

interface SupplierPlanSelectorProps {
  plans: SubscriptionPlan[]
  currentPlan?: SubscriptionPlan | null
  onSelectPlan: (planId: string) => Promise<void>
  isLoading?: boolean
}

const planIcons = {
  STARTER: Star,
  GROWTH: Zap,
  PROFESSIONAL: Crown,
  ENTERPRISE: Building2
}

const planColors = {
  STARTER: 'from-blue-500 to-blue-600',
  GROWTH: 'from-purple-500 to-purple-600',
  PROFESSIONAL: 'from-amber-500 to-amber-600',
  ENTERPRISE: 'from-slate-700 to-slate-800'
}

const planFeatures = {
  STARTER: [
    'Dashboard básico com métricas essenciais',
    'Suporte por email',
    'Integração básica com API',
    'Relatórios mensais'
  ],
  GROWTH: [
    'Analytics avançado com insights',
    'Suporte prioritário',
    'API completa com webhooks',
    'Relatórios personalizáveis',
    'Integração com sistemas externos'
  ],
  PROFESSIONAL: [
    'White-label disponível',
    'Suporte dedicado',
    'Relatórios customizados',
    'Gerente de conta dedicado',
    'Dashboard premium',
    'Treinamento personalizado'
  ],
  ENTERPRISE: [
    'SLA garantido 99.9%',
    'Integração customizada',
    'Onboarding dedicado',
    'Suporte 24/7',
    'Arquitetura escalável',
    'Consultoria estratégica',
    'Desenvolvimento sob demanda'
  ]
}

export function SupplierPlanSelector({ 
  plans, 
  currentPlan, 
  onSelectPlan, 
  isLoading 
}: SupplierPlanSelectorProps) {
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  const handleSelectPlan = async (planId: string) => {
    if (processingPlan || isLoading) return

    try {
      setProcessingPlan(planId)
      await onSelectPlan(planId)
      toast.success('Plano selecionado com sucesso!')
    } catch (error) {
      console.error('Error selecting plan:', error)
      toast.error('Erro ao selecionar plano. Tente novamente.')
    } finally {
      setProcessingPlan(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100)
  }

  const isCurrentPlan = (planId: string) => currentPlan?.id === planId

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  // Ordenar planos por preço
  const sortedPlans = [...plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice)

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="text-center"
        initial="initial"
        animate="animate"
        variants={fadeIn}
      >
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          Escolha seu Plano de Fornecedor
        </h2>
        <p className="text-muted-foreground text-lg mb-6">
          Selecione o plano ideal para expandir seu negócio no marketplace
        </p>
        {currentPlan && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-700 font-medium">
              Plano atual: {currentPlan.name}
            </span>
          </div>
        )}
      </motion.div>

      {/* Plans Grid */}
      <motion.div 
        className="grid md:grid-cols-2 xl:grid-cols-4 gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {sortedPlans.map((plan, index) => {
          const Icon = planIcons[plan.planType]
          const isPopular = plan.planType === 'GROWTH'
          const isCurrent = isCurrentPlan(plan.id)
          const isProcessing = processingPlan === plan.id

          return (
            <motion.div key={plan.id} variants={fadeIn} transition={{ delay: index * 0.1 }}>
              <Card className={`relative h-full transition-all duration-300 hover:shadow-xl ${
                isCurrent ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-lg'
              } ${isPopular ? 'border-purple-200 bg-gradient-to-b from-purple-50 to-white' : ''}`}>
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1">
                      <Check className="h-3 w-3 mr-1" />
                      Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${planColors[plan.planType]} flex items-center justify-center mb-4`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <CardTitle className="text-xl">{plan.name.replace(' - Fornecedor', '')}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {plan.description}
                  </CardDescription>

                  {/* Price */}
                  <div className="mt-4">
                    <div className="text-3xl font-bold">
                      {formatPrice(plan.monthlyPrice)}
                    </div>
                    <div className="text-sm text-muted-foreground">por mês</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Limits */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Produtos:</span>
                      <span className="font-medium">
                        {plan.maxProducts ? plan.maxProducts : 'Ilimitados'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Parcerias:</span>
                      <span className="font-medium">
                        {plan.maxPartnerships ? plan.maxPartnerships : 'Ilimitadas'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Comissão:</span>
                      <span className="font-medium text-green-600">
                        {(plan.commissionRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recursos inclusos:</h4>
                    <ul className="space-y-1">
                      {planFeatures[plan.planType]?.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Premium features badges */}
                  <div className="flex flex-wrap gap-1">
                    {plan.prioritySupport && (
                      <Badge variant="secondary" className="text-xs">
                        <Headphones className="h-3 w-3 mr-1" />
                        Suporte
                      </Badge>
                    )}
                    {plan.advancedAnalytics && (
                      <Badge variant="secondary" className="text-xs">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Analytics
                      </Badge>
                    )}
                    {plan.apiAccess && (
                      <Badge variant="secondary" className="text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        API
                      </Badge>
                    )}
                    {plan.slaGuarantee && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        SLA 99.9%
                      </Badge>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'secondary' : isPopular ? 'default' : 'outline'}
                    disabled={isCurrent || isProcessing || isLoading}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {isProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                        />
                        Processando...
                      </>
                    ) : isCurrent ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Plano Atual
                      </>
                    ) : (
                      `Escolher ${plan.planType === 'STARTER' ? 'Starter' : 
                        plan.planType === 'GROWTH' ? 'Growth' :
                        plan.planType === 'PROFESSIONAL' ? 'Professional' : 'Enterprise'}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Feature comparison note */}
      <motion.div 
        className="text-center text-sm text-muted-foreground"
        initial="initial"
        animate="animate"
        variants={fadeIn}
        transition={{ delay: 0.4 }}
      >
        <p>Todos os planos incluem acesso ao marketplace, dashboard básico e suporte técnico.</p>
        <p className="mt-1">Você pode fazer upgrade ou downgrade a qualquer momento.</p>
      </motion.div>
    </div>
  )
}