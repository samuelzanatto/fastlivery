"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Building2, Save, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { notify } from "@/lib/notifications/notify"

interface Owner {
  id: string
  name: string
  email: string
}

export default function BusinessEditPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const routeParams = useParams<{ id: string }>()
  const businessId = routeParams?.id || params?.id
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [owners, setOwners] = useState<Owner[]>([])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
    slug: "",
    isActive: false,
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsDineIn: false,
    deliveryFee: 0,
    minimumOrder: 0,
    deliveryTime: 30,
    ownerId: "_none",
  })

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      try {
        const [businessRes, ownersRes] = await Promise.all([
          fetch(`/api/admin/businesses/${businessId}`),
          fetch("/api/admin/users?role=businessOwner&available=true"),
        ])

        if (!businessRes.ok) throw new Error("Não foi possível carregar a empresa")
        const business = await businessRes.json()

        let ownersData: Owner[] = []
        if (ownersRes.ok) {
          ownersData = await ownersRes.json()
        }

        // Garantir que o dono atual apareça, mesmo se não estiver "disponível"
        if (business.owner && !ownersData.some((o) => o.id === business.owner.id)) {
          ownersData = [
            {
              id: business.owner.id,
              name: business.owner.name,
              email: business.owner.email,
            },
            ...ownersData,
          ]
        }

        setOwners(ownersData)

        setFormData({
          name: business.name || "",
          email: business.email || "",
          phone: business.phone || "",
          address: business.address || "",
          description: business.description || "",
          slug: business.slug || "",
          isActive: Boolean(business.isActive),
          acceptsDelivery: Boolean(business.acceptsDelivery),
          acceptsPickup: Boolean(business.acceptsPickup),
          acceptsDineIn: Boolean(business.acceptsDineIn),
          deliveryFee: Number(business.deliveryFee) || 0,
          minimumOrder: Number(business.minimumOrder) || 0,
          deliveryTime: Number(business.deliveryTime) || 30,
          ownerId: business.ownerId || "_none",
        })
      } catch (error) {
        console.error(error)
        notify("error", "Erro ao carregar dados da empresa")
        router.push("/admin/dashboard/businesses")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [businessId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
  }

  const handleSwitchChange = (field: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }))
  }

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/businesses/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ownerId: formData.ownerId === "_none" ? null : formData.ownerId,
        }),
      })

      if (response.ok) {
        notify("success", "Empresa atualizada com sucesso!")
        router.push("/admin/dashboard/businesses")
      } else {
        const error = await response.json()
        notify("error", error.message || "Erro ao atualizar empresa")
      }
    } catch (error) {
      console.error(error)
      notify("error", "Erro ao atualizar empresa")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 text-slate-300">Carregando dados da empresa...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard/businesses">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Editar Empresa</h2>
          <p className="text-slate-400">Atualize os dados da empresa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Nome *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="Nome da empresa"
                />
              </div>

              <div>
                <Label className="text-slate-300">Slug</Label>
                <Input
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="ex: minha-empresa"
                />
              </div>

              <div>
                <Label className="text-slate-300">Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="contato@empresa.com"
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
                <Label className="text-slate-300">Endereço</Label>
                <Textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="Rua, número, cidade"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-slate-300">Descrição</Label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  placeholder="Breve descrição da empresa"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Dono e Operação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Dono da empresa</Label>
                <Select
                  value={formData.ownerId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, ownerId: value }))}
                >
                  <SelectTrigger className="mt-1 w-full bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione um dono" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="_none">Nenhum (sem dono)</SelectItem>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name} ({owner.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Taxa de entrega (R$)</Label>
                  <Input
                    name="deliveryFee"
                    type="number"
                    step="0.01"
                    value={formData.deliveryFee}
                    onChange={handleNumberChange}
                    className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Pedido mínimo (R$)</Label>
                  <Input
                    name="minimumOrder"
                    type="number"
                    step="0.01"
                    value={formData.minimumOrder}
                    onChange={handleNumberChange}
                    className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Tempo médio de entrega (min)</Label>
                  <Input
                    name="deliveryTime"
                    type="number"
                    value={formData.deliveryTime}
                    onChange={handleNumberChange}
                    className="mt-1 bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-slate-300">Status</Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
                    />
                    <span className="text-slate-300">Empresa ativa</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.acceptsDelivery}
                    onCheckedChange={(c) => handleSwitchChange("acceptsDelivery", c)}
                  />
                  <div>
                    <p className="text-white text-sm">Entrega</p>
                    <p className="text-slate-400 text-xs">Permitir pedidos com entrega</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.acceptsPickup}
                    onCheckedChange={(c) => handleSwitchChange("acceptsPickup", c)}
                  />
                  <div>
                    <p className="text-white text-sm">Retirada</p>
                    <p className="text-slate-400 text-xs">Clientes retiram no local</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.acceptsDineIn}
                    onCheckedChange={(c) => handleSwitchChange("acceptsDineIn", c)}
                  />
                  <div>
                    <p className="text-white text-sm">No local</p>
                    <p className="text-slate-400 text-xs">Consumir no salão</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  )
}
