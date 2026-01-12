"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Save, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { notify } from "@/lib/notifications/notify"

interface Business {
  id: string
  name: string
}

const roles = [
  { value: "platformAdmin", label: "Admin da Plataforma" },
  { value: "platformSupport", label: "Suporte da Plataforma" },
  { value: "businessOwner", label: "Dono de Empresa" },
  { value: "customer", label: "Cliente" },
]

export default function UserEditPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const routeParams = useParams<{ id: string }>()
  const userId = routeParams?.id || params?.id
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "customer",
    businessId: "",
    isActive: false,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userRes, businessesRes] = await Promise.all([
          fetch(`/api/admin/users/${userId}`),
          fetch("/api/admin/businesses"),
        ])

        if (!userRes.ok) throw new Error("Não foi possível carregar o usuário")
        const user = await userRes.json()

        if (businessesRes.ok) {
          const biz = await businessesRes.json()
          setBusinesses(biz)
        }

        setFormData({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          role: user.role || "customer",
          businessId: user.businessId || "",
          isActive: Boolean(user.isActive),
        })
      } catch (error) {
        console.error(error)
        notify("error", "Erro ao carregar dados do usuário")
        router.push("/admin/dashboard/users")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [userId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        notify("success", "Usuário atualizado com sucesso!")
        router.push("/admin/dashboard/users")
      } else {
        const error = await response.json()
        notify("error", error.message || "Erro ao atualizar usuário")
      }
    } catch (error) {
      console.error(error)
      notify("error", "Erro ao atualizar usuário")
    } finally {
      setIsSaving(false)
    }
  }

  const showBusinessSelect = formData.role === "businessOwner"

  if (isLoading) {
    return <div className="p-6 text-slate-300">Carregando dados do usuário...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard/users">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Editar Usuário</h2>
          <p className="text-slate-400">Atualize os dados do usuário da plataforma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Dados do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Nome Completo *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="Nome do usuário"
                />
              </div>

              <div>
                <Label className="text-slate-300">Email *</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="email@dominio.com"
                />
              </div>

              <div>
                <Label className="text-slate-300">Telefone</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label className="text-slate-300">Função</Label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  className="mt-1 w-full rounded-md bg-slate-900/50 border border-slate-600 text-white px-3 py-2"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {showBusinessSelect && (
                <div>
                  <Label className="text-slate-300">Empresa (para Dono)</Label>
                  <select
                    name="businessId"
                    value={formData.businessId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, businessId: e.target.value }))}
                    className="mt-1 w-full rounded-md bg-slate-900/50 border border-slate-600 text-white px-3 py-2"
                  >
                    <option value="">Selecione uma empresa</option>
                    {businesses.map((biz) => (
                      <option key={biz.id} value={biz.id}>
                        {biz.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                />
                <span className="text-slate-300">Usuário ativo</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  )
}
