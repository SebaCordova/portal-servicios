/**
 * POST /api/bookings/rechazar
 *
 * El cliente rechaza el trabajo — abre una disputa.
 * Solo el cliente dueño del booking puede rechazar.
 * El booking debe estar en estado 'completado'.
 * El cliente debe proveer un motivo.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let bookingId: string, motivo: string, evidenciaUrl: string | undefined
  try {
    const body = await request.json()
    bookingId   = body.bookingId
    motivo      = body.motivo
    evidenciaUrl = body.evidenciaUrl
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!bookingId || !motivo?.trim()) {
    return NextResponse.json({ error: 'bookingId y motivo son requeridos' }, { status: 422 })
  }

  // Verificar que el usuario es el cliente del booking
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, bloqueado')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  if (profile.bloqueado) {
    return NextResponse.json({ error: 'Tu cuenta está suspendida.' }, { status: 403 })
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, status, client_id')
    .eq('id', bookingId)
    .eq('client_id', profile.id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
  }

  if (booking.status !== 'completado') {
    return NextResponse.json(
      { error: `No se puede rechazar un booking en estado '${booking.status}'` },
      { status: 409 }
    )
  }

  // Actualizar booking a en_disputa
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'en_disputa',
      rejected_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('[rechazar] Error actualizando booking:', updateError)
    return NextResponse.json({ error: 'Error al abrir la disputa' }, { status: 500 })
  }

  // Crear registro de disputa
  const { error: disputaError } = await supabase
    .from('disputas')
    .insert({
      booking_id:    bookingId,
      abierta_por:   profile.id,
      motivo:        motivo.trim(),
      evidencia_url: evidenciaUrl ?? null,
      estado:        'abierta',
    })

  if (disputaError) {
    console.error('[rechazar] Error creando disputa:', disputaError)
    return NextResponse.json({ error: 'Error al registrar la disputa' }, { status: 500 })
  }

  // Notificar al admin
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/disputa-abierta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, motivo }),
    })
  } catch (err) {
    console.warn('[rechazar] Error enviando notificación de disputa:', err)
  }

  return NextResponse.json({
    ok: true,
    message: 'Disputa registrada. Nuestro equipo la revisará en 48 horas.',
  })
}
