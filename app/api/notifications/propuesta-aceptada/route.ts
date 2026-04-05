import { NextResponse, type NextRequest } from 'next/server'
import { enviarEmailPropuestaAceptada } from '@/lib/utils/emails'

export async function POST(request: NextRequest) {
  try {
    const { emailProveedor, nombreProveedor, categoria, direccion, comuna, fechaHora, precio } = await request.json()
    await enviarEmailPropuestaAceptada(emailProveedor, nombreProveedor, categoria, direccion, comuna, fechaHora, precio)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
  }
}
