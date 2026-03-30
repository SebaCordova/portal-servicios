'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const MENU_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/proveedores', label: 'Proveedores', icon: '🔧' },
  { href: '/admin/trabajos', label: 'Trabajos', icon: '✅' },
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: '📋' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
  { href: '/admin/categorias', label: 'Categorías', icon: '🗂' },
  { href: '/admin/resenas', label: 'Reseñas', icon: '⭐' },
  { href: '/admin/cms', label: 'Home / CMS', icon: '🖊' },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: '220px', background: '#1a1a2e', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
              Servi<span style={{ color: '#1dbf73' }}>Chile</span>
            </span>
          </a>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>Panel Admin</p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {MENU_ITEMS.map(item => {
            const isActive = pathname === item.href
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 1.5rem', textDecoration: 'none',
                background: isActive ? 'rgba(29,191,115,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #1dbf73' : '3px solid transparent',
                color: isActive ? '#1dbf73' : 'rgba(255,255,255,0.6)',
                fontSize: '13px', fontWeight: isActive ? '600' : '400',
                transition: 'all 0.15s'
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            )
          })}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            → Cerrar sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, background: '#f5f5f5', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
