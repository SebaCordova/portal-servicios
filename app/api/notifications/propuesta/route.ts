import { NextResponse, type NextRequest } from 'next/server'
import { enviarEmailNuevaPropuesta } from '@/lib/utils/emails'

export async function POST(request: NextRequest) {
  try {
    const { emailCliente, nombreCliente, nombreProveedor, categoria, precio, fechaHora } = await request.json()

    if (!emailCliente) return NextResponse.json({ error: 'Email no encontrado' }, { status: 400 })

    await enviarEmailNuevaPropuesta(emailCliente, nombreCliente, nombreProveedor, categoria, precio, fechaHora)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error enviando email propuesta:', error)
    return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
  }
}
