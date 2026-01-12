'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Building2,
  User,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { notify } from '@/lib/notifications/notify'

interface UserData {
  id: string
  name: string
  email: string
  phone: string | null
  role: string | null
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  business: {
    id: string
    name: string
  } | null
}

const roleLabels: Record<string, { label: string; color: string }> = {
  platformAdmin: { label: 'Admin Plataforma', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  platformSupport: { label: 'Suporte', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  businessOwner: { label: 'Dono de Empresa', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  businessStaff: { label: 'Funcionário', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  customer: { label: 'Cliente', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [resendingId, setResendingId] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      notify('error', 'Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        notify('success', 'Usuário excluído com sucesso')
        fetchUsers()
      } else {
        notify('error', 'Erro ao excluir usuário')
      }
    } catch (error) {
      console.error('Erro:', error)
      notify('error', 'Erro ao excluir usuário')
    }
  }

  const handleResendSetup = async (userId: string) => {
    setResendingId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/resend-setup`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        const link = data?.link as string | undefined
        notify('success', 'Convite reenviado', {
          description: link ? `Link: ${link}` : 'Verifique o e-mail do usuário.',
        })
      } else {
        const err = await response.json().catch(() => ({}))
        notify('error', err.message || 'Não foi possível reenviar o convite')
      }
    } catch (error) {
      console.error('Erro:', error)
      notify('error', 'Erro ao reenviar convite')
    } finally {
      setResendingId(null)
    }
  }

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.business?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'platformAdmin':
      case 'platformSupport':
        return <Shield className="w-4 h-4" />
      case 'businessOwner':
        return <Building2 className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Usuários</h2>
          <p className="text-slate-400">Gerencie os usuários da plataforma</p>
        </div>
        <Link href="/admin/dashboard/users/new">
          <Button className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, email ou empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400">Usuário</TableHead>
              <TableHead className="text-slate-400">Cargo</TableHead>
              <TableHead className="text-slate-400">Empresa</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Criado em</TableHead>
              <TableHead className="text-slate-400 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-slate-700">
                  <TableCell colSpan={6}>
                    <div className="h-12 bg-slate-700/50 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow className="border-slate-700">
                <TableCell colSpan={6} className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhum usuário encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const roleInfo = roleLabels[user.role || 'customer'] || roleLabels.customer
                return (
                  <TableRow key={user.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleInfo.color}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          {roleInfo.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.business ? (
                        <span className="text-white">{user.business.name}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            user.isActive
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-slate-700 text-slate-400'
                          }
                        >
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {!user.emailVerified && (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                            Não verificado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/dashboard/users/${user.id}/edit`}
                              className="text-slate-300 focus:text-white focus:bg-slate-700"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          {!user.emailVerified && (
                            <DropdownMenuItem
                              disabled={resendingId === user.id}
                              onClick={() => handleResendSetup(user.id)}
                              className="text-slate-300 focus:text-white focus:bg-slate-700"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {resendingId === user.id ? 'Reenviando...' : 'Reenviar convite'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user.id)}
                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  )
}
