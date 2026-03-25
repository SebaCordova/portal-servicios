import { NextResponse, type NextRequest } from 'next/server'
import { enviarEmailAprobacion, enviarEmailRechazo, enviarEmailNuevaSolicitud } from '@/lib/utils/emails'

export async function POST(request: NextRequest) {
  try {
    const { tipo, email, nombre } = await request.json()

    if (tipo === 'aprobacion') {
      await enviarEmailAprobacion(email, nombre)
    } else if (tipo === 'rechazo') {
      await enviarEmailRechazo(email, nombre)
    } else if (tipo === 'nueva_solicitud') {
      await enviarEmailNuevaSolicitud(nombre)
    } else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error enviando email:', error)
    return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
  }
}
