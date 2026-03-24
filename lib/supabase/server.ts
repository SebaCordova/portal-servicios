import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Usar en Server Components, layouts y route handlers
export async function createSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
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
}

// Obtener el usuario actual (lanza error si no hay sesión)
export async function getUser() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('No autenticado')
  return user
}

// Obtener el rol del usuario actual
export async function getRol(): Promise<'admin' | 'proveedor' | 'cliente'> {
  const user = await getUser()
  const rol = user.user_metadata?.rol
  if (!rol) throw new Error('Sin rol asignado')
  return rol
}
