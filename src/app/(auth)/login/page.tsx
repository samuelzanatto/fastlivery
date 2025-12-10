'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth/auth-client'
import { notify } from '@/lib/notifications/notify'

// Variantes de animação definidas fora do componente
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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const router = useRouter()

  // Função para navegação com animação de saída
  const handleNavigation = (path: string) => {
    setIsExiting(true)
    setTimeout(() => {
      router.push(path)
    }, 800)
  }

  // Verificar se há mensagens de erro na URL sem useSearchParams
  useEffect(() => {
    // Pequeno delay para não interferir com as animações de entrada
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')
        const message = urlParams.get('message')
        
        if (error) {
          let errorMessage = 'Erro ao fazer login'
          
          switch (error) {
            case 'invalid_credentials':
              errorMessage = 'Email ou senha incorretos'
              break
            case 'account_not_found':
              errorMessage = 'Conta não encontrada'
              break
            case 'account_disabled':
              errorMessage = 'Conta desabilitada. Entre em contato com o suporte'
              break
            default:
              errorMessage = error
          }
          
          notify('error', errorMessage, { duration: 6000 })
          
          // Limpar a URL após mostrar o erro
          const url = new URL(window.location.href)
          url.searchParams.delete('error')
          url.searchParams.delete('message')
          window.history.replaceState({}, '', url.toString())
        }

        if (message) {
          notify('success', decodeURIComponent(message), { duration: 4000 })
          
          // Limpar a URL
          const url = new URL(window.location.href)
          url.searchParams.delete('message')
          window.history.replaceState({}, '', url.toString())
        }
      }
    }, 500) // Esperar 500ms antes de processar URL params

    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await signIn.email({
        email,
        password,
        callbackURL: '/dashboard'
      })

      if (error) {
        notify('error', error.message || 'Erro ao fazer login')
        setIsLoading(false)
        return
      }

      if (data) {
        notify('success', 'Login realizado com sucesso!')
        // Trigger exit animation before navigation
        handleNavigation('/dashboard')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
  notify('error', errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <motion.div 
      key="login-page"
      className="grid min-h-svh lg:grid-cols-2"
      initial="initial"
      animate={isExiting ? "exit" : "animate"}
      exit="exit"
      variants={fadeIn}
      transition={{ duration: 0.3 }}
    >
      {/* Formulário - Lado esquerdo */}
      <motion.div 
        className="flex flex-col gap-4 p-6 md:p-10"
        initial="initial"
        animate={isExiting ? "exit" : "animate"}
        variants={fadeInLeft}
        transition={{ duration: 0.8, delay: isExiting ? 0.1 : 0.1 }}
      >
        <div className="flex flex-1 items-center justify-center">
          <motion.div 
            className="w-full max-w-xs"
            initial="initial"
            animate={isExiting ? "exit" : "animate"}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: isExiting ? 0.2 : 0.1 }}
          >
            <div className="grid gap-6">
              <div className="grid gap-2 text-center">
                <h1 className="text-3xl font-bold">Entrar</h1>
                <p className="text-balance text-muted-foreground">
                  Digite seu email para acessar sua conta
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="grid gap-4">
                <motion.div 
                  className="grid gap-2"
                  initial="initial"
                  animate={isExiting ? "exit" : "animate"}
                  variants={fadeInUp}
                  transition={{ duration: 0.8, delay: isExiting ? 0.3 : 0.3 }}
                >
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </motion.div>
                
                <motion.div 
                  className="grid gap-2"
                  initial="initial"
                  animate={isExiting ? "exit" : "animate"}
                  variants={fadeInUp}
                  transition={{ duration: 0.8, delay: isExiting ? 0.4 : 0.4 }}
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline" onClick={() => handleNavigation('/forgot-password')}>
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
                
                <motion.div
                  initial="initial"
                  animate={isExiting ? "exit" : "animate"}
                  variants={fadeInUp}
                  transition={{ duration: 0.8, delay: isExiting ? 0.5 : 0.5 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </motion.div>
              </form>

              <motion.div 
                className="text-center mt-4"
                initial="initial"
                animate={isExiting ? "exit" : "animate"}
                variants={fadeIn}
                transition={{ duration: 0.8, delay: isExiting ? 0.7 : 0.7 }}
              >
                <button 
                  onClick={() => handleNavigation('/')}
                  className="text-xs text-muted-foreground hover:text-orange-600 transition-colors duration-200 inline-flex items-center gap-1"
                >
                  ← Voltar para a página inicial
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Imagem de fundo - Lado direito */}
      <motion.div 
        className="bg-muted relative hidden lg:block"
        initial="initial"
        animate={isExiting ? "exit" : "animate"}
        variants={fadeInRight}
        transition={{ duration: 0.8, delay: isExiting ? 0.1 : 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="absolute inset-0 bg-orange-500/5 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(249,115,22,0.1)_70%)]" />
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 max-w-md">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl w-16 h-16 mx-auto mb-6">
                <Zap className="w-full h-full text-white" />
              </div>
              <h2 className="text-2xl font-bold text-orange-900 mb-4">
                Administre sua Empresa
              </h2>
              <p className="text-orange-700 leading-relaxed">
                Acesse o painel administrativo para gerenciar pedidos, produtos, relatórios e muito mais.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
