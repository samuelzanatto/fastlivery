"use client"

import React, { useState, useEffect, useCallback } from "react"
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit2, 
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
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
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
import { UserAvatar } from "@/components/layout/user-avatar"
import { EmailOtpVerification } from '@/components/auth/unified-email-otp-verification'
import { useBusinessContext } from '@/hooks/business/use-business-context'
import { notify } from '@/lib/notifications/notify'
import { useSession } from '@/lib/auth/auth-client'
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee, 
  type Employee,
  type EmployeeCreateInput,
  type EmployeeUpdateInput 
} from '@/actions/employees/employees'
import { getRoles } from '@/actions/roles/roles'

interface Role {
  id: string
  name: string
  description: string | null
}

export default function UsersPage() {
  const { business, permissions, hasPermission } = useBusinessContext()
  const businessId = business?.id
  const { canManageEmployees, isOwner } = permissions
  const { data: session } = useSession()
  const canManage = canManageEmployees
  
  // Permissões granulares
  const canView = hasPermission('employees', 'view') || hasPermission('employees', 'manage') || isOwner || canManage
  const canCreate = hasPermission('employees', 'create') || hasPermission('employees', 'manage') || isOwner || canManage
  const canEdit = hasPermission('employees', 'update') || hasPermission('employees', 'manage') || isOwner || canManage
  
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
  if (!businessId) return
    
    setLoading(true)
    try {
      const result = await getEmployees({ search: searchTerm })
      if (result.success) {
        setEmployees(result.data)
      } else {
        console.error('Erro ao carregar funcionários:', result.error)
        notify('error', 'Erro ao carregar funcionários', { description: result.error })
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
      notify('error', 'Erro ao carregar funcionários')
    } finally {
      setLoading(false)
    }
  }, [businessId, searchTerm])

  const fetchRoles = useCallback(async () => {
    if (!businessId) return
    
    try {
      const result = await getRoles()
      if (result.success) {
        setRoles(result.data.roles)
      } else {
        console.error('Erro ao carregar cargos:', result.error)
        notify('error', 'Erro ao carregar cargos', { description: result.error })
      }
    } catch (error) {
      console.error('Erro ao carregar cargos:', error)
      notify('error', 'Erro ao carregar cargos')
    }
  }, [businessId])

  useEffect(() => {
    if (businessId) {
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
  }, [businessId, fetchEmployees, fetchRoles])

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
  if (!businessId || !session?.user?.id) {
      notify('error', 'Erro de autenticação')
      return
    }
    
    try {
      const employeeData: EmployeeCreateInput = {
        email: formData.email,
        name: formData.name,
        roleId: formData.roleId,
        notes: formData.notes
      }

  const result = await createEmployee(employeeData)
      
      if (result.success) {
        // Fechar dialog de criação e abrir dialog OTP
        setShowCreateDialog(false)
        setPendingEmployeeEmail(formData.email)
        setShowOtpDialog(true)
        setFormData({ email: "", name: "", roleId: "", notes: "", salary: "" })
        
        // Recarregar a lista
        await fetchEmployees()
        
        notify('success', 'Funcionário criado com sucesso!')
      } else {
        throw new Error(result.error || 'Erro ao criar funcionário')
      }
      
    } catch (error) {
      console.error('Erro ao criar funcionário:', error)
      notify('error', 'Erro ao criar funcionário', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
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

  const handleUpdateEmployee = async (employeeId: string, updates: Partial<EmployeeUpdateInput>) => {
    try {
      const result = await updateEmployee(employeeId, updates)

      if (result.success) {
        await fetchEmployees()
        notify('success', 'Funcionário atualizado com sucesso!')
      } else {
        throw new Error(result.error || 'Erro ao atualizar funcionário')
      }
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error)
      notify('error', 'Erro ao atualizar funcionário', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
    }
  }

  // Filtros
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      (employee.user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === "all" || employee.role.id === roleFilter
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && employee.isActive) ||
      (statusFilter === "inactive" && !employee.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  if (!canView) {
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Gerenciar Usuários"
        description={canCreate ? "Gerencie funcionários e suas permissões" : "Visualize os funcionários da empresa"}
      >
        {canCreate && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <DashboardHeaderButton>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </DashboardHeaderButton>
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
        )}

        {/* Dialog OTP Verification */}
        {canCreate && (
        <EmailOtpVerification
          open={showOtpDialog}
          email={pendingEmployeeEmail}
          onVerified={() => {
            setShowOtpDialog(false)
            setPendingEmployeeEmail("")
            setResendCooldown(0)
            fetchEmployees() // Recarregar lista para mostrar status atualizado
            notify('success', 'Funcionário ativado com sucesso!')
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
        )}
      </DashboardHeader>

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
                  : 'Comece adicionando funcionários ao seu negócio'
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
                            name={employee.user.name || employee.user.email}
                            size={32}
                          />
                          <div>
                            <div className="font-medium text-slate-900">
                              {employee.user.name || employee.user.email}
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
                        {employee.createdBy.name || 'Sistema'}
                      </TableCell>
                      
                      <TableCell>
                        {(canEdit || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                            <DropdownMenuItem
                              onClick={() => setEditingEmployee(employee)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            )}
                            
                            {canEdit && !employee.user.emailVerified && (
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
                            
                            {canEdit && (
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
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )}
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
