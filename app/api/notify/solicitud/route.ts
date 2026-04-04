import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { enviarEmailNuevaSolicitudProveedor } from '@/lib/utils/emails'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const { solicitudId, categoryId, comuna } = await request.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: solicitud } = await supabase
      .from('solicitudes')
      .select('fecha_inicio, fecha_fin, categories ( name )')
      .eq('id', solicitudId)
      .single()

    if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

    const { data: proveedoresEnComuna } = await supabase
      .from('provider_zones')
      .select('provider_id')
      .eq('comuna', comuna)

    const providerIds = proveedoresEnComuna?.map(p => p.provider_id) ?? []
    if (providerIds.length === 0) return NextResponse.json({ ok: true, enviados: 0 })

    const { data: proveedoresConCategoria } = await supabase
      .from('services')
      .select('provider_id')
      .eq('category_id', categoryId)
      .eq('active', true)
      .in('provider_id', providerIds)

    const providerIdsFinales = [...new Set(proveedoresConCategoria?.map(p => p.provider_id) ?? [])]
    if (providerIdsFinales.length === 0) return NextResponse.json({ ok: true, enviados: 0 })

    const { data: perfiles } = await supabase
      .from('provider_profiles')
      .select('profiles ( full_name, email )')
      .in('id', providerIdsFinales)
      .eq('verified', true)

    let enviados = 0
    for (const p of perfiles ?? []) {
      const profile = p.profiles as any
      if (profile?.email) {
        await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'ServiChile <onboarding@resend.dev>',
    to: profile.email,
    subject: `Nueva solicitud en tu zona: ${(solicitud.categories as any)?.name}`,
console.log('URL en email:', 'https://portal-servicios-g0arrx476-sebacordovas-projects.vercel.app/proveedor')
    html: `<p>Hola ${profile.full_name ?? 'Proveedor'},</p><p>Un cliente necesita <strong>${(solicitud.categories as any)?.name}</strong> en <strong>${comuna}</strong>.</p><p>Fechas: ${solicitud.fecha_inicio} → ${solicitud.fecha_fin}</p><a href="https://portal-servicios-g0arrx476-sebacordovas-projects.vercel.app/proveedor" style="background:#1dbf73;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver solicitud</a>`
  })
})
        enviados++
      }
    }

    return NextResponse.json({ ok: true, enviados })
  } catch (error) {
    console.error('Error enviando notificaciones:', error)
    return NextResponse.json({ error: 'Error enviando notificaciones' }, { status: 500 })
  }
}
