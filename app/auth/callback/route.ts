import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  console.log("CALLBACK PARAMS:", Object.fromEntries(searchParams))
  console.log("FULL URL:", request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

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

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, is_admin, is_provider')
      .eq('auth_user_id', user.id)
      .single()

    if (profile?.is_admin) return NextResponse.redirect(new URL('/admin', request.url))
    if (profile?.is_provider) return NextResponse.redirect(new URL('/proveedor', request.url))

    if (profile?.id) {
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id, verified')
        .eq('profile_id', profile.id)
        .single()

      if (providerProfile && !providerProfile.verified) {
        return NextResponse.redirect(new URL('/proveedor/perfil', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/cliente', request.url))
}
