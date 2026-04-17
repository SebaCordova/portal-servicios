'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ClientePage() {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('auth_user_id', user.id)
        .single()
      setNombre(profile?.full_name?.split(' ')[0] ?? '')
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Bienvenida */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>👋</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#222', margin: '0 0 8px' }}>
            {nombre ? `Bienvenido, ${nombre}` : 'Bienvenido a ServiChile'}
          </h1>
          <p style={{ fontSize: '15px', color: '#888', margin: 0 }}>
            ¿Qué quieres hacer hoy?
          </p>
        </div>

        {/* Opciones principales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>

          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #1dbf73', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(29,191,115,0.08)' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#e8f9f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>🔧</div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>Cotizar un servicio</p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Gasfitería, electricidad, jardinería y más. Recibe propuestas de profesionales.</p>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '20px', color: '#1dbf73', flexShrink: 0 }}>→</div>
            </div>
          </a>

          <a href="/cliente/mis-pedidos" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e0e0e0', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📋</div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>Mis solicitudes</p>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Revisa el estado de tus cotizaciones y propuestas recibidas.</p>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '20px', color: '#aaa', flexShrink: 0 }}>→</div>
            </div>
          </a>

        </div>

        {/* Separador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
          <span style={{ fontSize: '12px', color: '#bbb', whiteSpace: 'nowrap' }}>¿Eres profesional?</span>
          <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
        </div>

        {/* Opción proveedor */}
        <a href="/proveedor/perfil" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e0e0e0', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#fef9ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>⭐</div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>Ofrecer mis servicios</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Regístrate como proveedor, define tus servicios y empieza a recibir clientes.</p>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '20px', color: '#aaa', flexShrink: 0 }}>→</div>
          </div>
        </a>

      </div>
    </main>
  )
}
