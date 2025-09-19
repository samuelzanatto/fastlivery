"use client"

import React, { useState, useEffect, useCallback } from "react"
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Shield,
  Check,
  X
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRestaurantContext } from '@/hooks/useRestaurantContext'
import { UserAvatar } from "@/components/user-avatar"
import { ModernEmailOtpVerification } from '@/components/modern-email-otp-verification'
import { usePermissions } from '@/hooks/useRestaurantContext'
import toast from 'react-hot-toast'

interface Role {
  id: string
  name: string
  description: string | null
}

interface Employee {
  id: string
  userId: string
  isActive: boolean
  startDate: string
  endDate?: string
  salary?: number
  notes?: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    image?: string
    isActive: boolean
    emailVerified?: boolean
  }
  role: Role
  createdBy: {
    id: string
    name: string
  }
}

export default function UsersPage() {
    const { restaurant, isOwner } = useRestaurantContext()
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('employees', 'manage')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [pendingEmployeeEmail, setPendingEmployeeEmail] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [_editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    roleId: "",
    notes: "",
    salary: ""
  })

  const fetchEmployees = useCallback(async () => {
    if (!restaurant) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/employees?restaurantId=${restaurant.id}`)
      if (!response.ok) throw new Error('Erro ao carregar funcionários')
      const data = await response.json()
      setEmployees(data)
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurant])

  const fetchRoles = useCallback(async () => {
    if (!restaurant) return
    
    try {
      const response = await fetch(`/api/roles?restaurantId=${restaurant.id}`)
      if (!response.ok) throw new Error('Erro ao carregar cargos')
      const data = await response.json()
      setRoles(data)
    } catch (error) {
      console.error('Erro ao carregar cargos:', error)
    }
  }, [restaurant])

  useEffect(() => {
    if (restaurant) {
      fetchEmployees()
      fetchRoles()
      
      // Verificar se deve abrir dialog de verificação automaticamente
      const urlParams = new URLSearchParams(window.location.search)
      const verifyEmail = urlParams.get('verify')
      
      if (verifyEmail) {
        setPendingEmployeeEmail(verifyEmail)
        setShowOtpDialog(true)
        // Limpar parâmetro da URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('verify')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [restaurant, fetchEmployees, fetchRoles])

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant?.id,
          email: formData.email,
          name: formData.name,
          roleId: formData.roleId,
          notes: formData.notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar funcionário')
      }

      // Fechar dialog de criação e abrir dialog OTP
      setShowCreateDialog(false)
      setPendingEmployeeEmail(formData.email)
      setShowOtpDialog(true)
      setFormData({ email: "", name: "", roleId: "", notes: "", salary: "" })
      
    } catch (error) {
      console.error('Erro ao criar funcionário:', error)
      alert(error instanceof Error ? error.message : 'Erro ao criar funcionário')
    }
  }

  // Efeito para cooldown do reenvio
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCooldown])

  const handleUpdateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar funcionário')
      }

      await fetchEmployees()
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error)
      alert(error instanceof Error ? error.message : 'Erro ao atualizar funcionário')
    }
  }

  const handleDeactivateEmployee = async (employeeId: string) => {
    if (!confirm('Deseja realmente desativar este funcionário?')) return
    
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao desativar funcionário')
      }

      await fetchEmployees()
    } catch (error) {
      console.error('Erro ao desativar funcionário:', error)
      alert(error instanceof Error ? error.message : 'Erro ao desativar funcionário')
    }
  }

  // Filtros
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === "all" || employee.role.id === roleFilter
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && employee.isActive) ||
      (statusFilter === "inactive" && !employee.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  if (!isOwner && !canManage) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Acesso Negado</h2>
          <p className="text-slate-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gerenciar Usuários
          </h1>
          <p className="text-slate-600 mt-1">Gerencie funcionários e suas permissões</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white">
              <UserPlus className="h-4 w-4" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Funcionário</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateEmployee} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="funcionario@exemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do funcionário"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roleId">Cargo *</Label>
                <Select 
                  value={formData.roleId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, roleId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre o funcionário"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                  Criar Funcionário
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog OTP Verification */}
        <ModernEmailOtpVerification
          open={showOtpDialog}
          email={pendingEmployeeEmail}
          onVerified={() => {
            setShowOtpDialog(false)
            setPendingEmployeeEmail("")
            setResendCooldown(0)
            fetchEmployees() // Recarregar lista para mostrar status atualizado
            toast.success('Funcionário ativado com sucesso!')
          }}
          onBack={() => {
            setShowOtpDialog(false)
            setResendCooldown(0)
          }}
          title="Verificar Email do Funcionário"
          description={`Um código de verificação foi enviado para ${pendingEmployeeEmail}`}
          sendEndpoint="/api/employees/send-otp"
          verifyEndpoint="/api/employees/verify-otp"
          verificationType="employee"
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar funcionários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando funcionários...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Nenhum funcionário encontrado' 
                  : 'Nenhum funcionário cadastrado'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando funcionários ao seu restaurante'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                <TableRow>
                  <TableHead className="font-medium bg-white">Funcionário</TableHead>
                  <TableHead className="font-medium bg-white">Cargo</TableHead>
                  <TableHead className="font-medium bg-white">Status</TableHead>
                  <TableHead className="font-medium bg-white">Verificação</TableHead>
                  <TableHead className="font-medium bg-white">Data de Início</TableHead>
                  <TableHead className="font-medium bg-white">Criado por</TableHead>
                  <TableHead className="font-medium w-12 bg-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={employee.user.image}
                            name={employee.user.name}
                            size={32}
                          />
                          <div>
                            <div className="font-medium text-slate-900">
                              {employee.user.name}
                            </div>
                            <div className="text-sm text-slate-600">
                              {employee.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {employee.role.name}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {employee.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <X className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {employee.user.emailVerified ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Verificado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <X className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-sm text-slate-600">
                        {new Date(employee.startDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      
                      <TableCell className="text-sm text-slate-600">
                        {employee.createdBy.name}
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingEmployee(employee)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            
                            {!employee.user.emailVerified && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPendingEmployeeEmail(employee.user.email)
                                  setShowOtpDialog(true)
                                }}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Verificar Email
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => handleUpdateEmployee(employee.id, { isActive: !employee.isActive })}
                            >
                              {employee.isActive ? (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={() => handleDeactivateEmployee(employee.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
