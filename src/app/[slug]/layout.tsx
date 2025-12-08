import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import { prisma } from '@/lib/database/prisma'

interface LayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const business = await prisma.business.findFirst({
    where: { slug: resolvedParams.slug }
  })

  if (!business) {
    return {
      title: 'Empresa não encontrada'
    }
  }

  return {
    title: business.name,
    description: business.description || `${business.name} - Delivery e Takeout`,
    manifest: `/${resolvedParams.slug}/manifest.json`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: business.name,
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
    }
  }
}

export default async function BusinessLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params
  const business = await prisma.business.findFirst({
    where: { slug: resolvedParams.slug }
  })

  if (!business) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}