import { NextResponse, type NextRequest } from 'next/server'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { emailCliente, nombreCliente, nombreProveedor, categoria, precio, fechaHora } = await request.json()
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'ServiChile <onboarding@resend.dev>',
        to: emailCliente,
        subject: `Nueva propuesta recibida: ${categoria}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem"><h1>Servi<span style="color:#1dbf73">Chile</span></h1><p>Hola ${nombreCliente}, <strong>${nombreProveedor}</strong> envió una propuesta para <strong>${categoria}</strong> por $${Number(precio).toLocaleString('es-CL')}.</p><a href="${SITE_URL}/cliente/mis-pedidos" style="background:#1dbf73;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver propuesta</a></div>`
      })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
