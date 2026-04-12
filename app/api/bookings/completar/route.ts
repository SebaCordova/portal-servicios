import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
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
          }
        }
      }
    )

    await supabase
      .from('bookings')
      .update({ status: 'completado' })
      .eq('id', bookingId)

    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id, total_clp, scheduled_at,
        propuestas!propuesta_id (
          solicitudes!solicitud_id (
            categories ( name ),
            profiles!cliente_id ( full_name, auth_user_id )
          )
        )
      `)
      .eq('id', bookingId)
      .single()

    const solicitud = (booking?.propuestas as any)?.solicitudes
    const clienteProfile = solicitud?.profiles
    const categoria = solicitud?.categories?.name ?? 'Servicio'

    if (clienteProfile?.auth_user_id) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

      const adminRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${clienteProfile.auth_user_id}`,
        { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey! } }
      )

      if (adminRes.ok) {
        const emailCliente = (await adminRes.json())?.email
        const nombreCliente = clienteProfile.full_name ?? 'Cliente'

        if (emailCliente) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL ?? 'ServiChile <onboarding@resend.dev>',
              to: emailCliente,
              subject: `¿Cómo te fue con ${categoria}?`,
              html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem"><h1>ServiChile</h1><p>Hola ${nombreCliente}, tu servicio de <strong>${categoria}</strong> fue marcado como completado.</p><p>¿Cómo te fue? Tu opinión ayuda a otros clientes.</p><a href="${SITE_URL}/cliente/mis-pedidos?resena=${bookingId}" style="background:#1dbf73;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Dejar mi reseña</a></div>`
            })
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error completando booking:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
