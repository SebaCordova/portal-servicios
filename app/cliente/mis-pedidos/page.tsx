'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Propuesta = {
  id: string; precio_clp: number; descripcion: string; fecha_hora_estimada: string
  estado: string; razon_cancelacion: string | null
  bookings: { id: string; status: string; reviews: { id: string }[] }[]
  provider_profiles: { id: string; rating_avg: number | null; profiles: { full_name: string; auth_user_id: string } }
}
type Solicitud = {
  id: string; estado: string; comuna: string; calle: string; numero: string
  fecha_inicio: string; fecha_fin: string; descripcion: string; created_at: string
  propuesta_aceptada_id: string | null
  categories: { name: string }[]
  propuestas: Propuesta[]
}
type ResenaState = { rating: number | null; comentario: string }

const RAZONES = ['El proveedor no se presentó','El proveedor canceló','Cambié de opinión','El precio no era el acordado','Otro']

export default function MisPedidosPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [razon, setRazon] = useState('')
  const [resenas, setResenas] = useState<Record<string, ResenaState>>({})

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return
    const { data } = await supabase.from('solicitudes')
      .select(`id, estado, comuna, calle, numero, fecha_inicio, fecha_fin, descripcion, created_at, propuesta_aceptada_id,
        categories ( name ),
        propuestas!solicitud_id ( id, precio_clp, descripcion, fecha_hora_estimada, estado, razon_cancelacion,
          bookings!propuesta_id ( id, status, reviews ( id ) ),
          provider_profiles ( id, rating_avg, profiles ( full_name, email ) ) )`)
      .eq('cliente_id', profile.id).order('created_at', { ascending: false })
    setSolicitudes((data ?? []) as unknown as Solicitud[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function getProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
    return data
  }

  async function eliminarSolicitud(id: string) {
    setAccionando(id)
    await supabase.from('solicitudes').delete().eq('id', id)
    await cargar()
    setAccionando(null)
  }

  async function aceptarPropuesta(sol: Solicitud, prop: Propuesta) {
    setAccionando(prop.id)
    await supabase.from('propuestas').update({ estado: 'aceptada' }).eq('id', prop.id)
    await supabase.from('propuestas').update({ estado: 'en_espera' }).eq('solicitud_id', sol.id).neq('id', prop.id).in('estado', ['pendiente', 'en_espera'])
    await supabase.from('solicitudes').update({ estado: 'en_proceso', propuesta_aceptada_id: prop.id }).eq('id', sol.id)
    const profile = await getProfile()
    await supabase.from('bookings').insert({
      client_id: profile?.id, status: 'confirmado', scheduled_at: prop.fecha_hora_estimada,
      address: `${sol.calle} ${sol.numero}`, comuna: sol.comuna, total_clp: prop.precio_clp, propuesta_id: prop.id
    })
    const pp = prop.provider_profiles as any
    await fetch('/api/notifications/propuesta-aceptada', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailProveedor: pp?.profiles?.email, nombreProveedor: pp?.profiles?.full_name,
        categoria: (sol.categories as any)?.name, direccion: `${sol.calle} ${sol.numero}`,
        comuna: sol.comuna, fechaHora: prop.fecha_hora_estimada, precio: prop.precio_clp })
    })
    await cargar(); setAccionando(null)
  }

  async function cancelarPropuesta(prop: Propuesta, sol: Solicitud) {
    if (!razon) return
    setAccionando(prop.id)
    await supabase.from('propuestas').update({ estado: 'fallida', razon_cancelacion: razon }).eq('id', prop.id)
    await supabase.from('propuestas').update({ estado: 'pendiente' }).eq('solicitud_id', sol.id).eq('estado', 'en_espera')
    await supabase.from('solicitudes').update({ estado: 'abierta', propuesta_aceptada_id: null }).eq('id', sol.id)
    setCancelando(null); setRazon('')
    await cargar(); setAccionando(null)
  }

  async function enviarResena(bookingId: string, proveedorProfileId: string) {
    const r = resenas[bookingId]
    if (!r?.rating) return
    const profile = await getProfile()
    if (!profile) return
    await supabase.from('reviews').insert({
      reviewer_id: profile.id, reviewee_id: proveedorProfileId,
      booking_id: bookingId, rating_calidad: r.rating, rating: r.rating, comment: r.comentario
    })
    const { data: reviews } = await supabase.from('reviews').select('rating_calidad').eq('reviewee_id', proveedorProfileId)
    if (reviews?.length) {
      const avg = reviews.reduce((s, x) => s + x.rating_calidad, 0) / reviews.length
      await supabase.from('provider_profiles').update({ rating_avg: Math.round(avg * 10) / 10, total_reviews: reviews.length }).eq('id', proveedorProfileId)
    }
    setResenas(prev => { const n = { ...prev }; delete n[bookingId]; return n })
    await cargar()
  }

  function setResena(bookingId: string, patch: Partial<ResenaState>) {
    setResenas(prev => ({ ...prev, [bookingId]: { ...{ rating: null, comentario: '' }, ...prev[bookingId], ...patch } }))
  }

  function formatFecha(f: string) { return new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) }
  function formatFechaHora(f: string) { return new Date(f).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

  function estadoStyle(e: string) {
    return ({ abierta: { bg: '#fef3c7', color: '#92400e', label: 'Abierta' }, en_proceso: { bg: '#dbeafe', color: '#1e40af', label: 'En proceso' }, completada: { bg: '#d1fae5', color: '#065f46', label: 'Completada' }, cancelada: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelada' } } as any)[e] ?? { bg: '#f0f0f0', color: '#888', label: e }
  }
  function propStyle(e: string) {
    return ({ pendiente: { bg: '#fff', color: '#444', label: 'Pendiente', border: '#e0e0e0' }, aceptada: { bg: '#f0fdf7', color: '#065f46', label: '✓ Aceptada', border: '#1dbf73' }, en_espera: { bg: '#fff', color: '#888', label: 'En espera', border: '#e0e0e0' }, fallida: { bg: '#fff7ed', color: '#9a3412', label: 'No concretada', border: '#fed7aa' }, rechazada: { bg: '#fef2f2', color: '#991b1b', label: 'Rechazada', border: '#fecaca' } } as any)[e] ?? { bg: '#fff', color: '#888', label: e, border: '#e0e0e0' }
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 2rem' }}>Mis pedidos</h1>

        {solicitudes.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', margin: '0 0 1rem' }}>📋</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#222', margin: '0 0 6px' }}>No tienes pedidos aún</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 1.5rem' }}>Solicita un servicio y recibirás propuestas de profesionales.</p>
            <a href="/categorias" style={{ display: 'inline-block', padding: '10px 20px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Buscar servicios</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {solicitudes.map(sol => {
              const es = estadoStyle(sol.estado)
              const puedeEliminar = sol.estado === 'abierta' && sol.propuestas.length === 0
              return (
                <div key={sol.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{(sol.categories as any)?.name}</p>
                        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>📍 {sol.calle} {sol.numero}, {sol.comuna}</p>
                        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>📅 {formatFecha(sol.fecha_inicio)} → {formatFecha(sol.fecha_fin)}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{ fontSize: '12px', background: es.bg, color: es.color, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{es.label}</span>
                        {puedeEliminar && (
                          <button onClick={() => eliminarSolicitud(sol.id)} disabled={accionando === sol.id}
                            style={{ fontSize: '11px', color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                            {accionando === sol.id ? 'Eliminando...' : '✕ Eliminar solicitud'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Propuestas recibidas ({sol.propuestas.length})
                    </p>
                    {sol.propuestas.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Aún no hay propuestas. Los proveedores te contactarán pronto.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {sol.propuestas.map(prop => {
                          const ps = propStyle(prop.estado)
                          const esAceptada = prop.estado === 'aceptada'
                          const puedeCancelar = esAceptada && cancelando === prop.id
                          const booking = prop.bookings?.[0]
                          const bookingId = booking?.id
                          const resenaActual = bookingId ? resenas[bookingId] : undefined

                          return (
                            <div key={prop.id} style={{ border: `1.5px solid ${ps.border}`, borderRadius: '10px', padding: '1rem', background: ps.bg }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 2px' }}>{(prop.provider_profiles as any)?.profiles?.full_name}</p>
                                  {(prop.provider_profiles as any)?.rating_avg && (
                                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>⭐ {(prop.provider_profiles as any).rating_avg.toFixed(1)}</p>
                                  )}
                                </div>
                                <span style={{ fontSize: '12px', color: ps.color, padding: '3px 8px', borderRadius: '20px', border: `1px solid ${ps.border}`, background: ps.bg }}>{ps.label}</span>
                              </div>

                              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: prop.descripcion ? '8px' : '0' }}>
                                <div>
                                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px', fontWeight: '500' }}>PRECIO</p>
                                  <p style={{ fontSize: '16px', fontWeight: '800', color: '#222', margin: 0 }}>${prop.precio_clp.toLocaleString('es-CL')}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px', fontWeight: '500' }}>FECHA ESTIMADA</p>
                                  <p style={{ fontSize: '13px', color: '#222', margin: 0 }}>{formatFechaHora(prop.fecha_hora_estimada)}</p>
                                </div>
                              </div>

                              {prop.descripcion && <p style={{ fontSize: '13px', color: '#555', margin: '8px 0 0', lineHeight: '1.5' }}>{prop.descripcion}</p>}
                              {prop.estado === 'fallida' && prop.razon_cancelacion && (
                                <p style={{ fontSize: '12px', color: '#9a3412', margin: '8px 0 0', background: '#fff7ed', padding: '6px 10px', borderRadius: '6px' }}>Motivo: {prop.razon_cancelacion}</p>
                              )}

                              {prop.estado === 'pendiente' && sol.estado === 'abierta' && (
                                <button onClick={() => aceptarPropuesta(sol, prop)} disabled={accionando === prop.id}
                                  style={{ marginTop: '10px', width: '100%', padding: '9px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {accionando === prop.id ? 'Procesando...' : 'Aceptar propuesta'}
                                </button>
                              )}

                              {esAceptada && sol.estado === 'en_proceso' && !puedeCancelar && (
                                <button onClick={() => setCancelando(prop.id)}
                                  style={{ marginTop: '10px', width: '100%', padding: '9px', background: '#fff', color: '#e53935', border: '1.5px solid #e53935', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  Cancelar propuesta
                                </button>
                              )}

                              {puedeCancelar && (
                                <div style={{ marginTop: '10px' }}>
                                  <p style={{ fontSize: '13px', color: '#444', margin: '0 0 8px', fontWeight: '500' }}>¿Por qué cancelas?</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                    {RAZONES.map(r => (
                                      <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#444' }}>
                                        <input type="radio" name="razon" value={r} checked={razon === r} onChange={() => setRazon(r)} style={{ accentColor: '#e53935' }} />
                                        {r}
                                      </label>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => { setCancelando(null); setRazon('') }}
                                      style={{ flex: 1, padding: '9px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                                      Volver
                                    </button>
                                    <button onClick={() => cancelarPropuesta(prop, sol)} disabled={!razon || accionando === prop.id}
                                      style={{ flex: 1, padding: '9px', background: razon ? '#e53935' : '#fca5a5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: razon ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                                      {accionando === prop.id ? 'Cancelando...' : 'Confirmar cancelación'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {esAceptada && bookingId && booking?.status === 'completado' && (booking?.reviews?.length ?? 0) === 0 && (
                                <div style={{ marginTop: '12px', padding: '14px', background: '#f0fdf7', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#065f46', margin: '0 0 10px' }}>¿Cómo te fue con este servicio?</p>
                                  <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                                    {[1,2,3,4,5].map(star => (
                                      <button key={star} onClick={() => setResena(bookingId, { rating: star })}
                                        style={{ fontSize: '26px', background: 'none', border: 'none', cursor: 'pointer', color: star <= (resenaActual?.rating ?? 0) ? '#1dbf73' : '#ddd', padding: '0 2px' }}>★</button>
                                    ))}
                                  </div>
                                  <textarea value={resenaActual?.comentario ?? ''} onChange={e => setResena(bookingId, { comentario: e.target.value })}
                                    placeholder="Cuéntanos cómo fue tu experiencia (opcional)..." rows={2}
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                  <button onClick={() => enviarResena(bookingId, prop.provider_profiles.id)} disabled={!resenaActual?.rating}
                                    style={{ marginTop: '8px', width: '100%', padding: '9px', background: resenaActual?.rating ? '#1dbf73' : '#a8e6c8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: resenaActual?.rating ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                                    Enviar reseña
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
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
