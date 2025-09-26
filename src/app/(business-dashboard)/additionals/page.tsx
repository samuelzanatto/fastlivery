import { Suspense } from 'react'
import { getAdditionals } from '@/actions/additionals'
import { AdditionalsClientPage } from './client-page'

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
  }>
}

// Componente wrapper para isolar o acesso a searchParams
async function AdditionalsContent({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '10')
  const search = params.search || ''

  const result = await getAdditionals(page, limit, search)

  if (!result.success) {
    throw new Error(result.error)
  }

  return (
    <AdditionalsClientPage 
      initialData={result.data}
      initialPage={page}
      initialLimit={limit}
      initialSearch={search}
    />
  )
}

export default function AdditionalsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdditionalsPageSkeleton />}>
      <AdditionalsContent searchParams={searchParams} />
    </Suspense>
  )
}

function AdditionalsPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
      <div className="h-64 bg-slate-100 rounded animate-pulse" />
    </div>
  )
}