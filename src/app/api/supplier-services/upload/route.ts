import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'
import { ImageService } from '@/lib/services/image-service'
import { ImageType } from '@/lib/services/image-types'

// For processing images with sharp (needs Node.js runtime)
export const runtime = 'nodejs'

// Upload de imagem para produtos de fornecedor (SupplierService) antes/independente da criação
// A imagem é vinculada ao supplierId como entityId; depois o produto armazenará somente a URL
export async function POST(req: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: req.headers })
    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Recuperar supplier via company (activeOrganizationId) se existir
    const activeCompanyId = sessionResponse.session?.activeOrganizationId
    if (!activeCompanyId) {
      return NextResponse.json({ error: 'Empresa ativa não encontrada na sessão' }, { status: 400 })
    }
    const supplier = await prisma.supplier.findUnique({ where: { companyId: activeCompanyId } })
    if (!supplier) {
      return NextResponse.json({ error: 'Fornecedor não vinculado à empresa' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Upload padronizado usando ImageService
    const imageService = ImageService.getInstance()
    const uploaded = await imageService.uploadImage(file, {
      type: ImageType.PRODUCT_IMAGE,
      entityId: supplier.id,
      category: 'supplier-service'
    })

    return NextResponse.json({
      id: uploaded.id,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl,
      originalName: uploaded.originalName,
      size: uploaded.size
    }, { status: 201 })
  } catch (err) {
    console.error('Erro upload supplier product:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
