'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Solicitud = {
  id: string
  estado: string
  comuna: string
  descripcion: string
  created_at: string
  categories: { name: string } | null
  profiles: { full_name: string } | null
  propuestas: { id: string }[]
}

const ESTADO_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  abierta:    { label: 'Abierta',    bg: '#fef3c7', color: '#92400e' },
  en_proceso: { label: 'En proceso', bg: '#dbeafe', color: '#1e40af' },
  completada: { label: 'Completada', bg: '#d1fae5', color: '#065f46' },
  cancelada:  { label: 'Cancelada',  bg: '#fee2e2', color: '#991b1b' },
}

export default function AdminSolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await sb.from('profiles').select('is_admin').eq('auth_user_id', user.id).single()
      if (!profile?.is_admin) { window.location.href = '/'; return }
      const { data } = await sb.from('solicitudes')
        .select('id, estado, comuna, descripcion, created_at, categories ( name ), profiles!cliente_id ( full_name ), propuestas!solicitud_id ( id )')
        .order('created_at', { ascending: false })
      setSolicitudes((data ?? []) as unknown as Solicitud[])
      setLoading(false)
    }
    loadData()
  }, [])

  const filtradas = filtro === 'todos' ? solicitudes : solicitudes.filter(s => s.estado === filtro)

  const conteo = {
    todos:      solicitudes.length,
    abierta:    solicitudes.filter(s => s.estado === 'abierta').length,
    en_proceso: solicitudes.filter(s => s.estado === 'en_proceso').length,
    completada: solicitudes.filter(s => s.estado === 'completada').length,
    cancelada:  solicitudes.filter(s => s.estado === 'cancelada').length,
  }

  function fmtFecha(f: string) {
    return new Date(f).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <div style={{ padding: '2rem' }}><p style={{ color: '#888' }}>Cargando...</p></div>

  return (
    <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem' }}>Solicitudes</h1>
      <p style={{ fontSize: '14px', color: '#888', margin: '0 0 2rem' }}>Todas las solicitudes de clientes</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          ['todos',      `Todas (${conteo.todos})`],
          ['abierta',    `Abiertas (${conteo.abierta})`],
          ['en_proceso', `En proceso (${conteo.en_proceso})`],
          ['completada', `Completadas (${conteo.completada})`],
          ['cancelada',  `Canceladas (${conteo.cancelada})`],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)}
            style={{ padding: '7px 14px', border: `1.5px solid ${filtro===k?'#1dbf73':'#ddd'}`, borderRadius: '20px', background: filtro===k?'#f0fdf7':'#fff', color: filtro===k?'#1dbf73':'#888', fontSize: '13px', fontWeight: filtro===k?'600':'400', cursor: 'pointer', fontFamily: 'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>No hay solicitudes en esta categoría</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtradas.map(sol => {
            const est = ESTADO_STYLE[sol.estado] ?? { label: sol.estado, bg: '#f0f0f0', color: '#888' }
            return (
              <div key={sol.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>
                      {(sol.categories as any)?.name ?? 'Servicio'} · {sol.comuna}
                    </p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>
                      Cliente: {(sol.profiles as any)?.full_name ?? '—'}
                    </p>
                    <p style={{ fontSize: '13px', color: '#aaa', margin: '0 0 8px' }}>
                      {fmtFecha(sol.created_at)} · {(sol.propuestas as any)?.length ?? 0} propuesta{(sol.propuestas as any)?.length !== 1 ? 's' : ''}
                    </p>
                    <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5', maxWidth: '600px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {sol.descripcion}
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', background: est.bg, color: est.color, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '1rem' }}>
                    {est.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
