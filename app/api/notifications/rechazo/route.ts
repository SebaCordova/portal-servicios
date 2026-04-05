import { NextResponse, type NextRequest } from 'next/server'
import { enviarEmailRechazo } from '@/lib/utils/emails'

export async function POST(request: NextRequest) {
  try {
    const { email, nombre } = await request.json()
    await enviarEmailRechazo(email, nombre)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
  }
}
