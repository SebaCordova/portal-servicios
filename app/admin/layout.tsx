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
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setPathname(window.location.pathname)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    window.location.href = '/'
  }


  const Sidebar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
            Servi<span style={{ color: '#1dbf73' }}>Chile</span>
          </span>
        </a>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>Panel Admin</p>
      </div>
      <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
        {MENU_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <a key={item.href} href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 1.5rem', textDecoration: 'none',
                background: isActive ? 'rgba(29,191,115,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #1dbf73' : '3px solid transparent',
                color: isActive ? '#1dbf73' : 'rgba(255,255,255,0.6)',
                fontSize: '13px', fontWeight: isActive ? '600' : '400',
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
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      {/* Sidebar desktop */}
      {!isMobile && (
        <div style={{ width: '220px', background: '#1a1a2e', flexShrink: 0 }}>
          <Sidebar />
        </div>
      )}

      {/* Mobile header */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: '#1a1a2e', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
              Servi<span style={{ color: '#1dbf73' }}>Chile</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '6px', fontWeight: '400' }}>Admin</span>
            </span>
          </a>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {menuOpen ? (
              <span style={{ color: '#fff', fontSize: '20px', lineHeight: 1 }}>✕</span>
            ) : (
              <>
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#fff', borderRadius: '2px' }}/>
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#fff', borderRadius: '2px' }}/>
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#fff', borderRadius: '2px' }}/>
              </>
            )}
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}/>
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '240px', background: '#1a1a2e', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
            <Sidebar />
          </div>
        </>
      )}

      {/* Contenido */}
      <div style={{ flex: 1, background: '#f5f5f5', overflowY: 'auto', marginTop: isMobile ? '52px' : 0 }}>
        {children}
      </div>
    </div>
  )
}
