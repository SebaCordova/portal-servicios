import { NextResponse, type NextRequest } from 'next/server'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { emailProveedor, nombreProveedor, categoria, direccion, comuna, fechaHora, precio } = await request.json()
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ServiChile <onboarding@resend.dev>',
        to: emailProveedor,
        subject: `¡Tu propuesta fue aceptada! ${categoria}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem"><h1>Servi<span style="color:#1dbf73">Chile</span></h1><p>Hola ${nombreProveedor}, tu propuesta para <strong>${categoria}</strong> fue aceptada.</p><p>📍 ${direccion}, ${comuna}</p><p>📅 ${fechaHora}</p><p>💰 $${Number(precio).toLocaleString('es-CL')}</p><a href="${SITE_URL}/proveedor" style="background:#1dbf73;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver en dashboard</a></div>`
      })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
