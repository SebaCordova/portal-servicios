import { NextResponse, type NextRequest } from 'next/server'
import { enviarEmailNuevoMensaje } from '@/lib/utils/emails'

export async function POST(request: NextRequest) {
  try {
    const { emailDestinatario, nombreDestinatario, nombreRemitente, categoria, solicitudId } = await request.json()

    if (!emailDestinatario) return NextResponse.json({ ok: true })

    await enviarEmailNuevoMensaje(emailDestinatario, nombreDestinatario, nombreRemitente, categoria, solicitudId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error enviando email mensaje:', error)
    return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
  }
}
