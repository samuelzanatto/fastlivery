'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PWAHeader } from '@/components/pwa-header'
import { UserProfileSheet } from '@/components/user-profile-sheet'
import { DynamicPricingSection } from '@/components/dynamic-pricing-section'
import { 
  Zap, 
  Smartphone, 
  TrendingUp, 
  Users, 
  Star,
  ArrowRight,
  Shield,
  Clock
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { useRestaurantContext } from '@/hooks/useRestaurantContext'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const { data: session } = useSession()
  const { restaurant } = useRestaurantContext()
  const hasRestaurant = !!restaurant
  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)

  // Verificar se o usuário é admin/proprietário de restaurante
  const isRestaurantOwner = session?.user && hasRestaurant

  const handleAccessClick = () => {
    // Trigger exit animation for all components
    setIsExiting(true)
    
    setTimeout(() => {
      if (isRestaurantOwner) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }, 800) // Increased timeout to allow staggered animations
  }

  // Variantes de animação consistentes para entrada e saída
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const fadeInLeft = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  }

  const fadeInRight = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  }

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const fadeInUpStagger = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  // Array de características do produto
  const features = [
    {
      icon: Smartphone,
      title: "App Mobile Nativo",
      description: "Aplicativo otimizado para pedidos rápidos e fáceis"
    },
    {
      icon: TrendingUp,
      title: "Analytics Avançado", 
      description: "Insights detalhados sobre vendas e performance"
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      description: "CRM integrado para fidelização e remarketing"
    }
  ]

  const testimonials = [
    {
      name: "Carlos Silva",
      restaurant: "Pizzaria do Carlos",
      content: "Desde que começamos a usar o ZapLivery, nossas vendas por delivery aumentaram 300%. A plataforma é intuitiva e nossos clientes adoram!",
      rating: 5,
      image: "/api/placeholder/60/60"
    },
    {
      name: "Marina Santos",
      restaurant: "Burger House",
      content: "O sistema de gestão é fantástico. Conseguimos controlar estoque, pedidos e finanças tudo em um lugar só. Recomendo demais!",
      rating: 5,
      image: "/api/placeholder/60/60"
    },
    {
      name: "João Oliveira", 
      restaurant: "Sushi Zen",
      content: "A integração com redes sociais e o app próprio fizeram toda diferença. Nossos clientes agora pedem direto pelo WhatsApp!",
      rating: 5,
      image: "/api/placeholder/60/60"
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* PWA Header - Mobile First */}
      <PWAHeader 
        title="ZapLivery" 
        showBackButton={false}
        showMenu={true}
        menuType="landing"
        isStatic={true}
        scrollBlur={true}
        className="lg:hidden" // Esconder em desktop
      />

      {/* Desktop Header - Hidden on mobile */}
      <header className="hidden lg:block sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInLeft}
            transition={{ duration: 0.6 }}
            className="flex items-center space-x-2"
          >
            <Zap className="h-8 w-8 text-orange-500" />
            <span className="text-2xl font-bold text-slate-800">ZapLivery</span>
          </motion.div>
          
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInRight}
            transition={{ duration: 0.6, delay: isExiting ? 0.1 : 0 }}
            className="flex items-center space-x-6"
          >
            <a href="#features" className="text-slate-600 hover:text-orange-500 transition-colors">
              Recursos
            </a>
            <a href="#pricing" className="text-slate-600 hover:text-orange-500 transition-colors">
              Preços
            </a>
            <a href="#testimonials" className="text-slate-600 hover:text-orange-500 transition-colors">
              Depoimentos
            </a>
            <Button onClick={handleAccessClick} className="bg-orange-500 hover:bg-orange-600">
              {isRestaurantOwner ? 'Acessar Dashboard' : 'Começar Agora'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto mt-12 px-4 py-12 lg:py-20 text-center">
        <motion.div
          initial="initial"
          animate={isExiting ? "exit" : "animate"}
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: isExiting ? 0.2 : 0.2 }}
        >
          <Badge className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-200">
            🚀 Novo! Sistema completo de delivery
          </Badge>
          
          <motion.h1 
            className="text-4xl lg:text-6xl font-bold text-slate-800 mb-6 leading-tight"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.3 : 0.3 }}
          >
            Transforme seu restaurante em uma
            <span className="text-orange-500 block">máquina de vendas</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.4 : 0.4 }}
          >
            Plataforma completa de delivery com app próprio, gestão inteligente e integração com WhatsApp. 
            Aumente suas vendas em até <strong className="text-orange-600">300%</strong>.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.5 : 0.5 }}
          >
            <Button 
              onClick={handleAccessClick}
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Zap className="h-5 w-5 mr-2" />
              {isRestaurantOwner ? 'Acessar Dashboard' : 'Começar Agora'}
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-4 text-lg font-semibold border-2 border-slate-300 hover:border-orange-500 hover:text-orange-500"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Recursos
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </motion.div>
          
          <motion.p 
            className="mt-6 text-sm text-slate-500"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeIn}
            transition={{ duration: 0.8, delay: isExiting ? 0.6 : 0.6 }}
          >
            ✨ Sistema completo • Sem compromisso • Cancele quando quiser
          </motion.p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.1 : 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              Tudo que seu restaurante precisa
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Sistema completo para transformar seu negócio e multiplicar suas vendas
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial="initial"
                animate={isExiting ? "exit" : "animate"}
                variants={fadeInUpStagger}
                transition={{ 
                  delay: isExiting ? (index * 0.05) + 0.2 : index * 0.1, 
                  duration: 0.6 
                }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
                  <CardContent className="p-8">
                    <feature.icon className="h-12 w-12 text-orange-500 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <DynamicPricingSection 
        isExiting={isExiting}
        onActionClick={handleAccessClick}
      />

      {/* Garantia */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ delay: isExiting ? 0.55 : 0.4, duration: 0.8 }}
            className="text-center"
          >
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                Todos os planos incluem:
              </h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <Shield className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-800 mb-2">Segurança Total</h4>
                  <p className="text-sm text-slate-600">SSL, backup diário e conformidade LGPD</p>
                </div>
                
                <div className="text-center">
                  <Clock className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-800 mb-2">Sistema Completo</h4>
                  <p className="text-sm text-slate-600">Tudo integrado em uma plataforma</p>
                </div>
                
                <div className="text-center">
                  <Users className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-800 mb-2">Suporte Dedicado</h4>
                  <p className="text-sm text-slate-600">Time especializado em delivery</p>
                </div>
                
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-800 mb-2">ROI Garantido</h4>
                  <p className="text-sm text-slate-600">Ou devolvemos seu dinheiro</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.6 : 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              Nossos clientes amam o ZapLivery
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Veja o que restaurantes como o seu estão dizendo
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial="initial"
                animate={isExiting ? "exit" : "animate"}
                variants={fadeInUpStagger}
                transition={{ 
                  delay: isExiting ? (index * 0.05) + 0.65 : index * 0.1, 
                  duration: 0.6 
                }}
              >
                <Card className="h-full bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    
                    <p className="text-slate-600 mb-6 italic leading-relaxed">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                    
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-orange-600 font-bold text-lg">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{testimonial.name}</h4>
                        <p className="text-sm text-slate-500">{testimonial.restaurant}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-orange-500 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.8 : 0 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Pronto para revolucionar seu delivery?
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de restaurantes que já transformaram seu negócio
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={handleAccessClick}
                size="lg"
                className="bg-white text-orange-500 hover:bg-orange-50 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Zap className="h-5 w-5 mr-2" />
                {isRestaurantOwner ? 'Acessar Dashboard' : 'Começar Agora'}
              </Button>
            </div>
            
            <p className="mt-6 text-orange-100">
              ⚡ Setup em 5 minutos • 💳 Suporte completo • 🚀 Resultados garantidos
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <Zap className="h-8 w-8 text-orange-500" />
                <span className="text-2xl font-bold">ZapLivery</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                A plataforma completa para transformar seu restaurante em uma máquina de vendas digitais.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-slate-300">
                <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-slate-300">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-300">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; 2024 ZapLivery. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* User Profile Sheet - Global */}
      <UserProfileSheet />
    </div>
  )
}
