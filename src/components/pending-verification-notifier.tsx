import React, { useState, useEffect, useCallback } from 'react'
import { Bell, AlertTriangle, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRestaurantContext } from '@/hooks/useRestaurantContext'
import { usePermissions } from '@/hooks/useRestaurantContext'

interface PendingEmployee {
  id: string
  user: {
    name: string
    email: string
  }
}

export function PendingVerificationNotifier() {
  const { restaurant } = useRestaurantContext()
  const { hasPermission } = usePermissions()
  const [pendingEmployees, setPendingEmployees] = useState<PendingEmployee[]>([])
  const [loading, setLoading] = useState(false)

  // Verificar se tem permissão para gerenciar funcionários
  const canManageEmployees = hasPermission('employees', 'manage')
  const canReadEmployees = hasPermission('employees', 'read')

  const fetchPendingEmployees = useCallback(async () => {
    if (!restaurant) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/employees/pending-verification?restaurantId=${restaurant.id}`)
      if (!response.ok) throw new Error('Erro ao carregar funcionários pendentes')
      const data = await response.json()
      setPendingEmployees(data)
    } catch (error) {
      console.error('Erro ao carregar funcionários pendentes:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurant])

  useEffect(() => {
    if (restaurant) {
      fetchPendingEmployees()
      // Atualizar a cada 30 segundos
      const interval = setInterval(fetchPendingEmployees, 30000)
      return () => clearInterval(interval)
    }
  }, [restaurant, fetchPendingEmployees])

  // Só mostrar se tem permissão para gerenciar usuários
  if (!canManageEmployees && !canReadEmployees) {
    return null
  }

  const handleOpenVerificationDialog = (email: string) => {
    // Redirecionar para página de usuários com parâmetro para abrir dialog
    window.location.href = `/users?verify=${encodeURIComponent(email)}`
  }

  const markAsRead = async (employeeId: string) => {
    try {
      // Opcional: implementar marcação como lida
      setPendingEmployees(prev => prev.filter(emp => emp.id !== employeeId))
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  if (pendingEmployees.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {pendingEmployees.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {pendingEmployees.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="font-medium text-sm">Verificações Pendentes</span>
            <Badge variant="secondary" className="ml-auto">
              {pendingEmployees.length}
            </Badge>
          </div>
        </div>
        
        {loading ? (
          <div className="p-4 text-center text-sm text-slate-600">
            Carregando...
          </div>
        ) : (
          <>
            {pendingEmployees.map((employee, index) => (
              <React.Fragment key={employee.id}>
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <div className="flex items-start gap-3 w-full">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 truncate">
                        {employee.user.name || 'Funcionário'}
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        {employee.user.email}
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        Aguardando verificação de email
                      </div>
                      
                      <div className="flex gap-1 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenVerificationDialog(employee.user.email)
                          }}
                        >
                          Verificar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(employee.id)
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
                
                {index < pendingEmployees.length - 1 && <DropdownMenuSeparator />}
              </React.Fragment>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-center text-xs"
                onClick={() => window.location.href = '/users'}
              >
                Ver todos os funcionários
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}