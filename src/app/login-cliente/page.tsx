'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PWAHeader } from '@/components/pwa-header'
import { Store, Eye, EyeOff, Mail, Chrome } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import toast from 'react-hot-toast'

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  // Verificar se há mensagens de erro na URL sem useSearchParams
  useEffect(() => {
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
          case 'oauth_error':
            errorMessage = 'Erro no login com Google. Tente novamente.'
            break
          default:
            errorMessage = error
        }
        
        toast.error(errorMessage, { duration: 6000 })
        
        // Limpar a URL após mostrar o erro
        const url = new URL(window.location.href)
        url.searchParams.delete('error')
        url.searchParams.delete('message')
        window.history.replaceState({}, '', url.toString())
      }

      if (message) {
        toast.success(decodeURIComponent(message), { duration: 4000 })
        
        // Limpar a URL
        const url = new URL(window.location.href)
        url.searchParams.delete('message')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await signIn.email({
        email,
        password,
        callbackURL: '/' // Redirecionar para página inicial (cliente)
      })

      if (error) {
        toast.error(error.message || 'Erro ao fazer login')
        setIsLoading(false)
        return
      }

      if (data) {
        toast.success('Login realizado com sucesso!')
        // Redirecionar baseado no tipo de usuário
        const urlParams = new URLSearchParams(window.location.search)
        const redirectUrl = urlParams.get('callbackUrl') || '/'
        router.push(redirectUrl)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      toast.error(errorMessage)
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    
    try {
      const { error } = await signIn.social({
        provider: 'google',
        callbackURL: '/' // Redirecionar para página inicial (cliente)
      })

      if (error) {
        toast.error('Erro no login com Google')
        setIsGoogleLoading(false)
        return
      }

      // O redirecionamento será automático
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no login com Google'
      toast.error(errorMessage)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PWAHeader 
        title="Login"
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
            <p className="text-slate-600 mt-2">Entre na sua conta de cliente</p>
          </div>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-center">Acesso de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
              {/* Google Login Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4 h-12 border-slate-300 hover:bg-slate-50"
                onClick={handleGoogleLogin}
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
                    <span className="text-slate-700">Continuar com Google</span>
                  </div>
                )}
              </Button>

              <div className="flex items-center gap-4 my-6">
                <Separator className="flex-1" />
                <span className="text-sm text-slate-500 px-2">ou</span>
                <Separator className="flex-1" />
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                      <span>Entrando...</span>
                    </div>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              <div className="mt-6 space-y-3 text-center">
                <p className="text-sm text-slate-600">
                  Esqueceu sua senha?{' '}
                  <Link 
                    href="/recuperar-senha" 
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Recuperar
                  </Link>
                </p>
                
                <Separator />
                
                <p className="text-sm text-slate-600">
                  Não tem uma conta?{' '}
                  <Link 
                    href="/customer-signup" 
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Criar conta de cliente
                  </Link>
                </p>
                
                <p className="text-xs text-slate-500 mt-4">
                  É dono de restaurante?{' '}
                  <Link 
                    href="/login" 
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Acesse aqui
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
