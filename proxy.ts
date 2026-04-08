import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/api/webhooks']

const ROLE_ROUTES: Record<string, string> = {
  admin:     '/admin',
  proveedor: '/proveedor',
  cliente:   '/cliente',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  if (isPublic) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Bug #2 fix: ahora se lee is_admin también para asignar el rol correcto
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_provider')
    .eq('auth_user_id', user.id)
    .single()

  const rol = profile?.is_admin
    ? 'admin'
    : profile?.is_provider
      ? 'proveedor'
      : 'cliente'

  const rutaPermitida = ROLE_ROUTES[rol]

  const intentandoRutaAjena = Object.values(ROLE_ROUTES)
    .filter(r => r !== rutaPermitida)
    .some(r => pathname.startsWith(r))

  if (intentandoRutaAjena) {
    return NextResponse.redirect(new URL(rutaPermitida, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
