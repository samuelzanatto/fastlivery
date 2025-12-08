'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useBusinessId } from '@/stores/business-store'
import { DashboardHeader, DashboardHeaderButton } from '@/components/ui/dashboard-header'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notifications/notify'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QRCodeSVG } from 'qrcode.react'
import { 
  getTables,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  type Table,
  type TableCreateInput,
  type TableUpdateInput
} from '@/actions/tables/tables'
import { 
  Plus, 
  QrCode, 
  Printer, 
  Edit, 
  Trash2, 
  Settings,
  ChevronRight
} from 'lucide-react'

// Schemas de validação
const createTableSchema = z.object({
  number: z.string().min(1, 'Número da mesa é obrigatório'),
  capacity: z.number().min(1, 'Capacidade mínima é 1').max(20, 'Capacidade máxima é 20').optional()
})

const editTableSchema = z.object({
  number: z.string().min(1, 'Número da mesa é obrigatório'),
  capacity: z.number().min(1, 'Capacidade mínima é 1').max(20, 'Capacidade máxima é 20').optional()
})

type TableStatus = 'vacant' | 'occupied' | 'reserved'

// Função para converter status da Server Action para UI
const getTableStatus = (table: Table): TableStatus => {
  if (table.isOccupied) return 'occupied'
  if (table.isReserved) return 'reserved'
  return 'vacant'
}

// Função para gerar nome da mesa
const getTableName = (table: Table): string => `Mesa ${table.number}`

// Função para capacidade padrão (pode ser expandido no futuro)
const getTableCapacity = (_table: Table): number => 4

export default function TablesPage() {
  const businessId = useBusinessId()
  const [focusedTable, setFocusedTable] = useState<string | null>(null)
  const [isLongPressing, setIsLongPressing] = useState<string | null>(null)
  const [showSubmenu, setShowSubmenu] = useState<string | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [qrTable, setQrTable] = useState<Table | null>(null)
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  // Forms
  const createForm = useForm<z.infer<typeof createTableSchema>>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      number: '',
      capacity: 4
    }
  })

  const editForm = useForm<z.infer<typeof editTableSchema>>({
    resolver: zodResolver(editTableSchema),
    defaultValues: {
      number: '',
      capacity: 4
    }
  })

  // Carregar mesas da Server Action
  const fetchTables = async () => {
    try {
      setLoading(true)
      const result = await getTables()
      if (result.success) {
        setTables(result.data)
      } else {
        console.error('Erro ao carregar mesas:', result.error)
        notify('error', 'Erro ao carregar mesas', { description: result.error })
      }
    } catch (error) {
      console.error('Erro ao carregar mesas:', error)
      notify('error', 'Erro ao carregar mesas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()
  }, [])

  const handleLongPressStart = (tableId: string) => {
    setIsLongPressing(tableId)
    
    // Limpar timer anterior se existir
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    
    // Iniciar novo timer
    longPressTimer.current = setTimeout(() => {
      setFocusedTable(tableId)
      setIsLongPressing(null)
    }, 800) // 800ms para ativar o long press
  }

  const handleLongPressEnd = () => {
    setIsLongPressing(null)
    
    // Limpar o timer se ainda estiver ativo
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleBackgroundClick = () => {
    // Fechar se clicar em qualquer lugar que não seja o card focado ou seu menu
    if (focusedTable) {
      setFocusedTable(null)
    }
  }

  const handleMenuAction = (action: string, tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (!table) return

    switch (action) {
      case 'print':
        setQrTable(table)
        setFocusedTable(null)
        break
      case 'edit':
        openEditDialog(table)
        setFocusedTable(null)
        break
      case 'delete':
        // O AlertDialog será acionado pelo componente
        break
      default:
        setFocusedTable(null)
    }
  }

  // Função para imprimir QR Code
  const handlePrintQR = () => {
    if (!qrTable) return
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${getTableName(qrTable)}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
              }
              .qr-container { 
                margin: 20px auto; 
                display: inline-block;
              }
              h1 { margin-bottom: 20px; }
              .info { margin-top: 20px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <h1>${getTableName(qrTable)}</h1>
            <div class="qr-container">
              <div id="qrcode"></div>
            </div>
            <div class="info">
              <p>Capacidade: ${getTableCapacity(qrTable)} pessoas</p>
              <p>Escaneie o QR code para fazer seu pedido</p>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
            <script>
              const qr = qrcode(0, 'M')
              qr.addData('${window.location.origin}/r/${qrTable.qrCode || qrTable.id}')
              qr.make()
              document.getElementById('qrcode').innerHTML = qr.createImgTag(4)
              setTimeout(() => window.print(), 100)
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleStatusChange = async (tableId: string, newStatus: 'vacant' | 'occupied' | 'reserved') => {
    try {
      const statusData = {
        isOccupied: newStatus === 'occupied',
        isReserved: newStatus === 'reserved'
      }

      const result = await updateTableStatus(tableId, statusData)
      
      if (result.success) {
        // Atualizar a lista local
        setTables(prev => prev.map(table => 
          table.id === tableId ? result.data : table
        ))
        
        notify('success', `Status alterado para ${newStatus === 'vacant' ? 'disponível' : newStatus === 'occupied' ? 'ocupada' : 'reservada'}`)
        setFocusedTable(null)
      } else {
        throw new Error(result.error || 'Erro ao alterar status')
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      notify('error', 'Erro ao alterar status da mesa')
    }
  }

  // Função para criar mesa
  const handleCreateTable = async (data: z.infer<typeof createTableSchema>) => {
    if (!businessId) {
      notify('error', 'Empresa não encontrada')
      return
    }

    setIsCreating(true)
    try {
      const tableData: TableCreateInput = {
        number: data.number
      }

      const result = await createTable(tableData)
      
      if (result.success) {
        setTables(prev => [...prev, result.data])
        notify('success', 'Mesa criada com sucesso!')
        createForm.reset()
      } else {
        throw new Error(result.error || 'Erro ao criar mesa')
      }
    } catch (error) {
      console.error('Erro ao criar mesa:', error)
      notify('error', 'Erro ao criar mesa', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Função para editar mesa
  const handleEditTable = async (data: z.infer<typeof editTableSchema>) => {
    if (!editingTable) return
    
    setIsUpdating(true)
    try {
      const updateData: TableUpdateInput = {
        number: data.number
      }

      const result = await updateTable(editingTable.id, updateData)
      
      if (result.success) {
        setTables(prev => prev.map(table => 
          table.id === editingTable.id ? result.data : table
        ))
        
        notify('success', 'Mesa atualizada com sucesso!')
        setEditingTable(null)
        editForm.reset()
      } else {
        throw new Error(result.error || 'Erro ao atualizar mesa')
      }
    } catch (error) {
      console.error('Erro ao atualizar mesa:', error)
      notify('error', 'Erro ao atualizar mesa', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Função para deletar mesa
  const handleDeleteTable = async (tableId: string) => {
    try {
      const result = await deleteTable(tableId)
      
      if (result.success) {
        setTables(prev => prev.filter(table => table.id !== tableId))
        notify('success', 'Mesa excluída com sucesso!')
        setFocusedTable(null)
      } else {
        throw new Error(result.error || 'Erro ao deletar mesa')
      }
    } catch (error) {
      console.error('Erro ao deletar mesa:', error)
      notify('error', 'Erro ao deletar mesa', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
    }
  }

  // Abrir dialog de edição
  const openEditDialog = (table: Table) => {
    setEditingTable(table)
    editForm.setValue('number', table.number.toString())
    editForm.setValue('capacity', getTableCapacity(table))
  }

  return (
    <div className="relative">
      {/* Overlay com escurecimento sutil para capturar cliques quando há mesa focada */}
      <AnimatePresence>
        {focusedTable && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-transparent brightness-95"
            onClick={handleBackgroundClick}
            style={{
              backdropFilter: 'brightness(0.85)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Header - with conditional blur */}
      <div className={`flex-1 space-y-4 p-4 md:p-8 pt-6 transition-all duration-300 ${
        focusedTable ? 'blur-md' : ''
      }`}>
        <DashboardHeader
          title="Mesas e QR Codes"
          description="Gerencie mesas e códigos QR para pedidos presenciais"
        >
          <Dialog>
            <DialogTrigger asChild>
              <DashboardHeaderButton>
                <Plus className="h-4 w-4 mr-2" />
                Nova Mesa
              </DashboardHeaderButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Mesa</DialogTitle>
              </DialogHeader>
              
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateTable)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Mesa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacidade (pessoas)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Ex: 4" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Criando...' : 'Criar Mesa'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </DashboardHeader>
      </div>

      {/* Status Legend - with conditional blur */}
      <div className={`px-6 pb-6 pt-6 transition-all duration-300 ${
        focusedTable ? 'blur-md' : ''
      }`}>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Vaga</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Ocupada</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Reservada</span>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-24"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table, index) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <motion.div
                animate={{
                  scale: focusedTable === table.id ? 1.02 : 1,
                  zIndex: focusedTable === table.id ? 50 : 1
                }}
                transition={{ type: "spring", duration: 0.3 }}
                className={`transition-all duration-300 ${
                  focusedTable && focusedTable !== table.id ? 'blur-md pointer-events-none' : ''
                } ${focusedTable === table.id ? 'relative z-50' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Card 
                  className={`relative border shadow-sm hover:shadow-md transition-shadow overflow-hidden h-24 cursor-pointer select-none ${
                    focusedTable === table.id 
                      ? 'border-transparent shadow-2xl' 
                      : 'border-slate-200'
                  }`}
                  onMouseDown={() => handleLongPressStart(table.id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(table.id)}
                  onTouchEnd={handleLongPressEnd}
                >
                  {/* Status Strip - Thicker with Glow Effect */}
                  <div className={`
                    absolute right-0 top-0 bottom-0 w-4 transition-all duration-300
                    ${getTableStatus(table) === 'vacant' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] border-l-2 border-green-400' : ''}
                    ${getTableStatus(table) === 'occupied' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] border-l-2 border-red-400' : ''}
                    ${getTableStatus(table) === 'reserved' ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)] border-l-2 border-yellow-400' : ''}
                    ${isLongPressing === table.id ? 'animate-pulse' : ''}
                  `}></div>
                  
                  <CardContent className="px-4 py-3 h-full">
                    <div className="text-left space-y-1 h-full flex flex-col justify-center">
                      {/* Table Number */}
                      <div className="text-2xl font-bold text-slate-800">
                        Nº {table.number}
                      </div>
                      
                      {/* Table Name */}
                      <div className="text-sm text-slate-600">
                        {getTableName(table)}
                      </div>
                      
                      {/* Capacity */}
                      <div className="text-sm text-slate-500">
                        {getTableCapacity(table)} assentos
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Dropdown Menu - Custom with submenu */}
              <AnimatePresence>
                {focusedTable === table.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ delay: 0.1, type: "spring", duration: 0.3 }}
                    className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-xl border border-slate-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-2 px-2 relative">
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-4 py-3 text-left hover:bg-slate-50"
                        onClick={() => handleMenuAction('print', table.id)}
                      >
                        <Printer className="h-4 w-4 mr-3" />
                        Imprimir QR Code
                      </Button>
                      
                      {/* Button com submenu */}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          className="w-full justify-start px-4 py-3 text-left hover:bg-slate-50"
                          onMouseEnter={() => setShowSubmenu(table.id)}
                          onMouseLeave={() => setShowSubmenu(null)}
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Alterar Status
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Button>

                        {/* Submenu */}
                        <AnimatePresence>
                          {showSubmenu === table.id && (
                            <motion.div
                              initial={{ opacity: 0, x: -10, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: -10, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 z-[100] w-48"
                              onMouseEnter={() => setShowSubmenu(table.id)}
                              onMouseLeave={() => setShowSubmenu(null)}
                            >
                              <div className="py-2 px-2">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start px-4 py-2 text-left hover:bg-green-50"
                                  onClick={() => handleStatusChange(table.id, 'vacant')}
                                >
                                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                  Disponível
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start px-4 py-2 text-left hover:bg-red-50"
                                  onClick={() => handleStatusChange(table.id, 'occupied')}
                                >
                                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                                  Ocupada
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start px-4 py-2 text-left hover:bg-yellow-50"
                                  onClick={() => handleStatusChange(table.id, 'reserved')}
                                >
                                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                                  Reservada
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-4 py-3 text-left hover:bg-slate-50"
                        onClick={() => handleMenuAction('edit', table.id)}
                      >
                        <Edit className="h-4 w-4 mr-3" />
                        Editar Mesa
                      </Button>
                      
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start px-4 py-3 text-left text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Excluir Mesa
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A mesa será excluída permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteTable(table.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          </div>
        )}
      </div>

      {/* Bottom Content - with conditional blur */}
      <div className={`px-6 space-y-6 transition-all duration-300 ${
        focusedTable ? 'blur-md' : ''
      }`}>
        {/* Empty State */}
        {tables.length === 0 && (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <QrCode className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Nenhuma mesa cadastrada
              </h3>
              <p className="text-slate-600 mb-6">
                Adicione mesas para gerar QR codes para pedidos presenciais
              </p>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Mesa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Dialog para editar mesa */}
      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Mesa</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditTable)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Mesa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade (pessoas)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 4" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Atualizando...' : 'Atualizar Mesa'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para mostrar QR Code */}
      <Dialog open={!!qrTable} onOpenChange={(open) => !open && setQrTable(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{qrTable ? getTableName(qrTable) : 'Mesa'}</DialogTitle>
          </DialogHeader>
          
          {qrTable && (
            <div className="flex flex-col items-center space-y-4">
              <QRCodeSVG
                value={`${window.location.origin}/r/${qrTable.qrCode || qrTable.id}`}
                size={200}
                level="M"
                includeMargin={true}
              />
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Capacidade: {qrTable ? getTableCapacity(qrTable) : 4} pessoas
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Escaneie o QR code para fazer seu pedido
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={handlePrintQR} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <DialogClose asChild>
              <Button>Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
