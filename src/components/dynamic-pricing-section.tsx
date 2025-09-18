'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, AlertTriangle, Loader2 } from 'lucide-react'
import { useDynamicPlans, type DynamicPlan } from '@/hooks/use-dynamic-plans'

interface DynamicPricingSectionProps {
  isExiting: boolean
  onActionClick: () => void
}

// Função para formatar preço
const formatPrice = (priceInCents: number) => {
  return (priceInCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Função para gerar características baseadas nos limites
const generateFeatures = (plan: DynamicPlan) => {
  const features: string[] = []
  
  if (plan.limits.maxOrders === -1) {
    features.push('Pedidos ilimitados')
  } else {
    features.push(`Até ${plan.limits.maxOrders} pedidos/mês`)
  }
  
  if (plan.limits.maxProducts === -1) {
    features.push('Produtos ilimitados')
  } else {
    features.push(`${plan.limits.maxProducts} produtos`)
  }
  
  if (plan.limits.maxTables === -1) {
    features.push('Mesas ilimitadas')
  } else {
    features.push(`${plan.limits.maxTables} mesas`)
  }
  
  if (plan.limits.maxUsers === -1) {
    features.push('Usuários ilimitados')
  } else {
    features.push(`${plan.limits.maxUsers} usuários`)
  }
  
  if (plan.limits.hasAdvancedAnalytics) {
    features.push('Analytics avançado')
  }
  
  if (plan.limits.hasPrioritySupport) {
    features.push('Suporte prioritário')
  } else {
    features.push('Suporte por email')
  }
  
  if (plan.limits.hasCustomBranding) {
    features.push('White label completo')
  }
  
  return features
}

// Função para determinar se é o plano mais popular (Pro)
const isPopularPlan = (plan: DynamicPlan) => {
  return plan.id === 'pro'
}

// Função para determinar o texto do botão
const getButtonText = (plan: DynamicPlan) => {
  if (plan.id === 'enterprise') {
    return 'Falar com Vendas'
  }
  return 'Começar Agora'
}

// Função para determinar a descrição do plano
const getPlanDescription = (plan: DynamicPlan) => {
  switch (plan.id) {
    case 'basic':
      return 'Perfeito para começar'
    case 'pro':
      return 'Para restaurantes em crescimento'
    case 'enterprise':
      return 'Para grandes operações'
    default:
      return plan.description
  }
}

export function DynamicPricingSection({ isExiting, onActionClick }: DynamicPricingSectionProps) {
  const { plans, isLoading, error, refetch } = useDynamicPlans()

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const fadeInUpStagger = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  if (isLoading) {
    return (
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.3 : 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Escolha o plano ideal para o tamanho do seu negócio
            </p>
          </motion.div>

          <div className="flex justify-center">
            <Card className="p-8 max-w-md mx-auto">
              <CardContent className="flex flex-col items-center text-center">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Carregando planos...
                </h3>
                <p className="text-slate-600">
                  Buscando os melhores preços para você
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.3 : 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Escolha o plano ideal para o tamanho do seu negócio
            </p>
          </motion.div>

          <div className="flex justify-center">
            <Card className="p-8 max-w-md mx-auto border-red-200 bg-red-50">
              <CardContent className="flex flex-col items-center text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Erro ao carregar planos
                </h3>
                <p className="text-red-600 mb-4">
                  {error}
                </p>
                <Button 
                  onClick={refetch}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial="initial"
          animate={isExiting ? "exit" : "animate"}
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: isExiting ? 0.3 : 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
            Planos que cabem no seu bolso
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Escolha o plano ideal para o tamanho do seu negócio
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = isPopularPlan(plan)
            const features = generateFeatures(plan)
            const description = getPlanDescription(plan)
            const buttonText = getButtonText(plan)
            
            return (
              <motion.div
                key={plan.id}
                initial="initial"
                animate={isExiting ? "exit" : "animate"}
                variants={fadeInUpStagger}
                transition={{ delay: isExiting ? 0.4 + (index * 0.05) : 0.1 + (index * 0.1), duration: 0.6 }}
              >
                <Card className={`h-full border-2 relative transition-colors ${
                  isPopular 
                    ? 'border-orange-500 transform lg:scale-105 shadow-xl' 
                    : 'border-slate-200 hover:border-orange-300'
                }`}>
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-orange-500 text-white px-6 py-1">
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className={`text-center pb-8 ${isPopular ? 'pt-8' : ''}`}>
                    <CardTitle className="text-2xl font-bold text-slate-800 mb-2">
                      {plan.name.replace('ZapLivery ', '')}
                    </CardTitle>
                    <div className="mb-4">
                      <span className={`text-4xl font-bold ${isPopular ? 'text-orange-500' : 'text-slate-800'}`}>
                        R$ {formatPrice(plan.price)}
                      </span>
                      <span className="text-slate-600">/{plan.interval === 'month' ? 'mês' : 'ano'}</span>
                    </div>
                    <p className="text-slate-600">{description}</p>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-4 mb-8">
                      {features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full ${
                        isPopular 
                          ? 'bg-orange-500 hover:bg-orange-600' 
                          : 'bg-slate-800 hover:bg-slate-900'
                      }`}
                      onClick={onActionClick}
                    >
                      {buttonText}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
