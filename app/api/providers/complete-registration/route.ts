/**
 * POST /api/providers/complete-registration
 *
 * Paso 2 del registro de proveedor.
 * El usuario ya verificó su email y tiene sesión activa.
 * Guarda RUT, teléfono y datos sensibles en la DB — NUNCA en user_metadata del JWT.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { validarRut, formatearRut } from '@/lib/utils/validators'

interface RegistrationPayload {
  firstName: string
  lastName: string
  phone: string
  rut: string
  comuna: string
  categorias: string[]
  bio?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()

  // 1. Verificar sesión activa
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // 2. Parsear y validar payload
  let body: RegistrationPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { firstName, lastName, phone, rut, comuna, categorias, bio } = body

  if (!firstName || !lastName || !phone || !rut || !comuna || !categorias?.length) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 422 })
  }

  if (!validarRut(rut)) {
    return NextResponse.json({ error: 'RUT inválido' }, { status: 422 })
  }

  const rutFormateado = formatearRut(rut)
  const fullName = `${firstName.trim()} ${lastName.trim()}`

  // 3. Evitar duplicados
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (existingProfile?.id) {
    const { data: existingPP } = await supabase
      .from('provider_profiles')
      .select('id')
      .eq('profile_id', existingProfile.id)
      .maybeSingle()

    if (existingPP) {
      return NextResponse.json(
        { error: 'Ya existe un perfil de proveedor para este usuario' },
        { status: 409 }
      )
    }
  }

  // 4. Upsert del perfil base
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        auth_user_id: user.id,
        full_name: fullName,
        email: user.email,
        phone,      // guardado en DB con RLS, no en JWT
        comuna,
        is_client: false,
        is_provider: false, // admin activa esto al aprobar
      },
      { onConflict: 'auth_user_id' }
    )
    .select('id')
    .single()

  if (profileError || !profile) {
    console.error('[complete-registration] profiles upsert error:', profileError)
    return NextResponse.json({ error: 'Error al guardar perfil' }, { status: 500 })
  }

  // 5. Crear provider_profile — RUT va aquí, protegido por RLS
  const { data: providerProfile, error: ppError } = await supabase
    .from('provider_profiles')
    .insert({
      profile_id: profile.id,
      rut: rutFormateado,   // dato sensible en DB, nunca en JWT
      bio: bio?.trim() ?? null,
      verified: false,
      rating_avg: 0,
      total_reviews: 0,
    })
    .select('id')
    .single()

  if (ppError || !providerProfile) {
    console.error('[complete-registration] provider_profiles insert error:', ppError)
    return NextResponse.json({ error: 'Error al crear perfil de proveedor' }, { status: 500 })
  }

  // 6. Crear servicios por categoría
  const serviciosInsert = categorias.map((categoryId: string) => ({
    provider_id: providerProfile.id,
    category_id: categoryId,
    title: '',
    price_clp: 0,
    active: false,
  }))

  const { error: servicesError } = await supabase.from('services').insert(serviciosInsert)
  if (servicesError) {
    console.warn('[complete-registration] services insert warning:', servicesError)
  }

  // 7. Zona de trabajo inicial
  await supabase
    .from('provider_zones')
    .insert({ provider_id: providerProfile.id, comuna })

  return NextResponse.json({
    ok: true,
    message: 'Registro completado. Tu cuenta está en revisión.',
    providerProfileId: providerProfile.id,
  })
}
