'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Trabajo = {
  id: string
  scheduled_at: string
  total_clp: number
  status: string
  propuestas: {
    solicitudes: {
      categories: { name: string } | null
    } | null
  } | null
}

export default function GananciasPage() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [loading, setLoading] = useState(true)
  const [mesFiltro, setMesFiltro] = useState('')

  const sb = getSupabaseBrowserClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: p } = await sb.from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!p) return
    const { data: pp } = await sb.from('provider_profiles').select('id').eq('profile_id', p.id).single()
    if (!pp) { setLoading(false); return }
    const prResult = await sb.from('propuestas').select('id').eq('proveedor_id', pp.id).eq('estado', 'aceptada')
    const ids: string[] = (prResult.data ?? []).map((x: { id: string }) => x.id)
    if (!ids.length) { setLoading(false); return }
    const { data } = await sb.from('bookings')
      .select('id, scheduled_at, total_clp, status, propuestas!propuesta_id ( solicitudes!solicitud_id ( categories ( name ) ) )')
      .in('propuesta_id', ids)
      .eq('status', 'completado')
      .order('scheduled_at', { ascending: false })
    setTrabajos((data ?? []) as unknown as Trabajo[])
    const ahora = new Date()
    setMesFiltro(`${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const meses = [...new Set(trabajos.map(t => {
    const d = new Date(t.scheduled_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))].sort().reverse()

  const filtrados = mesFiltro ? trabajos.filter(t => {
    const d = new Date(t.scheduled_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mesFiltro
  }) : trabajos

  const totalFiltrado = filtrados.reduce((s, t) => s + t.total_clp, 0)
  const totalHistorico = trabajos.reduce((s, t) => s + t.total_clp, 0)

  function fmtMes(m: string) {
    const [y, mo] = m.split('-')
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  }

  function fmtFecha(f: string) {
    return new Date(f).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 1.5rem' }}>Ganancias</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem' }}>
            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase' }}>
              {mesFiltro ? fmtMes(mesFiltro) : 'Período seleccionado'}
            </p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#1dbf73', margin: '0 0 4px' }}>${totalFiltrado.toLocaleString('es-CL')}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{filtrados.length} trabajo{filtrados.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem' }}>
            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase' }}>Total histórico</p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>${totalHistorico.toLocaleString('es-CL')}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{trabajos.length} trabajo{trabajos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {meses.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
              style={{ padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', background: '#fff', fontFamily: 'inherit', outline: 'none' }}>
              <option value="">Todos los meses</option>
              {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
            </select>
          </div>
        )}

        {filtrados.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', margin: '0 0 1rem' }}>💰</p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>Sin ganancias en este período</p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Los trabajos completados aparecerán aquí.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            {filtrados.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: i < filtrados.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#222', margin: '0 0 2px' }}>
                    {(t.propuestas as any)?.solicitudes?.categories?.name ?? 'Servicio'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>{fmtFecha(t.scheduled_at)}</p>
                </div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#1dbf73', margin: 0 }}>+${t.total_clp.toLocaleString('es-CL')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
