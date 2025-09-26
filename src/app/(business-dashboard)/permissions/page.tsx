"use client"

import React, { useState, useEffect, useCallback } from "react"
import { 
  Shield, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Users,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useBusinessContext } from '@/hooks/business/use-business-context'
import { getRoles, createRole, updateRole, deleteRole, type RoleWithPermissions } from '@/actions/roles'
import { notify } from '@/lib/notifications/notify'

// Recursos disponíveis no sistema
const AVAILABLE_RESOURCES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Acesso ao painel principal' },
  { id: 'orders', name: 'Pedidos', description: 'Gerenciar pedidos' },
  { id: 'products', name: 'Produtos', description: 'Gerenciar produtos e categorias' },
  { id: 'analytics', name: 'Relatórios', description: 'Acessar relatórios e analytics' },
  { id: 'tables', name: 'Mesas', description: 'Gerenciar mesas' },
  { id: 'users', name: 'Usuários', description: 'Gerenciar funcionários' },
  { id: 'settings', name: 'Configurações', description: 'Configurações da empresa' },
]

// Ações disponíveis
const AVAILABLE_ACTIONS = [
  { id: 'read', name: 'Visualizar', description: 'Pode visualizar/listar' },
  { id: 'create', name: 'Criar', description: 'Pode criar novos registros' },
  { id: 'update', name: 'Editar', description: 'Pode editar registros existentes' },
  { id: 'delete', name: 'Excluir', description: 'Pode excluir registros' },
  { id: 'manage', name: 'Gerenciar', description: 'Acesso completo (todas as ações)' },
]

const RoleFormDialog = React.memo(function RoleFormDialog({ 
  open, 
  onOpenChange, 
  title, 
  onSubmit,
  formData,
  onFormDataChange,
  onPermissionChange,
  isPermissionSelected
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  title: string; 
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    description: string;
    permissions: { resource: string; action: string }[];
  };
  onFormDataChange: (field: string, value: string) => void;
  onPermissionChange: (resource: string, action: string, checked: boolean) => void;
  isPermissionSelected: (resource: string, action: string) => boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        onOpenChange(false)
      }
    }}>
      <DialogContent className="min-w-7xl sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cargo *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => onFormDataChange('name', e.target.value)}
                placeholder="Ex: Garçom, Cozinheiro, Gerente"
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => onFormDataChange('description', e.target.value)}
                placeholder="Descrição do cargo"
                autoComplete="off"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Permissões</Label>
              <p className="text-sm text-slate-600 mt-1">
                Selecione as permissões que este cargo terá no sistema
              </p>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    {AVAILABLE_ACTIONS.map(action => (
                      <TableHead key={action.id} className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{action.name}</span>
                          <span className="text-xs text-slate-500">{action.description}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AVAILABLE_RESOURCES.map(resource => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{resource.name}</div>
                          <div className="text-sm text-slate-600">{resource.description}</div>
                        </div>
                      </TableCell>
                      {AVAILABLE_ACTIONS.map(action => (
                        <TableCell key={`${resource.id}-${action.id}`} className="text-center">
                          <Checkbox
                            checked={isPermissionSelected(resource.id, action.id)}
                            onCheckedChange={(checked) => 
                              onPermissionChange(resource.id, action.id, checked as boolean)
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
              {title.includes('Editar') ? 'Atualizar Cargo' : 'Criar Cargo'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpenChange(false)
              }}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})

export default function PermissionsPage() {
  const { business, permissions } = useBusinessContext()
  const businessId = business?.id
  const { isOwner, canManageEmployees } = permissions
  const canManage = canManageEmployees
  const [roles, setRoles] = useState<RoleWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as { resource: string; action: string }[]
  })

  const fetchRoles = useCallback(async () => {
  if (!businessId) return
    
    setLoading(true)
    try {
      const result = await getRoles()
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      setRoles(result.data.roles)
    } catch (error) {
      console.error('Erro ao carregar cargos:', error)
      notify('error', 'Erro ao carregar cargos')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    if (businessId) {
      fetchRoles()
    }
  }, [businessId, fetchRoles])

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const result = await createRole({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      await fetchRoles()
      setShowCreateDialog(false)
      setFormData({ name: "", description: "", permissions: [] })
      notify('success', 'Cargo criado com sucesso')
    } catch (error) {
      console.error('Erro ao criar cargo:', error)
      const message = error instanceof Error ? error.message : 'Erro ao criar cargo'
      notify('error', message)
    }
  }

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole) return
    
    try {
      const result = await updateRole(editingRole.id, {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      await fetchRoles()
      setEditingRole(null)
      setFormData({ name: "", description: "", permissions: [] })
      notify('success', 'Cargo atualizado com sucesso')
    } catch (error) {
      console.error('Erro ao atualizar cargo:', error)
      const message = error instanceof Error ? error.message : 'Erro ao atualizar cargo'
      notify('error', message)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Deseja realmente excluir este cargo? Esta ação não pode ser desfeita.')) return
    
    try {
      const result = await deleteRole(roleId)

      if (!result.success) {
        throw new Error(result.error)
      }

      await fetchRoles()
      notify('success', 'Cargo excluído com sucesso')
    } catch (error) {
      console.error('Erro ao excluir cargo:', error)
      const message = error instanceof Error ? error.message : 'Erro ao excluir cargo'
      notify('error', message)
    }
  }

  const handleFormDataChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handlePermissionChange = useCallback((resource: string, action: string, checked: boolean) => {
    setFormData(prev => {
      const permissions = [...prev.permissions]
      const existingIndex = permissions.findIndex(p => p.resource === resource && p.action === action)
      
      if (checked && existingIndex === -1) {
        permissions.push({ resource, action })
      } else if (!checked && existingIndex >= 0) {
        permissions.splice(existingIndex, 1)
      }
      
      return { ...prev, permissions }
    })
  }, [])

  const isPermissionSelected = (resource: string, action: string) => {
    return formData.permissions.some(p => p.resource === resource && p.action === action)
  }

  const openEditDialog = (role: RoleWithPermissions) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: (role.permissions || []).map(p => ({ resource: p.resource, action: p.action }))
    })
  }

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Recurso correto para gerenciamento de funcionários é 'employees'
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <DashboardHeader
        title="Gerenciar Permissões"
        description="Configure cargos e suas permissões no sistema"
      >
        <DashboardHeaderButton 
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Cargo
        </DashboardHeaderButton>
      </DashboardHeader>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar cargos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando cargos...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm 
                  ? 'Nenhum cargo encontrado' 
                  : 'Nenhum cargo cadastrado'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando cargos para organizar as permissões'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm border-b">
                <TableRow>
                  <TableHead className="font-medium bg-white">Cargo</TableHead>
                  <TableHead className="font-medium bg-white">Funcionários</TableHead>
                  <TableHead className="font-medium bg-white">Permissões</TableHead>
                  <TableHead className="font-medium bg-white">Status</TableHead>
                  <TableHead className="font-medium w-12 bg-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">
                          {role.name}
                        </div>
                        {role.description && (
                          <div className="text-sm text-slate-600">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">{0}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {(role.permissions || []).slice(0, 3).map(permission => (
                          <Badge 
                            key={`${permission.resource}-${permission.action}`}
                            variant="outline" 
                            className="text-xs bg-slate-50"
                          >
                            {permission.resource}:{permission.action}
                          </Badge>
                        ))}
                        {(role.permissions || []).length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(role.permissions || []).length - 3} mais
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {role.isActive ? (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(role)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
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

      {/* Dialogs */}
      <RoleFormDialog
        key="create-dialog"
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setFormData({ name: "", description: "", permissions: [] })
          }
        }}
        title="Criar Novo Cargo"
        onSubmit={handleCreateRole}
        formData={formData}
        onFormDataChange={handleFormDataChange}
        onPermissionChange={handlePermissionChange}
        isPermissionSelected={isPermissionSelected}
      />
      
      <RoleFormDialog
        key={editingRole ? `edit-dialog-${editingRole.id}` : 'edit-dialog-closed'}
        open={!!editingRole}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null)
            setFormData({ name: "", description: "", permissions: [] })
          }
        }}
        title="Editar Cargo"
        onSubmit={handleEditRole}
        formData={formData}
        onFormDataChange={handleFormDataChange}
        onPermissionChange={handlePermissionChange}
        isPermissionSelected={isPermissionSelected}
      />
    </div>
  )
}
