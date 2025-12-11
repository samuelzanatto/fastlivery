'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Shield, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth/auth-client'
import { notify } from '@/lib/notifications/notify'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
}

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await signIn.email({
        email,
        password,
        callbackURL: '/admin/dashboard'
      })

      if (error) {
        notify('error', error.message || 'Credenciais inválidas')
        setIsLoading(false)
        return
      }

      if (data) {
        // TODO: Verificar se o usuário tem role de plataforma via API
        notify('success', 'Login realizado com sucesso!')
        router.push('/admin/dashboard')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado'
      notify('error', errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <motion.div
        className="relative w-full max-w-md"
        initial="initial"
        animate="animate"
        variants={fadeIn}
        transition={{ duration: 0.5 }}
      >
        {/* Logo e título */}
        <motion.div
          className="text-center mb-8"
          variants={fadeInUp}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4 shadow-lg shadow-blue-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Painel Administrativo
          </h1>
          <p className="text-slate-400">
            FastLivery Platform Management
          </p>
        </motion.div>

        {/* Card de login */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl"
          variants={fadeInUp}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@fastlivery.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </motion.div>

            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Label htmlFor="password" className="text-slate-300">
                Senha
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
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
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-5 shadow-lg shadow-blue-500/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Acessar Painel
                  </span>
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-slate-500 text-sm mt-6"
          variants={fadeInUp}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Acesso restrito a administradores da plataforma
        </motion.p>
      </motion.div>
    </div>
  )
}
