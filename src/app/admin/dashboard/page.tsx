'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardStats {
  totalBusinesses: number
  totalUsers: number
  activeBusinesses: number
  monthlyRevenue: number
  businessGrowth: number
  userGrowth: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBusinesses: 0,
    totalUsers: 0,
    activeBusinesses: 0,
    monthlyRevenue: 0,
    businessGrowth: 0,
    userGrowth: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Buscar estatísticas do banco
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total de Empresas',
      value: stats.totalBusinesses,
      icon: Building2,
      change: stats.businessGrowth,
      changeLabel: 'vs mês anterior',
      color: 'blue',
    },
    {
      title: 'Empresas Ativas',
      value: stats.activeBusinesses,
      icon: TrendingUp,
      change: 0,
      changeLabel: 'atualmente',
      color: 'green',
    },
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      icon: Users,
      change: stats.userGrowth,
      changeLabel: 'vs mês anterior',
      color: 'purple',
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      change: 0,
      changeLabel: 'este mês',
      color: 'orange',
    },
  ]

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const colors = colorClasses[stat.color]
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`bg-slate-800/50 border-slate-700 ${colors.border}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <stat.icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {isLoading ? (
                      <div className="h-8 w-20 bg-slate-700 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  {stat.change !== 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {stat.change > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-400" />
                      )}
                      <span
                        className={`text-sm ${
                          stat.change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {Math.abs(stat.change)}%
                      </span>
                      <span className="text-xs text-slate-500">{stat.changeLabel}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/dashboard/businesses/new"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-white">Cadastrar Nova Empresa</p>
                <p className="text-sm text-slate-400">
                  Adicione uma nova empresa à plataforma
                </p>
              </div>
            </a>
            <a
              href="/admin/dashboard/users/new"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-white">Cadastrar Novo Usuário</p>
                <p className="text-sm text-slate-400">
                  Crie um novo dono de empresa ou admin
                </p>
              </div>
            </a>
          </CardContent>
        </Card>

        {/* Recent Activity placeholder */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">
                  Nenhuma atividade recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
