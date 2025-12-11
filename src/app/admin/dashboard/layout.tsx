'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Flutuante */}
      <motion.aside
        className={cn(
          'fixed top-4 left-4 bottom-4 z-50 w-64 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl flex flex-col transition-all duration-200',
          sidebarOpen ? 'flex translate-x-0 lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6">
          <Link href="/admin/dashboard" className="flex items-center">
            <Image
              src="/logo with name.png"
              alt="FastLivery"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = item.href === '/admin/dashboard' 
              ? pathname === '/admin/dashboard' 
              : pathname.startsWith(item.href)
            return (
              <motion.div
                key={item.href}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* User section at bottom */}
        <div className="px-2 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/30 transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm font-medium shadow-lg shadow-orange-500/20">
                  {session?.user?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 shrink-0" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="lg:ml-72">
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
