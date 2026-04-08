import { NextResponse, type NextRequest } from 'next/server'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function POST(request: NextRequest) {
  try {
    const { nombre } = await request.json()

    if (ADMIN_EMAIL && RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'ServiChile <onboarding@resend.dev>',
          to: ADMIN_EMAIL,
          subject: `Nueva solicitud de proveedor: ${nombre}`,
          html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;"><h1 style="font-size:24px;font-weight:800;color:#222;">Servi<span style="color:#1dbf73;">Chile</span></h1><p style="color:#444;font-size:14px;line-height:1.6;"><strong>${nombre}</strong> ha enviado una solicitud para convertirse en proveedor.</p><div style="text-align:center;margin:2rem 0;"><a href="${SITE_URL}/admin/proveedores" style="background:#1dbf73;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Revisar solicitud</a></div></div>`
        })
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error en solicitud-proveedor:', error)
    return NextResponse.json({ error: 'Error enviando notificación' }, { status: 500 })
  }
}
