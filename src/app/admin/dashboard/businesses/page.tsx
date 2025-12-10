'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Power,
  PowerOff,
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

interface Business {
  id: string
  name: string
  slug: string | null
  email: string
  phone: string
  address: string
  isActive: boolean
  isOpen: boolean
  createdAt: string
  owner: {
    id: string
    name: string
    email: string
  } | null
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data)
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error)
      notify('error', 'Erro ao carregar empresas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const handleToggleActive = async (businessId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        notify('success', `Empresa ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`)
        fetchBusinesses()
      } else {
        notify('error', 'Erro ao alterar status da empresa')
      }
    } catch (error) {
      console.error('Erro:', error)
      notify('error', 'Erro ao alterar status')
    }
  }

  const handleDelete = async (businessId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        notify('success', 'Empresa excluída com sucesso')
        fetchBusinesses()
      } else {
        notify('error', 'Erro ao excluir empresa')
      }
    } catch (error) {
      console.error('Erro:', error)
      notify('error', 'Erro ao excluir empresa')
    }
  }

  const filteredBusinesses = businesses.filter((business) =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.owner?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Empresas</h2>
          <p className="text-slate-400">Gerencie as empresas cadastradas na plataforma</p>
        </div>
        <Link href="/admin/dashboard/businesses/new">
          <Button className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, email ou dono..."
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
              <TableHead className="text-slate-400">Empresa</TableHead>
              <TableHead className="text-slate-400">Dono</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Criado em</TableHead>
              <TableHead className="text-slate-400 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-slate-700">
                  <TableCell colSpan={5}>
                    <div className="h-12 bg-slate-700/50 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredBusinesses.length === 0 ? (
              <TableRow className="border-slate-700">
                <TableCell colSpan={5} className="text-center py-12">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhuma empresa encontrada</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredBusinesses.map((business) => (
                <TableRow key={business.id} className="border-slate-700 hover:bg-slate-800/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{business.name}</p>
                        <p className="text-sm text-slate-400">{business.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {business.owner ? (
                      <div>
                        <p className="text-white">{business.owner.name}</p>
                        <p className="text-sm text-slate-400">{business.owner.email}</p>
                      </div>
                    ) : (
                      <span className="text-slate-500">Sem dono</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={business.isActive ? 'default' : 'secondary'}
                        className={
                          business.isActive
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-slate-700 text-slate-400'
                        }
                      >
                        {business.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                      {business.isOpen && (
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                          Aberta
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(business.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700">
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/dashboard/businesses/${business.id}/edit`}
                            className="text-slate-300 focus:text-white focus:bg-slate-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(business.id, business.isActive)}
                          className="text-slate-300 focus:text-white focus:bg-slate-700"
                        >
                          {business.isActive ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem
                          onClick={() => handleDelete(business.id)}
                          className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  )
}
