'use client'

import { motion } from 'framer-motion'
import { Settings, Bell, Shield, Database } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="text-slate-400">Configurações gerais da plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notificações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Notificações por Email</span>
                  <p className="text-sm text-slate-500">Receber alertas importantes por email</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Novas Empresas</span>
                  <p className="text-sm text-slate-500">Notificar quando uma empresa se cadastrar</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Erros Críticos</span>
                  <p className="text-sm text-slate-500">Alertas de erros do sistema</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Segurança */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">2FA Obrigatório</span>
                  <p className="text-sm text-slate-500">Exigir autenticação em dois fatores</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Logs de Auditoria</span>
                  <p className="text-sm text-slate-500">Registrar todas as ações administrativas</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sistema */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Modo Manutenção</span>
                  <p className="text-sm text-slate-500">Bloquear acesso de usuários</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <span className="text-slate-300 font-medium">Cadastros de Empresas</span>
                  <p className="text-sm text-slate-500">Permitir novas empresas se cadastrarem</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Banco de Dados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-400" />
                Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-700/30">
                <p className="text-slate-300 font-medium">Status</p>
                <p className="text-sm text-green-400">Conectado</p>
              </div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                Executar Backup
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
