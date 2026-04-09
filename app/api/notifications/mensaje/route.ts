import { NextResponse, type NextRequest } from 'next/server'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { emailDestinatario, nombreDestinatario, nombreRemitente, categoria, solicitudId } = await request.json()
    if (!emailDestinatario) return NextResponse.json({ ok: true })
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'ServiChile <onboarding@resend.dev>',
        to: emailDestinatario,
        subject: `Nuevo mensaje de ${nombreRemitente}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem"><h1>Servi<span style="color:#1dbf73">Chile</span></h1><p>Hola ${nombreDestinatario}, <strong>${nombreRemitente}</strong> te envió un mensaje sobre <strong>${categoria}</strong>.</p><a href="${SITE_URL}/mensajes/${solicitudId}" style="background:#1dbf73;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver mensaje</a></div>`
      })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
