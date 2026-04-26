import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/categorias', '/auth/callback', '/solicitar', '/registro-proveedor', '/cuenta']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return true
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 2 && parts[0] === 'proveedor') return true
  return false
}

const ROLE_ROUTES: Record<string, string> = {
  admin:     '/admin',
  proveedor: '/proveedor',
  cliente:   '/cliente',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublicRoute(pathname)) return NextResponse.next()

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_provider')
    .eq('auth_user_id', user.id)
    .single()

  const rol = profile?.is_admin ? 'admin' : profile?.is_provider ? 'proveedor' : 'cliente'
  const rutaPermitida = ROLE_ROUTES[rol]

  if (profile?.is_admin) return response

  const intentandoRutaAjena = Object.values(ROLE_ROUTES)
    .filter(r => r !== rutaPermitida)
    .some(r => pathname.startsWith(r))

  if (intentandoRutaAjena) return NextResponse.redirect(new URL(rutaPermitida, request.url))

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
