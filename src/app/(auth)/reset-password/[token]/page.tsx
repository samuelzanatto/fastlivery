'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { resetPassword } from '@/actions/auth/password-reset'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notifications/notify'

export default function ResetPasswordTokenPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await resetPassword({ token, password, confirmPassword: confirm })
      if (!res.success) {
        notify('error','Falha', { description: res.error || 'Token inválido' })
        return
      }
      setDone(true)
      notify('success','Senha redefinida',{ description: 'Você já pode entrar com a nova senha.' })
      setTimeout(()=> router.push('/login'), 1800)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      notify('error','Erro',{ description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-2">Definir nova senha</h1>
        <p className="text-sm text-slate-600 mb-6">Informe a nova senha duas vezes para confirmar.</p>
        {done ? (
          <div className="text-green-600 text-sm">Senha alterada com sucesso. Redirecionando...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nova senha</label>
              <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <Input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8} />
              {confirm && confirm !== password && (
                <p className="text-xs text-red-600 mt-1">Senhas não conferem</p>
              )}
            </div>
            <Button type="submit" disabled={loading || !password || password!==confirm} className="w-full">
              {loading ? 'Salvando...' : 'Redefinir Senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
