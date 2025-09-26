'use server'

import { prisma } from '@/lib/database/prisma'
import type { SupplierCategory, Prisma } from "@prisma/client"

export interface SupplierSearchFilters {
  category?: SupplierCategory
  location?: string
  verified?: boolean
  minRating?: number
  services?: string[]
}

export interface SupplierSearchParams {
  query?: string
  filters?: SupplierSearchFilters
  sortBy?: 'rating' | 'partnerships' | 'responseTime' | 'established'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface SupplierSearchResult {
  id: string
  name: string
  category: SupplierCategory
  description: string
  location: string
  rating: number
  reviewCount: number
  services: string[]
  products: string[]
  deliveryTime: string
  minOrder: string
  established: string
  verified: boolean
  responseTime: string
  partnerships: number
  email: string
  phone: string
  website: string
  logoUrl?: string
  bannerUrl?: string
}

export interface SupplierSearchResponse {
  suppliers: SupplierSearchResult[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export async function searchSuppliers(params: SupplierSearchParams = {}): Promise<SupplierSearchResponse> {
  try {
    const {
      query = '',
      filters = {},
      sortBy = 'rating',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = params

    // Build where clause
    const where: Prisma.SupplierWhereInput = {
      isActive: true,
      company: {
        isActive: true
      }
    }

    // Add search query filter
    if (query) {
      where.OR = [
        {
          company: {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          }
        },
        {
          company: {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          }
        },
        {
          services: {
            some: {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          }
        }
      ]
    }

    // Add category filter
    if (filters.category) {
      where.category = filters.category
    }

    // Add location and verified filters by reconstructing the company filter
    const companyFilters: Prisma.CompanyWhereInput[] = [{ isActive: true }]
    
    if (filters.location) {
      companyFilters.push({
        OR: [
          {
            city: {
              contains: filters.location,
              mode: 'insensitive'
            }
          },
          {
            state: {
              contains: filters.location,
              mode: 'insensitive'
            }
          }
        ]
      })
    }

    if (filters.verified !== undefined) {
      companyFilters.push({ isVerified: filters.verified })
    }

    if (companyFilters.length > 1) {
      where.company = {
        AND: companyFilters
      }
    }

    // Add minimum rating filter
    if (filters.minRating) {
      where.rating = {
        gte: filters.minRating
      }
    }

    // Build orderBy clause
    let orderBy: Prisma.SupplierOrderByWithRelationInput = {}
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: sortOrder }
        break
      case 'partnerships':
        orderBy = { partnerships: { _count: sortOrder } }
        break
      case 'responseTime':
        orderBy = { responseTime: sortOrder === 'asc' ? 'asc' : 'desc' }
        break
      case 'established':
        orderBy = { company: { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' } }
        break
      default:
        orderBy = { rating: 'desc' }
    }

    // Get suppliers from database
    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        company: true,
        services: {
          where: { isActive: true }
        },
        partnerships: {
          where: { status: 'ACTIVE' }
        },
        _count: {
          select: {
            partnerships: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    })

    // Get total count
    const total = await prisma.supplier.count({ where })

    // Transform data to match interface
    const transformedSuppliers: SupplierSearchResult[] = suppliers.map(supplier => {
      const location = `${supplier.company.city || 'Cidade não informada'}, ${supplier.company.state || 'Estado não informado'}`

      // Extract unique service names and categories
      const services = supplier.services.map(service => service.name)
      const products = supplier.services.map(service => service.category).filter(Boolean)

      return {
        id: supplier.id,
        name: supplier.company.name,
        category: supplier.category,
        description: supplier.company.description || 'Descrição não informada',
        location,
        rating: supplier.rating || 0,
        reviewCount: supplier.totalReviews || 0,
        services: [...new Set(services)], // Remove duplicates
        products: [...new Set(products)], // Remove duplicates
        deliveryTime: supplier.averageDeliveryTime ? `${supplier.averageDeliveryTime} dias` : 'Consultar',
        minOrder: supplier.minOrderValue ? `R$ ${supplier.minOrderValue}` : 'Consultar',
        established: supplier.company.createdAt.getFullYear().toString(),
        verified: supplier.company.isVerified || false,
        responseTime: `${supplier.responseTime}h`,
        partnerships: supplier._count.partnerships,
        email: supplier.company.email,
        phone: supplier.company.phone || 'Não informado',
        website: supplier.company.website || '',
        logoUrl: supplier.company.logo || undefined,
        bannerUrl: supplier.company.banner || undefined
      }
    })

    const hasNextPage = (page * limit) < total
    const hasPrevPage = page > 1

    return {
      suppliers: transformedSuppliers,
      total,
      page,
      limit,
      hasNextPage,
      hasPrevPage
    }

  } catch (error) {
    console.error('Error searching suppliers:', error)
    
    // Fallback to mock data if database query fails
    return getFallbackData(params)
  }
}

// Fallback mock data function
async function getFallbackData(params: SupplierSearchParams): Promise<SupplierSearchResponse> {
  const { page = 1, limit = 12 } = params
  
  const mockSuppliers: SupplierSearchResult[] = [
    {
      id: '1',
      name: 'Distribuidora ABC Foods',
      category: 'FOOD_INGREDIENTS',
      description: 'Especializada em distribuição de alimentos frescos e congelados para empresas',
      location: 'São Paulo, SP',
      rating: 4.8,
      reviewCount: 124,
      services: ['Distribuição', 'Logística', 'Armazenagem'],
      products: ['Carnes', 'Vegetais', 'Laticínios', 'Congelados'],
      deliveryTime: '24-48h',
      minOrder: 'R$ 500',
      established: '2018',
      verified: true,
      responseTime: '2h',
      partnerships: 45,
      email: 'contato@abcfoods.com.br',
      phone: '(11) 99999-9999',
      website: 'www.abcfoods.com.br'
    },
    {
      id: '2',
      name: 'Tech Solutions Pro',
      category: 'TECHNOLOGY',
      description: 'Soluções tecnológicas para automação de empresas e delivery',
      location: 'Rio de Janeiro, RJ',
      rating: 4.9,
      reviewCount: 87,
      services: ['Desenvolvimento', 'Consultoria', 'Suporte 24/7'],
      products: ['PDV', 'Apps', 'Integração', 'Analytics'],
      deliveryTime: '1-2 semanas',
      minOrder: 'Sob consulta',
      established: '2020',
      verified: true,
      responseTime: '1h',
      partnerships: 32,
      email: 'contato@techsolutions.com.br',
      phone: '(21) 88888-8888',
      website: 'www.techsolutions.com.br'
    }
  ]

  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedSuppliers = mockSuppliers.slice(startIndex, endIndex)

  return {
    suppliers: paginatedSuppliers,
    total: mockSuppliers.length,
    page,
    limit,
    hasNextPage: endIndex < mockSuppliers.length,
    hasPrevPage: page > 1
  }
}