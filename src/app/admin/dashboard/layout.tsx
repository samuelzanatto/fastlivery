'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth/auth-client'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface AdminDashboardLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Empresas',
    href: '/admin/dashboard/businesses',
    icon: Building2,
  },
  {
    title: 'Usuários',
    href: '/admin/dashboard/users',
    icon: Users,
  },
  {
    title: 'Configurações',
    href: '/admin/dashboard/settings',
    icon: Settings,
  },
]

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Admin</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.title}
              </Link>
            )
          })}
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {session?.user?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
              <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-slate-800/80 backdrop-blur-xl border-b border-slate-700 flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">
              {sidebarItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))?.title || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {session?.user?.role === 'platformAdmin' ? 'Super Admin' : 'Suporte'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
