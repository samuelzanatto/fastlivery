'use client'

import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface DashboardHeaderProps {
  title: string
  description: string
  children?: ReactNode
}

export function DashboardHeader({ title, description, children }: DashboardHeaderProps) {
  const pathname = usePathname()
  
  // Determinar o tipo de dashboard baseado na rota
  const isSupplierDashboard = pathname.includes('supplier')
  
  // Definir classes de cores baseadas no tema
  const themeClasses = isSupplierDashboard 
    ? 'bg-green-500 hover:bg-green-600' // Tema verde para suppliers
    : 'bg-orange-500 hover:bg-orange-600' // Tema laranja para business

  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children && (
        <div className="flex items-center space-x-2">
          {/* Aplicar tema automaticamente a botões filhos */}
          <div className={`[&_button:not([class*="variant"])]:${themeClasses.replace('bg-', '').replace(' hover:bg-', ' hover:')}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface DashboardHeaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  asChild?: boolean
  children: ReactNode
}

export function DashboardHeaderButton({ 
  variant = 'default', 
  size = 'default',
  asChild = false,
  children, 
  ...props 
}: DashboardHeaderButtonProps) {
  const pathname = usePathname()
  const isSupplierDashboard = pathname.includes('supplier')
  
  // Aplicar tema apenas se for o botão padrão
  const themeClasses = variant === 'default' 
    ? isSupplierDashboard 
      ? 'bg-green-500 hover:bg-green-600' 
      : 'bg-orange-500 hover:bg-orange-600'
    : ''

  return (
    <Button 
      variant={variant} 
      size={size} 
      asChild={asChild}
      className={variant === 'default' ? themeClasses : ''}
      {...props}
    >
      {children}
    </Button>
  )
}