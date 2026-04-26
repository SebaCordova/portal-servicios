import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.is_admin)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { providerProfileId, profileId } = await request.json()

  const [r1, r2, r3] = await Promise.all([
    adminClient.from('provider_profiles').update({ verified: true }).eq('id', providerProfileId),
    adminClient.from('profiles').update({ is_provider: true }).eq('id', profileId),
    adminClient.from('services').update({ active: true }).eq('provider_id', providerProfileId),
  ])

  const errors = [r1.error, r2.error, r3.error].filter(Boolean)
  if (errors.length > 0) {
    console.error('[aprobar-proveedor] Errores al aprobar:', errors)
    return NextResponse.json({ error: 'Error al aprobar proveedor' }, { status: 500 })
  }

  // TODO: enviar email de bienvenida al proveedor aprobado
  return NextResponse.json({ ok: true })
}
