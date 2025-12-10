'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { setupPassword } from '@/actions/auth/setup-password'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notifications/notify'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function SetupPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await setupPassword({ token, password, confirmPassword: confirm })
      if (!res.success) {
        notify('error', 'Falha', { description: res.error || 'Token inválido ou expirado' })
        return
      }
      setDone(true)
      notify('success', 'Senha configurada!', { description: 'Sua conta está pronta. Redirecionando para login...' })
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      notify('error', 'Erro', { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo with name.png"
            alt="Logo"
            width={180}
            height={60}
            className="h-12 w-auto"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Configure sua senha</h1>
        <p className="text-sm text-slate-600 text-center mb-6">
          Você foi convidado(a) para fazer parte da equipe. Configure sua senha para ativar sua conta.
        </p>
        
        {done ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-medium">Conta ativada com sucesso!</p>
            <p className="text-sm text-slate-500 mt-1">Redirecionando para login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nova senha</label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1">Confirmar senha</label>
              <div className="relative">
                <Input 
                  type={showConfirm ? 'text' : 'password'} 
                  value={confirm} 
                  onChange={e => setConfirm(e.target.value)} 
                  required 
                  minLength={8}
                  placeholder="Digite novamente"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm && confirm !== password && (
                <p className="text-xs text-red-600 mt-1">As senhas não conferem</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={loading || !password || password !== confirm || password.length < 8} 
              className="w-full"
            >
              {loading ? 'Configurando...' : 'Configurar Senha e Ativar Conta'}
            </Button>
            
            <p className="text-xs text-slate-500 text-center mt-4">
              Após configurar sua senha, você poderá acessar o sistema com seu email.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
