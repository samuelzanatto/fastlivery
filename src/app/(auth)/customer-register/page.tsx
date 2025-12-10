'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Store, Eye, EyeOff, Mail, Chrome, User, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp, signIn } from '@/lib/auth/auth-client'
import { notify } from '@/lib/notifications/notify'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const slideIn = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, delay: 0.2 }
}

export default function CustomerRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  // Verificar se há mensagens na URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')
      const message = urlParams.get('message')
      
      if (error) {
        notify('error', decodeURIComponent(error), { duration: 6000 })
        
        const url = new URL(window.location.href)
        url.searchParams.delete('error')
        window.history.replaceState({}, '', url.toString())
      }

      if (message) {
        notify('success', decodeURIComponent(message), { duration: 4000 })
        
        const url = new URL(window.location.href)
        url.searchParams.delete('message')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [])

  const getCallbackURL = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const redirectTo = urlParams.get('redirectTo')
      return redirectTo ? decodeURIComponent(redirectTo) : '/'
    }
    return '/'
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (formData.password !== formData.confirmPassword) {
      notify('error', 'As senhas não coincidem')
      return
    }

    if (formData.password.length < 8) {
      notify('error', 'A senha deve ter pelo menos 8 caracteres')
      return
    }

    if (!formData.name.trim()) {
      notify('error', 'Por favor, informe seu nome')
      return
    }

    setIsLoading(true)

    const callbackURL = getCallbackURL()

    try {
      const { data, error } = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        callbackURL
      })

      if (error) {
        notify('error', error.message || 'Erro ao criar conta')
        setIsLoading(false)
        return
      }

      if (data) {
        notify('success', 'Conta criada com sucesso! Você já pode fazer seus pedidos.')
        router.push(callbackURL)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      notify('error', errorMessage)
      setIsLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true)
    
    const callbackURL = getCallbackURL()
    
    try {
      const { data, error } = await signIn.social({
        provider: 'google',
        callbackURL
      })

      if (error) {
        notify('error', 'Erro no cadastro com Google')
        setIsGoogleLoading(false)
        return
      }

      if (data) {
        try {
          await fetch('/api/auth/callback/security-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })
        } catch (checkError) {
          console.warn('[SECURITY] Failed to run security check:', checkError)
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no cadastro com Google'
      notify('error', errorMessage)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Column - Register Form */}
        <div className="flex items-center justify-center p-8">
          <motion.div 
            className="w-full max-w-md space-y-8"
            {...fadeIn}
          >
            {/* Back Button */}
            <Link 
              href="/customer-login" 
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao login</span>
            </Link>

            {/* Logo and Title */}
            <div className="text-center">
              <motion.div 
                className="flex items-center justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Store className="h-12 w-12 text-orange-500" />
              </motion.div>
              <h1 className="text-3xl font-bold text-slate-800">FastLivery</h1>
              <p className="text-slate-600 mt-2">Crie sua conta de cliente</p>
            </div>

            {/* Register Form */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="text-center text-xl text-slate-800">
                  Criar nova conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Google Register Button */}
                <motion.div {...slideIn}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-slate-300 hover:bg-slate-50 transition-colors"
                    onClick={handleGoogleRegister}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-b-transparent"></div>
                        <span>Conectando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Chrome className="h-5 w-5 text-blue-600" />
                        <span className="text-slate-700">Cadastrar com Google</span>
                      </div>
                    )}
                  </Button>
                </motion.div>

                <div className="flex items-center gap-4">
                  <Separator className="flex-1" />
                  <span className="text-sm text-slate-500 px-2">ou</span>
                  <Separator className="flex-1" />
                </div>

                {/* Email/Password Form */}
                <motion.form 
                  onSubmit={handleEmailRegister} 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Seu nome"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="pl-10 h-12 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="pl-10 h-12 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={8}
                        className="pr-10 h-12 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-700">Confirmar senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repita a senha"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        minLength={8}
                        className="pr-10 h-12 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 transition-colors text-white font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                        <span>Criando conta...</span>
                      </div>
                    ) : (
                      'Criar minha conta'
                    )}
                  </Button>
                </motion.form>

                {/* Login Link */}
                <motion.div 
                  className="text-center space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <p className="text-sm text-slate-600">
                    Já tem uma conta?{' '}
                    <Link 
                      href="/customer-login" 
                      className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
                    >
                      Fazer login
                    </Link>
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Brand Section */}
        <motion.div 
          className="hidden lg:flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Decorative circles */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-lg"></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white/10 rounded-full blur-md"></div>
          
          <div className="text-center text-white z-10 px-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <Store className="h-24 w-24 mx-auto mb-6 text-white/90" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-4xl font-bold mb-4">
                Junte-se a nós!
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-md">
                Crie sua conta e aproveite a melhor experiência de delivery da região.
              </p>
              <div className="flex items-center justify-center space-x-8 text-white/80">
                <div className="text-center">
                  <div className="text-2xl font-bold">🚀</div>
                  <div className="text-sm">Pedidos Rápidos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">💳</div>
                  <div className="text-sm">Pagamento Fácil</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">📍</div>
                  <div className="text-sm">Entrega Rastreada</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
