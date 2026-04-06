import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, nombre } = await request.json()
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ServiChile <onboarding@resend.dev>',
        to: email,
        subject: 'Actualización sobre tu solicitud de proveedor',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem"><h1>Servi<span style="color:#1dbf73">Chile</span></h1><p>Hola ${nombre}, no pudimos aprobar tu cuenta en este momento. Si tienes dudas, responde este email.</p></div>`
      })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
