'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth/auth-client'
import { PWAHeader } from '@/components/layout/pwa-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { ImageUploadDialog } from '@/components/ui/image-upload-dialog'
import { ImageType } from '@/lib/services/image-types'
import { notify } from '@/lib/notifications/notify'
import { updateUserProfile } from '@/actions/users/profile'
import {
    User,
    Camera,
    Eye,
    EyeOff,
    LogOut,
    Save,
    X
} from 'lucide-react'


export default function ContaPage() {
    const router = useRouter()
    const { data: session, isPending } = useSession()
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        avatar: ''
    })

    // Carregar dados do usuário
    useEffect(() => {
        if (session?.user) {
            setFormData(prev => ({
                ...prev,
                name: session.user.name || '',
                email: session.user.email || '',
                phone: '',
                avatar: session.user.image || ''
            }))
        }
    }, [session])

    const handleSignOut = async () => {
        try {
            await signOut()
            router.push('/customer-login')
        } catch (error) {
            console.error('Erro ao fazer logout:', error)
            notify('error', 'Erro ao fazer logout')
        }
    }

    const handleSaveProfile = async () => {
        if (!formData.name || !formData.email) {
            notify('error', 'Nome e email são obrigatórios')
            return
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            notify('error', 'Senhas não coincidem')
            return
        }

        setIsLoading(true)
        try {
            const result = await updateUserProfile({
                name: formData.name,
                email: formData.email,
                phone: formData.phone || undefined,
                ...(formData.avatar && { image: formData.avatar }),
                ...(formData.password && { password: formData.password })
            })

            if (result.success) {
                notify('success', 'Perfil atualizado com sucesso!')
                setIsEditing(false)
                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
            } else {
                notify('error', result.error || 'Erro ao atualizar perfil')
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error)
            notify('error', 'Erro inesperado ao atualizar perfil')
        } finally {
            setIsLoading(false)
        }
    }

    // Estado de carregamento
    if (isPending) {
        return (
            <div className="min-h-screen bg-white">
                <PWAHeader title="Minha Conta" showBackButton={true} noBorder={true} className="lg:hidden" />
                <div className="container mx-auto px-4 pt-20 lg:pt-8">
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                        <p className="text-slate-600">Carregando...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Usuário não logado
    if (!session?.user) {
        return (
            <div className="min-h-screen bg-white">
                <PWAHeader title="Minha Conta" showBackButton={true} noBorder={true} className="lg:hidden" />
                <div className="container mx-auto px-4 pt-20 lg:pt-8">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                            <User className="h-10 w-10 text-orange-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">
                            Você não está logado
                        </h2>
                        <p className="text-slate-600 mb-6 max-w-sm">
                            Faça login para acessar sua conta e ver seus pedidos, endereços e favoritos.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => router.push('/customer-login')}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                Entrar
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/customer-register')}
                            >
                                Criar conta
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white pb-8">
            <PWAHeader title="Minha Conta" showBackButton={true} noBorder={true} className="lg:hidden" />

            <div className="container mx-auto px-4 pt-20 lg:pt-8 max-w-lg">
                {/* Profile Header */}
                <div className="text-center mb-8">
                    <div className="relative inline-block mb-4">
                        <Avatar className="w-24 h-24 border-4 border-orange-100">
                            <AvatarImage src={formData.avatar || session.user.image || undefined} />
                            <AvatarFallback className="text-2xl bg-orange-100 text-orange-600">
                                {session.user.name?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        {isEditing && (
                            <ImageUploadDialog
                                entityId={session.user.id || ''}
                                imageType={ImageType.USER_AVATAR}
                                onImageSelect={async (image) => {
                                    setFormData(prev => ({ ...prev, avatar: image.url }))
                                    notify('success', 'Avatar atualizado!')
                                }}
                                title="Alterar Avatar"
                                description="Escolha uma nova foto para seu perfil"
                            >
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 shadow-lg"
                                >
                                    <Camera className="w-5 h-5" />
                                </Button>
                            </ImageUploadDialog>
                        )}
                    </div>

                    {!isEditing ? (
                        <>
                            <h1 className="text-xl font-semibold text-slate-800">
                                {session.user.name || 'Usuário'}
                            </h1>
                            <p className="text-slate-600 text-sm">{session.user.email}</p>
                            <Badge variant="secondary" className="mt-2 bg-orange-100 text-orange-700 border-orange-200">
                                {session.user.role === 'businessOwner' ? 'Proprietário' :
                                    session.user.role === 'businessStaff' ? 'Funcionário' : 'Cliente'}
                            </Badge>
                        </>
                    ) : (
                        <h1 className="text-xl font-semibold text-slate-800">Editar Perfil</h1>
                    )}
                </div>

                {/* Edit Form or Menu */}
                {isEditing ? (
                    <Card className="mb-6">
                        <CardContent className="pt-6 space-y-4">
                            {/* Nome */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>

                            {/* Telefone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>

                            <Separator />

                            {/* Senha */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Nova Senha (opcional)</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="Deixe em branco para manter a atual"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {formData.password && (
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
                                    }}
                                    className="flex-1"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={isLoading}
                                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isLoading ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Edit Profile Button */}
                        <Button
                            variant="outline"
                            className="w-full mb-4 h-12"
                            onClick={() => setIsEditing(true)}
                        >
                            <User className="w-4 h-4 mr-2" />
                            Editar Perfil
                        </Button>

                        {/* Logout Button */}
                        <Button
                            variant="outline"
                            className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={handleSignOut}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sair da Conta
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
