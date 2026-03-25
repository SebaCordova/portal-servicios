'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Solicitud = {
  id: string
  descripcion: string
  comuna: string
  fecha_disponible: string
  created_at: string
  categoria: string
  cliente: string
}

type Trabajo = {
  id: string
  descripcion: string
  comuna: string
  fecha: string
  cliente: string
  precio: number
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
    trabajosRealizados: 0,
    gananciasMes: 0,
    rating: 0,
    totalReviews: 0
  })
  const [providerName, setProviderName] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
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

      if (pp) {
        setIndicadores(prev => ({
          ...prev,
          rating: pp.rating_avg ?? 0,
          totalReviews: pp.total_reviews ?? 0
        }))
      }

      setLoading(false)
    }
    loadData()
  }, [])

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

        {/* Saludo */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>
            Hola, {providerName} 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
            Aquí está el resumen de tu actividad
          </p>
        </div>

        {/* Sección 1 — Solicitudes pendientes */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: 0 }}>
              Solicitudes pendientes
              {solicitudes.length > 0 && (
                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>
                  {solicitudes.length}
                </span>
              )}
            </h2>
          </div>
          {solicitudes.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '0.8rem' }}>📋</div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>No hay solicitudes por ahora</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                Cuando un cliente publique una solicitud en tus categorías y comunas, aparecerá aquí.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {solicitudes.map(s => (
                <div key={s.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>{s.categoria}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>{s.comuna} · {s.fecha_disponible}</p>
                      <p style={{ fontSize: '13px', color: '#555', margin: '0 0 2px' }}>{s.descripcion}</p>
                      <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Cliente: {s.cliente}</p>
                    </div>
                    <button style={{ padding: '8px 16px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      Enviar propuesta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección 2 — Trabajos pendientes */}
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
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                Cuando un cliente acepte tu propuesta, el trabajo aparecerá aquí.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {trabajos.map(t => (
                <div key={t.id} style={{ background: '#fff', borderRadius: '10px', border: '1.5px solid #1dbf73', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>{t.descripcion}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>{t.comuna} · {t.fecha}</p>
                      <p style={{ fontSize: '13px', color: '#1dbf73', fontWeight: '600', margin: 0 }}>${t.precio.toLocaleString('es-CL')}</p>
                    </div>
                    <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '20px' }}>Confirmado</span>
                  </div>
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
              { label: 'Trabajos realizados', value: indicadores.trabajosRealizados, suffix: '', icon: '✅' },
              { label: 'Ganancias este mes', value: `$${indicadores.gananciasMes.toLocaleString('es-CL')}`, suffix: '', icon: '💰' },
              { label: 'Rating promedio', value: indicadores.rating > 0 ? indicadores.rating.toFixed(1) : '—', suffix: indicadores.rating > 0 ? '⭐' : '', icon: '⭐' },
              { label: 'Reseñas totales', value: indicadores.totalReviews, suffix: '', icon: '💬' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#222', margin: 0 }}>
                  {stat.value}{stat.suffix}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
