import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
    }

    await supabase
      .from('bookings')
      .update({ status: 'en_proceso' })
      .eq('id', bookingId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
