import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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

// Obtener el rol del usuario actual leyendo la tabla profiles
// Fix: user_metadata?.rol nunca se setea en el flujo de auth
export async function getRol(): Promise<'admin' | 'proveedor' | 'cliente'> {
  const user = await getUser()
  const supabase = await createSupabaseServer()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, is_provider')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !profile) throw new Error('Perfil no encontrado')

  if (profile.is_admin) return 'admin'
  if (profile.is_provider) return 'proveedor'
  return 'cliente'
}

// ────────────────────────────────────────────────────────────────
// Helper: obtener email de un usuario via Admin API
// Encapsula el uso de la Service Role Key en este módulo de servidor.
// NUNCA llamar desde el cliente ni desde componentes React.
// ────────────────────────────────────────────────────────────────
export async function getClientEmail(authUserId: string): Promise<string | null> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!serviceRoleKey) {
    console.error('[getClientEmail] SUPABASE_SERVICE_ROLE_KEY no configurada')
    return null
  }
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data, error } = await adminClient.auth.admin.getUserById(authUserId)
  if (error || !data?.user?.email) {
    console.error('[getClientEmail] Error obteniendo email:', error?.message)
    return null
  }
  return data.user.email
}
