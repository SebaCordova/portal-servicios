'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Solicitud = {
  id: string; descripcion: string; comuna: string; calle: string; numero: string
  fecha_inicio: string; fecha_fin: string; created_at: string
  categories: { name: string } | null
}
type Trabajo = {
  id: string; scheduled_at: string; address: string; comuna: string
  total_clp: number; status: string; propuesta_id: string
}
type Indicadores = { trabajosRealizados: number; gananciasMes: number; rating: number; totalReviews: number }

export default function ProveedorPage() {
  const [loading, setLoading] = useState(true)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [indicadores, setIndicadores] = useState<Indicadores>({ trabajosRealizados: 0, gananciasMes: 0, rating: 0, totalReviews: 0 })
  const [providerName, setProviderName] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [proveedorId, setProveedorId] = useState<string | null>(null)

  const supabase = getSupabaseBrowserClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: profile } = await supabase.from('profiles').select('full_name, id, is_provider').eq('auth_user_id', user.id).single()
    if (!profile?.is_provider) { window.location.href = '/'; return }
    setProviderName(profile.full_name?.split(' ')[0] ?? 'Proveedor')
    const { data: pp } = await supabase.from('provider_profiles').select('id, rating_avg, total_reviews').eq('profile_id', profile.id).single()
    if (!pp) { setLoading(false); return }
    setProveedorId(pp.id)
    const { data: mpa } = await supabase.from('propuestas').select('id').eq('proveedor_id', pp.id).eq('estado', 'aceptada')
    const propuestaIds = mpa?.map((p: any) => p.id) ?? []
    const now = new Date()
    const mesActual = now.getMonth() + 1
    const anoActual = now.getFullYear()
    const { data: bookingsCompletados } = propuestaIds.length > 0 ? await supabase.from('bookings').select('id, total_clp, scheduled_at, propuesta_id').eq('status', 'completado').in('propuesta_id', propuestaIds) : { data: [] }
    const trabajosRealizados = bookingsCompletados?.length ?? 0
    let gananciasMes = 0
    if (bookingsCompletados && bookingsCompletados.length > 0) {
      gananciasMes = bookingsCompletados.filter((b: any) => { const f = new Date(b.scheduled_at); return f.getMonth() + 1 === mesActual && f.getFullYear() === anoActual }).reduce((sum: number, b: any) => sum + (b.total_clp ?? 0), 0)
    }
    setIndicadores(prev => ({ ...prev, rating: pp.rating_avg ?? 0, totalReviews: pp.total_reviews ?? 0, trabajosRealizados, gananciasMes }))
    const { data: bookingsData } = propuestaIds.length > 0 ? await supabase.from('bookings').select('id, scheduled_at, address, comuna, total_clp, status, propuesta_id').in('status', ['confirmado', 'en_proceso']).in('propuesta_id', propuestaIds).order('scheduled_at', { ascending: true }) : { data: [] }
    setTrabajos(bookingsData ?? [])
    const { data: zones } = await supabase.from('provider_zones').select('comuna').eq('provider_id', pp.id)
    const { data: services } = await supabase.from('services').select('category_id').eq('provider_id', pp.id).eq('active', true)
    const comunas = zones?.map((z: any) => z.comuna) ?? []
    const categoryIds = services?.map((s: any) => s.category_id) ?? []
    if (comunas.length > 0 && categoryIds.length > 0) {
      const { data: sd } = await supabase.from('solicitudes').select('id, descripcion, comuna, calle, numero, fecha_inicio, fecha_fin, created_at, categories ( name )').eq('estado', 'abierta').in('comuna', comunas).in('category_id', categoryIds).order('created_at', { ascending: false })
      const { data: mp } = await supabase.from('propuestas').select('solicitud_id, descartada_por_proveedor').eq('proveedor_id', pp.id)
      const conPropuesta = new Set(mp?.filter((p: any) => !p.descartada_por_proveedor).map((p: any) => p.solicitud_id) ?? [])
      const descartadas = new Set(mp?.filter((p: any) => p.descartada_por_proveedor).map((p: any) => p.solicitud_id) ?? [])
      setSolicitudes(((sd ?? []).filter((s: any) => !conPropuesta.has(s.id) && !descartadas.has(s.id))) as unknown as Solicitud[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function ignorar(solicitudId: string) {
    if (!proveedorId) return
    const { data: existente } = await supabase.from('propuestas').select('id').eq('proveedor_id', proveedorId).eq('solicitud_id', solicitudId).single()
    if (existente) { await supabase.from('propuestas').update({ descartada_por_proveedor: true }).eq('id', existente.id) }
    else { await supabase.from('propuestas').insert({ proveedor_id: proveedorId, solicitud_id: solicitudId, descartada_por_proveedor: true, estado: 'descartada' }) }
    setSolicitudes(prev => prev.filter(s => s.id !== solicitudId))
    if (expandida === solicitudId) setExpandida(null)
  }

  async function marcarEnProceso(bookingId: string) {
    setAccionando(bookingId)
    try { const res = await fetch('/api/bookings/en-proceso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId }) }); if (res.ok) { await loadData() } } catch (error) { console.error('Error:', error) } finally { setAccionando(null) }
  }

  async function marcarCompletado(bookingId: string) {
    setAccionando(bookingId)
    try { const res = await fetch('/api/bookings/completar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId }) }); if (res.ok) { await loadData() } } catch (error) { console.error('Error:', error) } finally { setAccionando(null) }
  }

  function formatFecha(f: string) { return new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }) }
  function formatFechaHora(f: string) { return new Date(f).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

  if (loading) return (<main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}><p style={{ color: '#888' }}>Cargando...</p></main>)

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>Hola, {providerName} 👋</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>Aquí está el resumen de tu actividad</p>
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>Trabajos pendientes de realizar{trabajos.length > 0 && <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>{trabajos.length}</span>}</h2>
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
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{t.status === 'confirmado' ? 'Trabajo confirmado' : 'Trabajo en proceso'}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>📍 {t.address}, {t.comuna}</p>
                      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>📅 {formatFechaHora(t.scheduled_at)}</p>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#1dbf73', margin: 0 }}>${t.total_clp.toLocaleString('es-CL')}</p>
                    </div>
                    <span style={{ fontSize: '12px', background: t.status === 'confirmado' ? '#dbeafe' : '#fef3c7', color: t.status === 'confirmado' ? '#1e40af' : '#92400e', padding: '4px 10px', borderRadius: '20px' }}>{t.status === 'confirmado' ? 'Confirmado' : 'En proceso'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {t.status === 'confirmado' && <button onClick={() => marcarEnProceso(t.id)} disabled={accionando === t.id} style={{ flex: 1, padding: '9px', background: '#fff', color: '#f59e0b', border: '1.5px solid #f59e0b', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>{accionando === t.id ? 'Procesando...' : 'Iniciar trabajo'}</button>}
                    <button onClick={() => marcarCompletado(t.id)} disabled={accionando === t.id} style={{ flex: 1, padding: '9px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>{accionando === t.id ? 'Procesando...' : 'Marcar completado'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>Solicitudes pendientes{solicitudes.length > 0 && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>{solicitudes.length}</span>}</h2>
          {solicitudes.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '0.8rem' }}>📋</div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', margin: '0 0 4px' }}>No hay solicitudes por ahora</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Cuando un cliente publique una solicitud en tus categorías y comunas, aparecerá aquí.</p>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
              {solicitudes.map((s, i) => {
                const abierta = expandida === s.id
                return (
                  <div key={s.id} style={{ borderBottom: i < solicitudes.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem 1.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#222', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.categories as any)?.name} · {s.comuna}</p>
                        <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>📅 {formatFecha(s.fecha_inicio)} → {formatFecha(s.fecha_fin)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button onClick={() => ignorar(s.id)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#bbb', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                        <button onClick={() => setExpandida(abierta ? null : s.id)} style={{ padding: '6px 12px', background: abierta ? '#f0fdf7' : '#f5f5f5', color: abierta ? '#1dbf73' : '#444', border: `1px solid ${abierta ? '#1dbf73' : '#e0e0e0'}`, borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>{abierta ? 'Cerrar' : 'Ver detalle'}</button>
                      </div>
                    </div>
                    {abierta && (
                      <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px 12px', margin: '1rem 0' }}>
                          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px', fontWeight: '500' }}>DIRECCIÓN</p>
                          <p style={{ fontSize: '13px', color: '#555', margin: '0 0 8px' }}>{s.calle} {s.numero}, {s.comuna}</p>
                          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px', fontWeight: '500' }}>DETALLE</p>
                          <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line' }}>{s.descripcion}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => ignorar(s.id)} style={{ flex: 1, padding: '10px', background: '#fff', color: '#888', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Descartar</button>
                          <a href={`/proveedor/propuesta/${s.id}`} style={{ flex: 2, display: 'block', padding: '10px', background: '#1dbf73', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Enviar propuesta →</a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
