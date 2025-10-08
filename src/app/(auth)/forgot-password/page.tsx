'use client'
import { useState } from 'react'
import { requestPasswordReset } from '@/actions/auth/password-reset'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notifications/notify'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await requestPasswordReset({ email })
      setSent(true)
      notify('success','Se existir uma conta, enviamos o email.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar'
      notify('error','Erro',{ description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-2">Redefinir Senha</h1>
        <p className="text-sm text-slate-600 mb-6">Digite seu email e enviaremos um link para redefinir sua senha.</p>
        {sent ? (
          <div className="text-sm text-green-600">Se o email existir em nossa base, você receberá o link em instantes.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="voce@exemplo.com" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Enviando...' : 'Enviar link'}
            </Button>
          </form>
        )}
        <div className="mt-6 text-xs text-slate-500">Caso não receba, verifique a caixa de spam.</div>
      </div>
    </div>
  )
}
