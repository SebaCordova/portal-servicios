import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer, getClientEmail } from '@/lib/supabase/server'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    const supabase = await createSupabaseServer()

    // 🔒 VERIFICACIÓN DE AUTORIZACIÓN
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, is_provider')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile?.is_provider) {
      return NextResponse.json({ error: 'No eres proveedor' }, { status: 403 })
    }

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('id')
      .eq('profile_id', userProfile.id)
      .single()

    if (!providerProfile) {
      return NextResponse.json({ error: 'Perfil de proveedor no encontrado' }, { status: 403 })
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, propuesta_id, propuestas!propuesta_id(proveedor_id)')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
    }

    const propuesta = (booking.propuestas as any)
    if (propuesta?.proveedor_id !== providerProfile.id) {
      return NextResponse.json({ error: 'No tienes permiso para completar este booking' }, { status: 403 })
    }

    await supabase
      .from('bookings')
      .update({ status: 'completado' })
      .eq('id', bookingId)

    const { data: completedBooking } = await supabase
      .from('bookings')
      .select('id, total_clp, scheduled_at, propuestas!propuesta_id(solicitudes!solicitud_id(categories(name), profiles!cliente_id(full_name, auth_user_id)))')
      .eq('id', bookingId)
      .single()

    const solicitud = (completedBooking?.propuestas as any)?.solicitudes
    const clienteProfile = solicitud?.profiles
    const categoria = solicitud?.categories?.name ?? 'Servicio'

    if (clienteProfile?.auth_user_id) {
      const emailCliente = await getClientEmail(clienteProfile.auth_user_id)
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

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error completando booking:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
