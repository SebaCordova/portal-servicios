'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Conversacion = {
  solicitud_id: string
  categoria: string
  comuna: string
  estado: string
  ultimo_mensaje: string
  ultimo_mensaje_fecha: string
  no_leidos: number
  contraparte: string
  es_proveedor: boolean
}

export default function MensajesPage() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)

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
        .select('id, is_provider')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) return

      // Obtener mensajes agrupados por solicitud
      const { data: mensajes } = await supabase
        .from('mensajes')
        .select(`
          solicitud_id, contenido, created_at, leido, remitente_id,
          solicitudes (
            estado, comuna,
            categories ( name ),
            profiles!cliente_id ( full_name )
          )
        `)
        .order('created_at', { ascending: false })

      if (!mensajes) { setLoading(false); return }

      // Agrupar por solicitud_id
      const convMap = new Map<string, Conversacion>()
      for (const m of mensajes) {
        if (convMap.has(m.solicitud_id)) continue
        const sol = m.solicitudes as any
        convMap.set(m.solicitud_id, {
          solicitud_id: m.solicitud_id,
          categoria: sol?.categories?.name ?? 'Servicio',
          comuna: sol?.comuna ?? '',
          estado: sol?.estado ?? '',
          ultimo_mensaje: m.contenido,
          ultimo_mensaje_fecha: m.created_at,
          no_leidos: mensajes.filter(msg => msg.solicitud_id === m.solicitud_id && !msg.leido && msg.remitente_id !== profile.id).length,
          contraparte: sol?.profiles?.full_name ?? 'Usuario',
          es_proveedor: profile.is_provider
        })
      }

      setConversaciones(Array.from(convMap.values()))
      setLoading(false)
    }
    loadData()
  }, [])

  function formatFecha(fecha: string) {
    const d = new Date(fecha)
    const hoy = new Date()
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
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
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 1.5rem' }}>Mensajes</h1>

        {conversaciones.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', margin: '0 0 1rem' }}>💬</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#222', margin: '0 0 6px' }}>No tienes mensajes aún</p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Las conversaciones con clientes y proveedores aparecerán aquí.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            {conversaciones.map((conv, i) => (
              <a key={conv.solicitud_id} href={`/mensajes/${conv.solicitud_id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem 1.5rem',
                  borderBottom: i < conversaciones.length - 1 ? '1px solid #f0f0f0' : 'none',
                  background: conv.no_leidos > 0 ? '#f8fff8' : '#fff'
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = conv.no_leidos > 0 ? '#f8fff8' : '#fff')}>

                  {/* Avatar */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                    {conv.contraparte.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <p style={{ fontSize: '14px', fontWeight: conv.no_leidos > 0 ? '700' : '600', color: '#222', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.categoria}
                      </p>
                      <span style={{ fontSize: '11px', color: '#aaa', flexShrink: 0, marginLeft: '8px' }}>{formatFecha(conv.ultimo_mensaje_fecha)}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#666', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.contraparte} · {conv.comuna}
                    </p>
                    <p style={{ fontSize: '12px', color: conv.no_leidos > 0 ? '#222' : '#aaa', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.no_leidos > 0 ? '500' : '400' }}>
                      {conv.ultimo_mensaje}
                    </p>
                  </div>

                  {/* Badge no leídos */}
                  {conv.no_leidos > 0 && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {conv.no_leidos}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
