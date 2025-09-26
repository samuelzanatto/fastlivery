'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Crown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface LimitWarning {
  type: 'warning' | 'critical'
  resource: string
  message: string
  percentage: number
}

interface LimitNotificationProps {
  warnings: LimitWarning[]
  onDismiss?: (resource: string) => void
  className?: string
}

export function LimitNotifications({ warnings, onDismiss, className }: LimitNotificationProps) {
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([])

  // Carregar warnings dismissados do localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissed-limit-warnings')
    if (dismissed) {
      setDismissedWarnings(JSON.parse(dismissed))
    }
  }, [])

  const handleDismiss = (resource: string) => {
    const newDismissed = [...dismissedWarnings, resource]
    setDismissedWarnings(newDismissed)
    localStorage.setItem('dismissed-limit-warnings', JSON.stringify(newDismissed))
    onDismiss?.(resource)
  }

  const activeWarnings = warnings.filter(warning => 
    !dismissedWarnings.includes(warning.resource)
  )

  if (activeWarnings.length === 0) return null

  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence mode="popLayout">
        {activeWarnings.map((warning, index) => (
          <motion.div
            key={warning.resource}
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Alert 
              className={`${
                warning.type === 'critical' 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-yellow-200 bg-yellow-50'
              } relative`}
            >
              <AlertTriangle 
                className={`h-4 w-4 ${
                  warning.type === 'critical' ? 'text-red-600' : 'text-yellow-600'
                }`} 
              />
              
              <AlertDescription 
                className={`pr-12 ${
                  warning.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span>{warning.message}</span>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href="/supplier-subscription">
                      <Button 
                        size="sm"
                        className={`${
                          warning.type === 'critical'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        } text-white`}
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Fazer Upgrade
                      </Button>
                    </Link>
                  </div>
                </div>
              </AlertDescription>

              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 p-1 h-6 w-6 rounded-full hover:bg-black/5"
                onClick={() => handleDismiss(warning.resource)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface LimitNotificationCardProps {
  warnings: LimitWarning[]
  title?: string
  description?: string
  showUpgradeButton?: boolean
}

export function LimitNotificationCard({ 
  warnings, 
  title = "Atenção aos Limites",
  description = "Você está próximo ou atingiu os limites do seu plano atual.",
  showUpgradeButton = true
}: LimitNotificationCardProps) {
  if (warnings.length === 0) return null

  const criticalWarnings = warnings.filter(w => w.type === 'critical')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${
        criticalWarnings.length > 0 
          ? 'border-red-200 bg-red-50' 
          : 'border-yellow-200 bg-yellow-50'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${
              criticalWarnings.length > 0 ? 'text-red-600' : 'text-yellow-600'
            }`} />
            
            <div className="flex-1">
              <h3 className={`font-semibold mb-1 ${
                criticalWarnings.length > 0 ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {title}
              </h3>
              
              <p className={`text-sm mb-3 ${
                criticalWarnings.length > 0 ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {description}
              </p>

              <div className="space-y-2">
                {warnings.map((warning) => (
                  <div 
                    key={warning.resource}
                    className={`text-sm p-2 rounded-md ${
                      warning.type === 'critical' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    • {warning.message}
                  </div>
                ))}
              </div>

              {showUpgradeButton && (
                <div className="mt-4">
                  <Link href="/supplier-subscription">
                    <Button 
                      className={`${
                        criticalWarnings.length > 0
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-yellow-600 hover:bg-yellow-700'
                      } text-white`}
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Fazer Upgrade do Plano
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}