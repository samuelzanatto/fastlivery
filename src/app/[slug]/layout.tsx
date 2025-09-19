import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import { prisma } from '@/lib/prisma'

interface LayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: resolvedParams.slug }
  })

  if (!restaurant) {
    return {
      title: 'Restaurante não encontrado'
    }
  }

  return {
    title: restaurant.name,
    description: restaurant.description || `${restaurant.name} - Delivery e Takeout`,
  }
}

export default async function RestaurantLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: resolvedParams.slug }
  })

  if (!restaurant) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}