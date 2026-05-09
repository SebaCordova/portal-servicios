/**
 * POST /api/bookings/validar
 *
 * El cliente valida el trabajo — dispara el cobro real con Flow.cl.
 * Solo el cliente dueño del booking puede validar.
 * El booking debe estar en estado 'completado'.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let bookingId: string
  try {
    const body = await request.json()
    bookingId = body.bookingId
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId requerido' }, { status: 422 })
  }

  // Verificar que el usuario es el cliente del booking
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, status, client_id, monto_total, propuesta_id')
    .eq('id', bookingId)
    .eq('client_id', profile.id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
  }

  if (booking.status !== 'completado') {
    return NextResponse.json(
      { error: `No se puede validar un booking en estado '${booking.status}'` },
      { status: 409 }
    )
  }

  // Actualizar estado a pendiente_pago y registrar fecha de validación
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'pendiente_pago',
      validated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('[validar] Error actualizando booking:', updateError)
    return NextResponse.json({ error: 'Error al validar el booking' }, { status: 500 })
  }

  // TODO: Llamar a Flow.cl para procesar el pago
  // Una vez implementado el webhook, esto disparará flowProcessPayment()
  // y el webhook de Flow confirmará el pago actualizando a 'pagado'

  // Por ahora en la beta: notificar al admin para procesar el pago manualmente
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/pago-listo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, monto: booking.monto_total }),
    })
  } catch (err) {
    console.warn('[validar] Error enviando notificación de pago:', err)
  }

  return NextResponse.json({ ok: true, message: 'Trabajo validado. Procesando pago.' })
}
