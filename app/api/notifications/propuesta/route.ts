import { NextResponse, type NextRequest } from 'next/server'
import { enviarEmailNuevaPropuesta } from '@/lib/utils/emails'

export async function POST(request: NextRequest) {
  try {
    const { emailCliente, nombreCliente, nombreProveedor, categoria, precio, fechaHora } = await request.json()
    await enviarEmailNuevaPropuesta(emailCliente, nombreCliente, nombreProveedor, categoria, precio, fechaHora)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
  }
}
