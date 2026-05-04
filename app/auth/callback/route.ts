import { createSupabaseServer } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const intent     = searchParams.get('intent') // 'provider_registration' | null

  const supabase = await createSupabaseServer()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  // Garantizar que el perfil existe — si el trigger falló, lo creamos aquí
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin, is_provider')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        auth_user_id: user.id,
        full_name: user.user_metadata?.full_name ?? 'Sin nombre',
        email: user.email,
        is_client: true,
        is_provider: false,
      })
      .select('id, is_admin, is_provider')
      .single()

    if (insertError || !newProfile) {
      console.error('[auth/callback] Error creando perfil:', insertError)
      return NextResponse.redirect(new URL('/login?error=profile_creation_failed', request.url))
    }
    profile = newProfile
  }

  if (profile?.is_admin)    return NextResponse.redirect(new URL('/admin', request.url))
  if (profile?.is_provider) return NextResponse.redirect(new URL('/proveedor', request.url))

  // Proveedor en proceso de registro (paso 2)
  // Los datos están en sessionStorage del browser — /cuenta los envía al endpoint
  if (intent === 'provider_registration') {
    return NextResponse.redirect(new URL('/cuenta?complete_registration=1', request.url))
  }

  // Proveedor pendiente de aprobación (ya registrado, aún no verificado)
  if (profile?.id) {
    const { data: pp } = await supabase
      .from('provider_profiles')
      .select('id, verified')
      .eq('profile_id', profile.id)
      .maybeSingle()
    if (pp && !pp.verified) return NextResponse.redirect(new URL('/cuenta', request.url))
  }

  return NextResponse.redirect(new URL('/cliente', request.url))
}
