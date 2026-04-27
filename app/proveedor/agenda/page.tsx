'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Trabajo = {
  id: string
  scheduled_at: string
  address: string
  comuna: string
  total_clp: number
  status: string
  propuestas: {
    solicitudes: {
      categories: { name: string } | null
      profiles: { full_name: string } | null
    } | null
  } | null
}

const ST: Record<string, { label: string; bg: string; color: string }> = {
  confirmado: { label: 'Confirmado', bg: '#dbeafe', color: '#1e40af' },
  en_proceso: { label: 'En proceso', bg: '#fef3c7', color: '#92400e' },
  completado: { label: 'Completado', bg: '#d1fae5', color: '#065f46' },
  cancelado:  { label: 'Cancelado',  bg: '#fee2e2', color: '#991b1b' },
}

export default function AgendaPage() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('proximos')
  const sb = getSupabaseBrowserClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: p } = await sb.from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!p) return
    const { data: pp } = await sb.from('provider_profiles').select('id').eq('profile_id', p.id).single()
    if (!pp) { setLoading(false); return }
    const { data: pr } = await sb.from('propuestas').select('id').eq('proveedor_id', pp.id).eq('estado', 'aceptada') as { data: { id: string }[] | null }
    const ids = pr?.map(x => x.id) ?? []
    if (!ids.length) { setLoading(false); return }
    const { data } = await sb.from('bookings')
      .select('id, scheduled_at, address, comuna, total_clp, status, propuestas!propuesta_id ( solicitudes!solicitud_id ( categories ( name ), profiles!cliente_id ( full_name ) ) )')
      .in('propuesta_id', ids)
      .order('scheduled_at', { ascending: true })
    setTrabajos((data ?? []) as unknown as Trabajo[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const lista = trabajos.filter(t => {
    if (filtro === 'proximos') return ['confirmado', 'en_proceso'].includes(t.status) && new Date(t.scheduled_at) >= hoy
    if (filtro === 'completados') return t.status === 'completado'
    return true
  })

  function fmtFecha(f: string) {
    return new Date(f).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 1.5rem' }}>Mi agenda</h1>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          {[['proximos','Próximos'],['completados','Completados'],['todos','Todos']].map(([k,l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '8px 16px', border: `1.5px solid ${filtro===k?'#1dbf73':'#ddd'}`, borderRadius: '20px', background: filtro===k?'#f0fdf7':'#fff', color: filtro===k?'#1dbf73':'#888', fontSize: '13px', fontWeight: filtro===k?'600':'400', cursor: 'pointer', fontFamily: 'inherit' }}>
              {l}
            </button>
          ))}
        </div>
        {lista.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', margin: '0 0 1rem' }}>📅</p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>No hay trabajos en esta vista</p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Los trabajos confirmados aparecerán aquí.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lista.map(t => {
              const st = ST[t.status] ?? { label: t.status, bg: '#f0f0f0', color: '#888' }
              const sol = (t.propuestas as any)?.solicitudes
              return (
                <div key={t.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{sol?.categories?.name ?? 'Servicio'}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>👤 {sol?.profiles?.full_name ?? 'Cliente'}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>📍 {t.address}, {t.comuna}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>📅 {fmtFecha(t.scheduled_at)}</p>
                    </div>
                    <span style={{ fontSize: '12px', background: st.bg, color: st.color, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '18px', fontWeight: '800', color: '#1dbf73', margin: 0 }}>${t.total_clp.toLocaleString('es-CL')}</p>
                    {t.status === 'confirmado' && (
                      <button onClick={async () => { await fetch('/api/bookings/completar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: t.id }) }); loadData() }}
                        style={{ padding: '8px 16px', background: '#f0fdf7', color: '#1dbf73', border: '1.5px solid #1dbf73', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Marcar completado
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
