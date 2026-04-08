import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const RESEND_API_KEY = process.env.RESEND_API_KEY

async function sendEmail(to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'ServiChile <onboarding@resend.dev>', to, subject, html })
  })
}

export async function POST(request: NextRequest) {
  try {
    const { solicitudId, categoryId, comuna } = await request.json()
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookiesToSet) => { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } } }
    )

    const { data: solicitud } = await supabase.from('solicitudes').select('fecha_inicio, fecha_fin, categories ( name )').eq('id', solicitudId).single()
    if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

    const { data: proveedoresEnComuna } = await supabase.from('provider_zones').select('provider_id').eq('comuna', comuna)
    const providerIds = proveedoresEnComuna?.map(p => p.provider_id) ?? []
    if (providerIds.length === 0) return NextResponse.json({ ok: true, enviados: 0 })

    const { data: proveedoresConCategoria } = await supabase.from('services').select('provider_id').eq('category_id', categoryId).eq('active', true).in('provider_id', providerIds)
    const providerIdsFinales = [...new Set(proveedoresConCategoria?.map(p => p.provider_id) ?? [])]
    if (providerIdsFinales.length === 0) return NextResponse.json({ ok: true, enviados: 0 })

    // Fix: profiles no tiene columna email — el email vive en auth.users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    const { data: perfiles } = await supabase.from('provider_profiles').select('profiles ( full_name, auth_user_id )').in('id', providerIdsFinales).eq('verified', true)

    const categoria = (solicitud.categories as any)?.name ?? 'Servicio'
    let enviados = 0

    for (const p of perfiles ?? []) {
      const profile = p.profiles as any
      if (!profile?.auth_user_id || !serviceRoleKey) continue
      const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${profile.auth_user_id}`, { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } })
      if (!adminRes.ok) continue
      const email = (await adminRes.json())?.email
      if (!email) continue
      await sendEmail(email, `Nueva solicitud en tu zona: ${categoria}`, `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem;"><h1 style="font-size:24px;font-weight:800;color:#222;">Servi<span style="color:#1dbf73;">Chile</span></h1><div style="background:#fef3c7;border-radius:12px;padding:1.5rem;margin:1.5rem 0;"><p style="color:#92400e;font-size:14px;font-weight:600;margin:0;">📋 Nueva solicitud en ${comuna}</p></div><p style="color:#444;font-size:14px;line-height:1.6;">Hola ${profile.full_name ?? 'Proveedor'}, un cliente necesita <strong>${categoria}</strong>.</p><p style="color:#444;font-size:14px;">Fechas: ${solicitud.fecha_inicio} → ${solicitud.fecha_fin}</p><div style="text-align:center;margin:2rem 0;"><a href="${SITE_URL}/proveedor" style="background:#1dbf73;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Ver solicitud</a></div></div>`)
      enviados++
    }

    return NextResponse.json({ ok: true, enviados })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error enviando notificaciones' }, { status: 500 })
  }
}
