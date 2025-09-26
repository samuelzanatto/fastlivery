import { NextRequest, NextResponse } from 'next/server'

// Mock database - substituir por banco real
const mockBusinesses = [
  {
    id: '1',
    slug: 'pizzaria-do-joao',
    name: 'Pizzaria do João',
    description: 'As melhores pizzas da cidade com ingredientes frescos e massa artesanal',
    avatar: '/placeholder-business.jpg',
    banner: '/placeholder-banner.jpg',
    isOpen: true,
    category: 'Pizzaria',
    rating: 4.5,
    deliveryTime: 30,
    address: 'Rua das Flores, 123 - Centro',
    openingHours: '18:00 - 23:30',
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsDineIn: true,
    deliveryFee: 5.00,
    minimumOrder: 20.00,
    ownerId: 'user1'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')

    let businesses = mockBusinesses.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      avatar: r.avatar,
      isOpen: r.isOpen,
      category: r.category,
      rating: r.rating,
      deliveryTime: r.deliveryTime,
      address: r.address,
      openingHours: r.openingHours,
      acceptsDelivery: r.acceptsDelivery,
      acceptsPickup: r.acceptsPickup,
      acceptsDineIn: r.acceptsDineIn,
      deliveryFee: r.deliveryFee,
      minimumOrder: r.minimumOrder
    }))
    
    // Filtrar por busca
    if (search) {
      const searchLower = search.toLowerCase()
      businesses = businesses.filter(r => 
        r.name.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.category.toLowerCase().includes(searchLower)
      )
    }
    
    // Filtrar por categoria
    if (category) {
      businesses = businesses.filter(r => r.category === category)
    }
    
    return NextResponse.json({
      businesses,
      total: businesses.length
    })
  } catch (error) {
    console.error('Erro ao buscar empresas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
