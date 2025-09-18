import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextRequest, NextResponse } from "next/server"

const handler = toNextJsHandler(auth.handler)

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://192.168.1.106:3000',
  process.env.NEXT_PUBLIC_APP_URL || ''
].filter(Boolean)

function corsHeaders(origin: string | null) {
  const headers: Record<string,string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie, Set-Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

async function withCors(request: NextRequest, exec: () => Promise<Response>) {
  const origin = request.headers.get('origin')
  const base = await exec()
  const response = base instanceof NextResponse ? base : new NextResponse(base.body, { status: base.status, headers: base.headers })
  const headers = corsHeaders(origin)
  Object.entries(headers).forEach(([k,v]) => response.headers.set(k,v))
  return response
}

export async function GET(request: NextRequest) {
  return withCors(request, () => handler.GET(request))
}

export async function POST(request: NextRequest) {
  return withCors(request, () => handler.POST(request))
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}
