'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Crown,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'

interface UsageStats {
  currentProductCount: number
  currentPartnershipCount: number
  planName: string
  planLimits: {
    maxProducts: number
    maxPartnerships: number
  }
  status: string
  currentPeriodEnd: string
}

interface SupplierUsageDashboardProps {
  usage: UsageStats
  onUpgrade: () => void
}

export function SupplierUsageDashboard({ usage, onUpgrade }: SupplierUsageDashboardProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0 // Ilimitado
    return Math.round((current / max) * 100)
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600'
    if (percentage >= 80) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 95) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (percentage >= 80) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const productPercentage = getUsagePercentage(usage.currentProductCount, usage.planLimits.maxProducts)
  const partnershipPercentage = getUsagePercentage(usage.currentPartnershipCount, usage.planLimits.maxPartnerships)

  const isNearLimit = productPercentage >= 80 || partnershipPercentage >= 80
  const isAtLimit = productPercentage >= 95 || partnershipPercentage >= 95

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'starter':
        return <Package className="h-5 w-5" />
      case 'growth':
        return <TrendingUp className="h-5 w-5" />
      case 'professional':
        return <Zap className="h-5 w-5" />
      case 'enterprise':
        return <Crown className="h-5 w-5" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {isAtLimit && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Limite atingido!</strong> Você está no limite do seu plano. 
            Faça upgrade para continuar adicionando produtos ou parcerias.
          </AlertDescription>
        </Alert>
      )}

      {isNearLimit && !isAtLimit && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            <strong>Próximo do limite!</strong> Considere fazer upgrade do seu plano.
          </AlertDescription>
        </Alert>
      )}

      {/* Plan Overview */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getPlanIcon(usage.planName)}
              <div>
                <CardTitle className="text-xl">Plano {usage.planName}</CardTitle>
                <p className="text-sm text-gray-600">
                  Período atual até {new Date(usage.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <Badge variant={usage.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {usage.status === 'ACTIVE' ? 'Ativo' : usage.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-500" />
                <span>Produtos</span>
                {getStatusIcon(productPercentage)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">
                    {usage.currentProductCount}
                  </span>
                  <span className="text-sm text-gray-500">
                    de {usage.planLimits.maxProducts === -1 ? '∞' : usage.planLimits.maxProducts}
                  </span>
                </div>
                
                {usage.planLimits.maxProducts !== -1 && (
                  <>
                    <Progress 
                      value={productPercentage} 
                      className="h-2"
                    />
                    <p className={`text-sm font-medium ${getStatusColor(productPercentage)}`}>
                      {productPercentage}% utilizado
                    </p>
                  </>
                )}

                {usage.planLimits.maxProducts === -1 && (
                  <p className="text-sm text-green-600 font-medium">
                    ✨ Produtos ilimitados
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Partnerships Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-500" />
                <span>Parcerias</span>
                {getStatusIcon(partnershipPercentage)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">
                    {usage.currentPartnershipCount}
                  </span>
                  <span className="text-sm text-gray-500">
                    de {usage.planLimits.maxPartnerships === -1 ? '∞' : usage.planLimits.maxPartnerships}
                  </span>
                </div>
                
                {usage.planLimits.maxPartnerships !== -1 && (
                  <>
                    <Progress 
                      value={partnershipPercentage} 
                      className="h-2"
                    />
                    <p className={`text-sm font-medium ${getStatusColor(partnershipPercentage)}`}>
                      {partnershipPercentage}% utilizado
                    </p>
                  </>
                )}

                {usage.planLimits.maxPartnerships === -1 && (
                  <p className="text-sm text-green-600 font-medium">
                    ✨ Parcerias ilimitadas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upgrade CTA */}
      {(isNearLimit || usage.planName.toLowerCase() !== 'enterprise') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Precisa de mais capacidade?
                  </h3>
                  <p className="text-gray-600">
                    Faça upgrade do seu plano e desbloqueie todo o potencial do seu negócio.
                  </p>
                </div>
                <Button 
                  onClick={onUpgrade}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Fazer Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}