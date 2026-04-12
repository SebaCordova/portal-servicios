'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Booking = {
  id: string
  status: string
  scheduled_at: string
  address: string
  comuna: string
  total_clp: number
  created_at: string
  propuestas: {
    solicitudes: {
      categories: { name: string } | null
      profiles: { full_name: string } | null
    } | null
    provider_profiles: {
      profiles: { full_name: string } | null
    } | null
  } | null
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  confirmado: { label: 'Confirmado', bg: '#dbeafe', color: '#1e40af' },
  en_proceso: { label: 'En proceso', bg: '#fef3c7', color: '#92400e' },
  completado: { label: 'Completado', bg: '#d1fae5', color: '#065f46' },
  cancelado:  { label: 'Cancelado',  bg: '#fee2e2', color: '#991b1b' },
}

export default function AdminTrabajosPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [accionando, setAccionando] = useState<string | null>(null)

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single()
      if (!profile?.is_admin) { window.location.href = '/'; return }
      await cargarBookings()
    }
    init()
  }, [])

  async function cargarBookings() {
    const { data } = await sb
      .from('bookings')
      .select(`
        id, status, scheduled_at, address, comuna, total_clp, created_at,
        propuestas!propuesta_id (
          solicitudes!solicitud_id (
            categories ( name ),
            profiles!cliente_id ( full_name )
          ),
          provider_profiles!proveedor_id (
            profiles ( full_name )
          )
        )
      `)
      .order('scheduled_at', { ascending: false })
    setBookings((data ?? []) as unknown as Booking[])
    setLoading(false)
  }

  async function completarManual(bookingId: string) {
    setAccionando(bookingId)
    await fetch('/api/bookings/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId })
    })
    await cargarBookings()
    setAccionando(null)
  }

  async function cancelarBooking(bookingId: string) {
    setAccionando(bookingId)
    await sb.from('bookings').update({ status: 'cancelado' }).eq('id', bookingId)
    await cargarBookings()
    setAccionando(null)
  }

  const filtrados = filtro === 'todos'
    ? bookings
    : bookings.filter(b => b.status === filtro)

  const conteo = {
    todos:      bookings.length,
    confirmado: bookings.filter(b => b.status === 'confirmado').length,
    en_proceso: bookings.filter(b => b.status === 'en_proceso').length,
    completado: bookings.filter(b => b.status === 'completado').length,
    cancelado:  bookings.filter(b => b.status === 'cancelado').length,
  }

  const totalFacturado = bookings
    .filter(b => b.status === 'completado')
    .reduce((sum, b) => sum + b.total_clp, 0)

  function fmtFecha(f: string) {
    return new Date(f).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) return (
    <div style={{ padding: '2rem' }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem' }}>Trabajos</h1>
      <p style={{ fontSize: '14px', color: '#888', margin: '0 0 2rem' }}>Todos los bookings de la plataforma</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total trabajos',  value: conteo.todos,      color: '#222' },
          { label: 'Confirmados',     value: conteo.confirmado, color: '#1e40af' },
          { label: 'Completados',     value: conteo.completado, color: '#1dbf73' },
          { label: 'Total facturado', value: `$${totalFacturado.toLocaleString('es-CL')}`, color: '#1dbf73' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '24px', fontWeight: '800', color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          ['todos',      `Todos (${conteo.todos})`],
          ['confirmado', `Confirmados (${conteo.confirmado})`],
          ['en_proceso', `En proceso (${conteo.en_proceso})`],
          ['completado', `Completados (${conteo.completado})`],
          ['cancelado',  `Cancelados (${conteo.cancelado})`],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)}
            style={{ padding: '7px 14px', border: `1.5px solid ${filtro===k?'#1dbf73':'#ddd'}`, borderRadius: '20px', background: filtro===k?'#f0fdf7':'#fff', color: filtro===k?'#1dbf73':'#888', fontSize: '13px', fontWeight: filtro===k?'600':'400', cursor: 'pointer', fontFamily: 'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>No hay trabajos en esta categoría</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtrados.map(b => {
            const st = STATUS_STYLE[b.status] ?? { label: b.status, bg: '#f0f0f0', color: '#888' }
            const sol = (b.propuestas as any)?.solicitudes
            const proveedor = (b.propuestas as any)?.provider_profiles?.profiles?.full_name ?? '—'
            const cliente = sol?.profiles?.full_name ?? '—'
            const categoria = sol?.categories?.name ?? 'Servicio'
            return (
              <div key={b.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{categoria} · {b.comuna}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>👤 Cliente: {cliente}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>🔧 Proveedor: {proveedor}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>📍 {b.address}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>📅 {fmtFecha(b.scheduled_at)}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <span style={{ fontSize: '12px', background: st.bg, color: st.color, padding: '4px 10px', borderRadius: '20px', display: 'block', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                      {st.label}
                    </span>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: '#1dbf73', margin: 0 }}>
                      ${b.total_clp.toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
                {(b.status === 'confirmado' || b.status === 'en_proceso') && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                    <button onClick={() => completarManual(b.id)} disabled={accionando === b.id}
                      style={{ flex: 1, padding: '8px', background: '#f0fdf7', color: '#1dbf73', border: '1.5px solid #1dbf73', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {accionando === b.id ? 'Procesando...' : '✓ Marcar completado'}
                    </button>
                    <button onClick={() => cancelarBooking(b.id)} disabled={accionando === b.id}
                      style={{ flex: 1, padding: '8px', background: '#fff', color: '#e53935', border: '1.5px solid #e53935', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {accionando === b.id ? 'Procesando...' : '✕ Cancelar'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
