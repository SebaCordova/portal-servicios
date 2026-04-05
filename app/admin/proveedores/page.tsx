'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Proveedor = {
  id: string
  profile_id: string
  rut: string
  bio: string
  price_per_hour: number | null
  verified: boolean
  created_at: string
  profiles: {
    full_name: string
    phone: string
    email: string
  }
  provider_zones: { comuna: string }[]
  services: { title: string }[]
}

export default function AdminPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [accionando, setAccionando] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile?.is_admin) { window.location.href = '/cliente'; return }

      setIsAdmin(true)
      await cargarProveedores()
    }
    init()
  }, [])

  async function cargarProveedores() {
    const { data } = await supabase
      .from('provider_profiles')
      .select(`
        id, profile_id, rut, bio, price_per_hour, verified, created_at,
        profiles ( full_name, phone, email ),
        provider_zones ( comuna ),
        services ( title )
      `)
      .order('created_at', { ascending: false })

    setProveedores((data ?? []) as any)
    setLoading(false)
  }

  async function enviarNotificacion(tipo: string, email: string, nombre: string) {
    await fetch(`/api/notifications/${tipo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre })
    })
  }

  async function aprobar(proveedor: Proveedor) {
    setAccionando(proveedor.id)
    await supabase.from('provider_profiles').update({ verified: true }).eq('id', proveedor.id)
    await supabase.from('profiles').update({ is_provider: true }).eq('id', proveedor.profile_id)
    await supabase.from('services').update({ active: true }).eq('provider_id', proveedor.id)
    await enviarNotificacion('aprobacion', proveedor.profiles.email, proveedor.profiles.full_name)
    await cargarProveedores()
    setAccionando(null)
  }

  async function rechazar(proveedor: Proveedor) {
    setAccionando(proveedor.id)
    await enviarNotificacion('rechazo', proveedor.profiles.email, proveedor.profiles.full_name)
    await supabase.from('services').delete().eq('provider_id', proveedor.id)
    await supabase.from('provider_zones').delete().eq('provider_id', proveedor.id)
    await supabase.from('provider_profiles').delete().eq('id', proveedor.id)
    await cargarProveedores()
    setAccionando(null)
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (!isAdmin || loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Cargando...</p>
      </main>
    )
  }

  const pendientes = proveedores.filter(p => !p.verified)
  const aprobados = proveedores.filter(p => p.verified)

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#1dbf73"/>
          <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#222' }}>Servi<span style={{ color: '#1dbf73' }}>Chile</span></span>
        <span style={{ fontSize: '13px', color: '#888', marginLeft: '8px' }}>— Panel Admin</span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total proveedores', value: proveedores.length },
            { label: 'Pendientes', value: pendientes.length, color: '#f59e0b' },
            { label: 'Aprobados', value: aprobados.length, color: '#1dbf73' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: '28px', fontWeight: '800', color: stat.color ?? '#222', margin: '0 0 4px' }}>{stat.value}</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>
          Solicitudes pendientes {pendientes.length > 0 && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px' }}>{pendientes.length}</span>}
        </h2>

        {pendientes.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {pendientes.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{p.profiles.full_name}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>RUT: {p.rut}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>Tel: {p.profiles.phone}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>Email: {p.profiles.email}</p>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Solicitud: {formatFecha(p.created_at)}</p>
                  </div>
                  <span style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '20px' }}>Pendiente</span>
                </div>

                {p.bio && (
                  <div style={{ marginBottom: '1rem', padding: '10px 12px', background: '#f9f9f9', borderRadius: '8px' }}>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px', fontWeight: '500' }}>DESCRIPCIÓN</p>
                    <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5' }}>{p.bio}</p>
                  </div>
                )}

                {p.services.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontWeight: '500' }}>CATEGORÍAS</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.services.map((s, i) => (
                        <span key={i} style={{ fontSize: '12px', background: '#f0f0ff', color: '#3730a3', padding: '3px 8px', borderRadius: '20px', border: '1px solid #e0e0ff' }}>{s.title}</span>
                      ))}
                    </div>
                  </div>
                )}

                {p.provider_zones.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontWeight: '500' }}>COMUNAS</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.provider_zones.map(z => (
                        <span key={z.comuna} style={{ fontSize: '12px', background: '#f0fdf7', color: '#065f46', padding: '3px 8px', borderRadius: '20px', border: '1px solid #d1fae5' }}>{z.comuna}</span>
                      ))}
                    </div>
                  </div>
                )}

                {p.price_per_hour && (
                  <p style={{ fontSize: '13px', color: '#555', margin: '0 0 1rem' }}>
                    Precio: <strong>${p.price_per_hour.toLocaleString('es-CL')}/hr</strong>
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => aprobar(p)} disabled={accionando === p.id}
                    style={{ flex: 1, padding: '10px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {accionando === p.id ? 'Procesando...' : '✓ Aprobar'}
                  </button>
                  <button onClick={() => rechazar(p)} disabled={accionando === p.id}
                    style={{ flex: 1, padding: '10px', background: '#fff', color: '#e53935', border: '1.5px solid #e53935', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {accionando === p.id ? 'Procesando...' : '✕ Rechazar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>Proveedores aprobados</h2>
        {aprobados.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>No hay proveedores aprobados aún</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {aprobados.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{p.profiles.full_name}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>RUT: {p.rut} · Tel: {p.profiles.phone}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>Email: {p.profiles.email}</p>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Aprobado el {formatFecha(p.created_at)}</p>
                  </div>
                  <span style={{ fontSize: '12px', color: '#065f46', background: '#d1fae5', padding: '4px 10px', borderRadius: '20px' }}>✓ Aprobado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
