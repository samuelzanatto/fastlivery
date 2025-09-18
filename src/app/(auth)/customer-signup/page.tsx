'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Store, Eye, EyeOff, Mail, User, Phone, Chrome } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp, signIn } from '@/lib/auth-client'
import toast from 'react-hot-toast'

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

export default function CustomerSignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
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
        toast.error(decodeURIComponent(error), { duration: 6000 })
        
        const url = new URL(window.location.href)
        url.searchParams.delete('error')
        window.history.replaceState({}, '', url.toString())
      }

      if (message) {
        toast.success(decodeURIComponent(message), { duration: 4000 })
        
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

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (formData.password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres')
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
        toast.error(error.message || 'Erro ao criar conta')
        setIsLoading(false)
        return
      }

      if (data) {
        // Atualizar campos adicionais via API
        await fetch('/api/user/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: formData.phone,
            userType: 'CUSTOMER'
          })
        })

        toast.success('Conta criada com sucesso!')
        router.push(callbackURL)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      toast.error(errorMessage)
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    
    const callbackURL = getCallbackURL()
    
    try {
      const { data, error } = await signIn.social({
        provider: 'google',
        callbackURL
      })

      if (error) {
        toast.error('Erro no cadastro com Google')
        setIsGoogleLoading(false)
        return
      }

      // SECURITY: Verificação adicional para usuários OAuth
      if (data) {
        try {
          await fetch('/api/auth/callback/security-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          console.log('[SECURITY] OAuth security check completed')
        } catch (checkError) {
          console.warn('[SECURITY] Failed to run security check:', checkError)
          // Não falhar o signup por conta da verificação
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no cadastro com Google'
      toast.error(errorMessage)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Column - Sign Up Form */}
        <div className="flex items-center justify-center p-8">
          <motion.div 
            className="w-full max-w-md space-y-8"
            {...fadeIn}
          >
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
              <h1 className="text-3xl font-bold text-slate-800">ZapLivery</h1>
              <p className="text-slate-600 mt-2">Crie sua conta de cliente</p>
            </div>

            {/* Sign Up Form */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="text-center text-xl text-slate-800">
                  Criar nova conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Google Sign Up Button */}
                <motion.div {...slideIn}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-slate-300 hover:bg-slate-50 transition-colors"
                    onClick={handleGoogleSignUp}
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
                        <span className="text-slate-700">Criar conta com Google</span>
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
                  onSubmit={handleEmailSignUp} 
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
                        placeholder="Seu nome completo"
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
                    <Label htmlFor="phone" className="text-slate-700">Telefone (opcional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={handleInputChange}
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
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                        placeholder="Digite a senha novamente"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="pr-10 h-12 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                      'Criar conta'
                    )}
                  </Button>
                </motion.form>

                {/* Login Link and Terms */}
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
                  
                  <p className="text-xs text-slate-500">
                    Ao criar uma conta, você concorda com nossos{' '}
                    <Link href="/termos" className="underline hover:text-slate-700 transition-colors">
                      Termos de Uso
                    </Link>{' '}
                    e{' '}
                    <Link href="/privacidade" className="underline hover:text-slate-700 transition-colors">
                      Política de Privacidade
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
                Junte-se ao ZapLivery!
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-md">
                Crie sua conta e tenha acesso aos melhores restaurantes da região com entregas rápidas e seguras.
              </p>
              <div className="flex flex-col space-y-4 text-white/90">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white/80 rounded-full"></div>
                  <span>Entrega rápida em até 30 minutos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white/80 rounded-full"></div>
                  <span>Acompanhamento em tempo real</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white/80 rounded-full"></div>
                  <span>Suporte 24/7 dedicado</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white/80 rounded-full"></div>
                  <span>Promoções exclusivas</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
