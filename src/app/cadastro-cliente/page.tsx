'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PWAHeader } from '@/components/pwa-header'
import { Store, Eye, EyeOff, Mail, User, Phone, Chrome } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp, signIn } from '@/lib/auth-client'
import toast from 'react-hot-toast'

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

  // Verificar se há mensagens na URL sem useSearchParams
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

    try {
      const { data, error } = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        callbackURL: '/'
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
            userType: 'CUSTOMER',
            customerMetadata: {
              source: 'direct_signup',
              preferences: {
                notifications: true,
                marketing: false
              }
            }
          })
        })

        toast.success('Conta criada com sucesso!')
        router.push('/')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      toast.error(errorMessage)
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    
    try {
      const { error } = await signIn.social({
        provider: 'google',
        callbackURL: '/' // Callback padrão para clientes
      })

      if (error) {
        toast.error('Erro no cadastro com Google')
        setIsGoogleLoading(false)
        return
      }

      // O redirecionamento será automático
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no cadastro com Google'
      toast.error(errorMessage)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PWAHeader 
        title="Criar Conta"
        showBackButton={true}
        showMenu={false}
        className="lg:hidden"
      />
      
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Store className="h-12 w-12 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">ZapLivery</h1>
            <p className="text-slate-600 mt-2">Crie sua conta de cliente</p>
          </div>

          <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-center">Cadastro de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Google Sign Up Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4 h-12 border-slate-300 hover:bg-slate-50"
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

            <div className="flex items-center gap-4 my-6">
              <Separator className="flex-1" />
              <span className="text-sm text-slate-500 px-2">ou</span>
              <Separator className="flex-1" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
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
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
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
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
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
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="w-full bg-orange-500 hover:bg-orange-600 h-12"
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
            </form>

            <div className="mt-6 space-y-3 text-center">
              <p className="text-sm text-slate-600">
                Já tem uma conta?{' '}
                <Link 
                  href="/customer-login" 
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Fazer login
                </Link>
              </p>
              
              <p className="text-xs text-slate-500 mt-4">
                Ao criar uma conta, você concorda com nossos{' '}
                <Link href="/termos" className="underline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link href="/privacidade" className="underline">
                  Política de Privacidade
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  )
}
