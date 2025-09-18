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
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QRCodeSVG } from 'qrcode.react'
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

type Table = {
  id: string
  number: number
  name: string
  capacity: number
  status: 'vacant' | 'occupied' | 'reserved'
  qrCode?: string
}

export default function TablesPage() {
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

  // Carregar mesas da API
  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables')
      if (!response.ok) throw new Error('Erro ao carregar mesas')
      const data = await response.json()
      setTables(data)
    } catch (error) {
      console.error('Erro ao carregar mesas:', error)
      toast.error('Erro ao carregar mesas')
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
            <title>QR Code - ${qrTable.name}</title>
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
            <h1>${qrTable.name}</h1>
            <div class="qr-container">
              <div id="qrcode"></div>
            </div>
            <div class="info">
              <p>Capacidade: ${qrTable.capacity} pessoas</p>
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
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Erro ao alterar status')
      
      const updatedTable = await response.json()
      
      // Atualizar a lista local
      setTables(prev => prev.map(table => 
        table.id === tableId ? updatedTable : table
      ))
      
      toast.success(`Status alterado para ${newStatus === 'vacant' ? 'disponível' : newStatus === 'occupied' ? 'ocupada' : 'reservada'}`)
      setFocusedTable(null)
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status da mesa')
    }
  }

  // Função para criar mesa
  const handleCreateTable = async (data: z.infer<typeof createTableSchema>) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Erro ao criar mesa')
      
      const newTable = await response.json()
      setTables(prev => [...prev, newTable])
      
      toast.success('Mesa criada com sucesso!')
      createForm.reset()
    } catch (error) {
      console.error('Erro ao criar mesa:', error)
      toast.error('Erro ao criar mesa')
    } finally {
      setIsCreating(false)
    }
  }

  // Função para editar mesa
  const handleEditTable = async (data: z.infer<typeof editTableSchema>) => {
    if (!editingTable) return
    
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Erro ao atualizar mesa')
      
      const updatedTable = await response.json()
      
      setTables(prev => prev.map(table => 
        table.id === editingTable.id ? updatedTable : table
      ))
      
      toast.success('Mesa atualizada com sucesso!')
      setEditingTable(null)
      editForm.reset()
    } catch (error) {
      console.error('Erro ao atualizar mesa:', error)
      toast.error('Erro ao atualizar mesa')
    } finally {
      setIsUpdating(false)
    }
  }

  // Função para deletar mesa
  const handleDeleteTable = async (tableId: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erro ao deletar mesa')
      
      setTables(prev => prev.filter(table => table.id !== tableId))
      
      toast.success('Mesa excluída com sucesso!')
      setFocusedTable(null)
    } catch (error) {
      console.error('Erro ao deletar mesa:', error)
      toast.error('Erro ao deletar mesa')
    }
  }

  // Abrir dialog de edição
  const openEditDialog = (table: Table) => {
    setEditingTable(table)
    editForm.setValue('number', table.number.toString())
    editForm.setValue('capacity', table.capacity)
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
      <div className={`p-6 pb-3 transition-all duration-300 ${
        focusedTable ? 'blur-md' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mesas e QR Codes</h1>
            <p className="text-slate-600">Gerencie mesas e códigos QR para pedidos presenciais</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Nova Mesa
              </Button>
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
        </div>
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
                    ${table.status === 'vacant' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] border-l-2 border-green-400' : ''}
                    ${table.status === 'occupied' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] border-l-2 border-red-400' : ''}
                    ${table.status === 'reserved' ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)] border-l-2 border-yellow-400' : ''}
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
                        {table.name}
                      </div>
                      
                      {/* Capacity */}
                      <div className="text-sm text-slate-500">
                        {table.capacity} assentos
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
            <DialogTitle>{qrTable?.name}</DialogTitle>
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
                  Capacidade: {qrTable.capacity} pessoas
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
