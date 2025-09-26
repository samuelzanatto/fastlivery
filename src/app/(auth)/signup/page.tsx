'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Zap, 
  ArrowRight,
  Check,
  ShoppingCart,
  Package
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const companyTypes = [
  {
    id: 'delivery_company',
    title: 'Empresa de Delivery',
    description: 'Restaurante, pizzaria, lanchonete ou qualquer negócio que entrega produtos aos clientes',
    icon: ShoppingCart,
    color: 'bg-orange-100 text-orange-600 border-orange-200',
    hoverColor: 'hover:bg-orange-50 hover:border-orange-300',
    features: [
      'Cardápio digital personalizado',
      'Sistema de pedidos online',
      'Gestão de mesas com QR Code',
      'Relatórios de vendas',
      'App PWA para clientes',
      'Integração com pagamentos'
    ],
    examples: 'Restaurantes, pizzarias, lanchonetes, confeitarias, bares'
  },
  {
    id: 'supplier',
    title: 'Fornecedor B2B',
    description: 'Empresa que fornece produtos ou serviços para outros negócios através do marketplace B2B',
    icon: Package,
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    hoverColor: 'hover:bg-blue-50 hover:border-blue-300',
    features: [
      'Perfil no marketplace B2B',
      'Catálogo de produtos/serviços',
      'Gestão de parcerias',
      'Sistema de propostas',
      'Dashboard de leads',
      'Reviews e avaliações'
    ],
    examples: 'Distribuidoras, atacadistas, prestadores de serviços, indústrias'
  }
]

export default function CompanyTypePage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const router = useRouter()

  const handleContinue = () => {
    if (!selectedType) return
    
    setIsLoading(true)
    setIsExiting(true)
    
    setTimeout(() => {
      router.push(`/signup/form?type=${selectedType}`)
    }, 800)
  }

  const handleNavigation = (path: string) => {
    setIsExiting(true)
    setTimeout(() => {
      router.push(path)
    }, 800)
  }

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }

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

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100"
      initial="initial"
      animate={isExiting ? "exit" : "animate"}
      exit="exit"
      variants={fadeIn}
      transition={{ duration: 0.3 }}
    >
      <div className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div 
            className="text-center mb-12"
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
            <h1 className="text-4xl font-bold text-slate-800 mb-2">FastLivery</h1>
            <p className="text-xl text-slate-600 mb-2">Que tipo de empresa você representa?</p>
            <p className="text-sm text-slate-500">Vamos personalizar sua experiência de acordo com seu negócio</p>
          </motion.div>

          {/* Company Type Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {companyTypes.map((type, index) => {
              const Icon = type.icon
              const isSelected = selectedType === type.id
              const animationVariant = index === 0 ? fadeInLeft : fadeInRight
              
              return (
                <motion.div
                  key={type.id}
                  initial="initial"
                  animate={isExiting ? "exit" : "animate"}
                  variants={animationVariant}
                  transition={{ duration: 0.8, delay: isExiting ? 0.3 : 0.3 + index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-300 h-full relative overflow-hidden ${
                      isSelected 
                        ? `border-2 ${type.color} shadow-xl transform scale-105` 
                        : `border border-gray-200 hover:shadow-lg ${type.hoverColor}`
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                      <Icon className="w-full h-full" />
                    </div>
                    
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 rounded-lg ${type.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{type.title}</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-sm leading-relaxed">
                        {type.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-slate-700 mb-2">Principais recursos:</h4>
                          <ul className="space-y-1">
                            {type.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center gap-2 text-sm text-slate-600">
                                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-slate-500">
                            <strong>Exemplos:</strong> {type.examples}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.5 : 0.5 }}
          >
            <Button
              onClick={handleContinue}
              disabled={!selectedType || isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-base font-medium"
              size="lg"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Carregando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Back to Login */}
          <motion.div 
            className="text-center mt-8"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeIn}
            transition={{ duration: 0.8, delay: isExiting ? 0.6 : 0.6 }}
          >
            <p className="text-sm text-slate-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium">
                Faça login
              </Link>
            </p>
          </motion.div>

          {/* Back to Home */}
          <motion.div 
            className="text-center mt-4"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeIn}
            transition={{ duration: 0.8, delay: isExiting ? 0.7 : 0.7 }}
          >
            <button 
              onClick={() => handleNavigation('/')}
              className="text-sm text-slate-500 hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            >
              ← Voltar para página inicial
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}