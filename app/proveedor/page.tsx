'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Solicitud = {
  id: string
  descripcion: string
  comuna: string
  calle: string
  numero: string
  fecha_inicio: string
  fecha_fin: string
  created_at: string
  categories: { name: string }[]
}

type Trabajo = {
  id: string
  scheduled_at: string
  address: string
  comuna: string
  total_clp: number
  status: string
  propuesta_id: string
}

type Indicadores = {
  trabajosRealizados: number
  gananciasMes: number
  rating: number
  totalReviews: number
}

export default function ProveedorPage() {
  const [loading, setLoading] = useState(true)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [indicadores, setIndicadores] = useState<Indicadores>({
    trabajosRealizados: 0, gananciasMes: 0, rating: 0, totalReviews: 0
  })
  const [providerName, setProviderName] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, id, is_provider')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.is_provider) { window.location.href = '/'; return }
    setProviderName(profile.full_name?.split(' ')[0] ?? 'Proveedor')

    const { data: pp } = await supabase
      .from('provider_profiles')
      .select('id, rating_avg, total_reviews')
      .eq('profile_id', profile.id)
      .single()

    if (!pp) { setLoading(false); return }

    setIndicadores(prev => ({
      ...prev,
      rating: pp.rating_avg ?? 0,
      totalReviews: pp.total_reviews ?? 0
    }))

    // Trabajos confirmados (va primero en la lógica para mostrarlos arriba)
    const { data: misProuestasAceptadas } = await supabase
      .from('propuestas')
      .select('id')
      .eq('proveedor_id', pp.id)
      .eq('estado', 'aceptada')

    const propuestaIds = misProuestasAceptadas?.map(p => p.id) ?? []

    const { data: bookingsData } = propuestaIds.length > 0 ? await supabase
      .from('bookings')
      .select('id, scheduled_at, address, comuna, total_clp, status, propuesta_id')
      .in('status', ['confirmado', 'en_proceso'])
      .in('propuesta_id', propuestaIds)
      .order('scheduled_at', { ascending: true }) : { data: [] }

    setTrabajos(bookingsData ?? [])

    // Solicitudes abiertas
    const { data: zones } = await supabase
      .from('provider_zones')
      .select('comuna')
      .eq('provider_id', pp.id)

    const { data: services } = await supabase
      .from('services')
      .select('category_id')
      .eq('provider_id', pp.id)
      .eq('active', true)

    const comunas = zones?.map(z => z.comuna) ?? []
    const categoryIds = services?.map(s => s.category_id) ?? []

    if (comunas.length > 0 && categoryIds.length > 0) {
      const { data: solicitudesData } = await supabase
        .from('solicitudes')
        .select('id, descripcion, comuna, calle, numero, fecha_inicio, fecha_fin, created_at, categories ( name )')
        .eq('estado', 'abierta')
        .in('comuna', comunas)
        .in('category_id', categoryIds)
        .order('created_at', { ascending: false })

      const { data: misProuestas } = await supabase
        .from('propuestas')
        .select('solicitud_id')
        .eq('proveedor_id', pp.id)

      const solicitudesConPropuesta = new Set(misProuestas?.map(p => p.solicitud_id) ?? [])
      setSolicitudes(((solicitudesData ?? []).filter(s => !solicitudesConPropuesta.has(s.id))) as unknown as Solicitud[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function formatFecha(fecha: string) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
  }

  function formatFechaHora(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Cargando...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>
            Hola, {providerName} 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>Aquí está el resumen de tu actividad</p>
        </div>

        {/* Sección 1 — Trabajos confirmados */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>
            Trabajos pendientes de realizar
            {trabajos.length > 0 && (
              <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>
                {trabajos.length}
              </span>
            )}
          </h2>

          {trabajos.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '0.8rem' }}>🔧</div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>No tienes trabajos agendados</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Cuando un cliente acepte tu propuesta, el trabajo aparecerá aquí.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {trabajos.map(t => (
                <div key={t.id} style={{ background: '#fff', borderRadius: '10px', border: '1.5px solid #1dbf73', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>Trabajo confirmado</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>📍 {t.address}, {t.comuna}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>📅 {formatFechaHora(t.scheduled_at)}</p>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#1dbf73', margin: 0 }}>${t.total_clp.toLocaleString('es-CL')}</p>
                    </div>
                    <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '20px' }}>Confirmado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección 2 — Solicitudes pendientes */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>
            Solicitudes pendientes
            {solicitudes.length > 0 && (
              <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>
                {solicitudes.length}
              </span>
            )}
          </h2>

          {solicitudes.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '0.8rem' }}>📋</div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>No hay solicitudes por ahora</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Cuando un cliente publique una solicitud en tus categorías y comunas, aparecerá aquí.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {solicitudes.map(s => (
                <div key={s.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{(s.categories as any)?.name}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>📍 {s.calle} {s.numero}, {s.comuna}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>📅 {formatFecha(s.fecha_inicio)} → {formatFecha(s.fecha_fin)}</p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Nueva</span>
                  </div>
                  <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px', fontWeight: '500' }}>DETALLE</p>
                    <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line' }}>{s.descripcion}</p>
                  </div>
                  <a href={`/proveedor/propuesta/${s.id}`}
                    style={{ display: 'block', width: '100%', padding: '10px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                    Enviar propuesta
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección 3 — Indicadores */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>Indicadores</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'Trabajos realizados', value: indicadores.trabajosRealizados },
              { label: 'Ganancias este mes', value: `$${indicadores.gananciasMes.toLocaleString('es-CL')}` },
              { label: 'Rating promedio', value: indicadores.rating > 0 ? `${indicadores.rating.toFixed(1)} ⭐` : '—' },
              { label: 'Reseñas totales', value: indicadores.totalReviews },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#222', margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
