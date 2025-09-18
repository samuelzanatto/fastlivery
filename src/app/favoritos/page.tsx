'use client'

import { useState, useEffect } from 'react'
import { PWAHeader } from '@/components/pwa-header'
import { UserProfileSheet } from '@/components/user-profile-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { 
  Heart,
  Star,
  Clock,
  MapPin,
  ShoppingCart
} from 'lucide-react'

interface FavoriteRestaurant {
  id: string
  slug: string
  name: string
  avatar?: string
  banner?: string
  description: string
  category: string
  rating: number
  deliveryTime: number
  deliveryFee: number
  minimumOrder: number
  isOpen: boolean
  address: string
  favoritesSince: string
}

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento de favoritos
    setTimeout(() => {
      setFavorites([
        {
          id: '1',
          slug: 'burger-king-centro',
          name: 'Burger King Centro',
          description: 'Os melhores hambúrguers da cidade',
          category: 'Fast Food',
          rating: 4.5,
          deliveryTime: 25,
          deliveryFee: 5.99,
          minimumOrder: 20.00,
          isOpen: true,
          address: 'Rua Augusta, 1234 - Centro',
          favoritesSince: '2024-01-10T10:00:00Z'
        },
        {
          id: '2',
          slug: 'pizza-hut-vila-olimpia',
          name: 'Pizza Hut Vila Olímpia',
          description: 'Pizzas tradicionais e especiais',
          category: 'Pizza',
          rating: 4.2,
          deliveryTime: 35,
          deliveryFee: 7.99,
          minimumOrder: 30.00,
          isOpen: false,
          address: 'Av. Brigadeiro Faria Lima, 567',
          favoritesSince: '2024-01-05T15:30:00Z'
        }
      ])
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleRemoveFavorite = (restaurantId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== restaurantId))
  }

  const handleOrderFrom = (slug: string) => {
    window.location.href = `/${slug}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <PWAHeader title="Favoritos" showBackButton={true} noBorder={true} className="lg:hidden" />
        <div className="container mx-auto px-4 pt-20 lg:pt-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-4">
      <PWAHeader title="Favoritos" showBackButton={true} noBorder={true} className="lg:hidden" />
      
      <div className="container mx-auto px-4 pt-20 lg:pt-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              Nenhum favorito ainda
            </h3>
            <p className="text-slate-600 mb-6">
              Adicione restaurantes aos favoritos para encontrá-los rapidamente
            </p>
            <Button 
              onClick={() => window.history.back()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Explorar restaurantes
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((restaurant) => (
              <div key={restaurant.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                <div className="flex gap-4">
                  {/* Avatar do restaurante */}
                  <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {restaurant.avatar ? (
                      <Image
                        src={restaurant.avatar}
                        alt={restaurant.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-600">
                        {restaurant.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Informações do restaurante */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-slate-900 truncate">
                          {restaurant.name}
                        </h3>
                        <p className="text-sm text-slate-600 truncate">
                          {restaurant.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-2">
                        {restaurant.isOpen ? (
                          <Badge className="bg-green-100 text-green-700 text-xs border-green-200">
                            Aberto
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 text-xs border-red-200">
                            Fechado
                          </Badge>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFavorite(restaurant.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Informações adicionais */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{restaurant.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{restaurant.deliveryTime} min</span>
                      </div>
                      <span>Taxa: R$ {restaurant.deliveryFee.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{restaurant.address}</span>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">
                      Favoritado em {formatDate(restaurant.favoritesSince)}
                    </p>

                    {/* Ações */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Mínimo: R$ {restaurant.minimumOrder.toFixed(2)}
                      </span>
                      
                      <Button
                        size="sm"
                        onClick={() => handleOrderFrom(restaurant.slug)}
                        disabled={!restaurant.isOpen}
                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 h-8"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        {restaurant.isOpen ? 'Pedir' : 'Fechado'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile Sheet - Global */}
      <UserProfileSheet />
    </div>
  )
}
