/**
 * POST /api/bookings/apelar
 *
 * El proveedor apela una disputa — presenta su evidencia.
 * Solo el proveedor dueño del booking puede apelar.
 * El booking debe estar en estado 'en_disputa'.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let bookingId: string, evidenciaUrl: string, descripcion: string
  try {
    const body = await request.json()
    bookingId    = body.bookingId
    evidenciaUrl = body.evidenciaUrl
    descripcion  = body.descripcion
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!bookingId || !descripcion?.trim()) {
    return NextResponse.json({ error: 'bookingId y descripcion son requeridos' }, { status: 422 })
  }

  // Verificar que el usuario es el proveedor del booking
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_provider')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile?.is_provider) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Verificar que el proveedor es dueño del booking vía propuesta
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status,
      propuestas!inner(
        proveedor_id,
        provider_profiles!inner(profile_id)
      )
    `)
    .eq('id', bookingId)
    .eq('status', 'en_disputa')
    .single()

  const proveedorProfileId = (booking?.propuestas as any)?.provider_profiles?.profile_id
  if (!booking || proveedorProfileId !== profile.id) {
    return NextResponse.json({ error: 'Booking no encontrado o no autorizado' }, { status: 404 })
  }

  // Actualizar la disputa con la evidencia del proveedor
  const { error: disputaError } = await supabase
    .from('disputas')
    .update({
      evidencia_url: evidenciaUrl ?? null,
      resolucion: `Apelación del proveedor: ${descripcion.trim()}`,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId)
    .eq('estado', 'abierta')

  if (disputaError) {
    console.error('[apelar] Error actualizando disputa:', disputaError)
    return NextResponse.json({ error: 'Error al registrar la apelación' }, { status: 500 })
  }

  // Notificar al admin que el proveedor apeló
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/apelacion-recibida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, descripcion }),
    })
  } catch (err) {
    console.warn('[apelar] Error enviando notificación de apelación:', err)
  }

  return NextResponse.json({
    ok: true,
    message: 'Apelación registrada. Nuestro equipo revisará la evidencia en 48 horas.',
  })
}
