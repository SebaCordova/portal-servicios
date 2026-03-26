'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Profile = {
  full_name: string
  is_provider: boolean
  is_admin: boolean
}

type Categoria = {
  id: string
  name: string
  slug: string
  icon: string
}

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const categoriasRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .eq('activa', true)
        .order('name')
      setCategorias(cats ?? [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, is_provider, is_admin')
          .eq('auth_user_id', user.id)
          .single()
        setProfile(data)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (categoriasRef.current && !categoriasRef.current.contains(e.target as Node)) setCategoriasOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function getEmoji(icon: string) {
    const map: Record<string, string> = {
      flower: '🌸', scissors: '✂️', trash: '🗑️',
      wrench: '🔧', droplets: '💧', zap: '⚡', hammer: '🔨'
    }
    return map[icon] ?? '🛠️'
  }

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'Helvetica Neue', Arial, sans-serif", position: 'sticky', top: 0, zIndex: 100 }}>

      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#1dbf73"/>
          <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#222', letterSpacing: '-0.5px' }}>
          Servi<span style={{ color: '#1dbf73' }}>Chile</span>
        </span>
      </a>

      <div ref={categoriasRef} style={{ position: 'relative' }}>
        <button onClick={() => setCategoriasOpen(!categoriasOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', fontSize: '14px', fontWeight: '500', color: '#444', cursor: 'pointer', fontFamily: 'inherit', padding: '8px 12px', borderRadius: '8px' }}>
          Servicios
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {categoriasOpen && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(100% + 8px)', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', minWidth: '280px', overflow: 'hidden', zIndex: 200 }}>
            <div style={{ padding: '8px' }}>
              {categorias.map(cat => (
                <a key={cat.id} href={`/categorias/${cat.slug}`} onClick={() => setCategoriasOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: '#222', fontSize: '14px' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontSize: '18px' }}>{getEmoji(cat.icon)}</span>
                  <span>{cat.name}</span>
                </a>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 16px' }}>
              <a href="/categorias" style={{ fontSize: '13px', color: '#1dbf73', textDecoration: 'none', fontWeight: '500' }}>Ver todos los servicios →</a>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f0f0', flexShrink: 0 }} />
      ) : profile ? (
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1.5px solid #e0e0e0', borderRadius: '20px', padding: '4px 12px 4px 4px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>
              {getInitials(profile.full_name || 'U')}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#222' }}>{profile.full_name?.split(' ')[0] || 'Usuario'}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '180px', overflow: 'hidden', zIndex: 200 }}>
              {profile.is_admin && <a href="/admin" style={menuItemStyle}>🛡 Panel admin</a>}
              {profile.is_provider && <a href="/proveedor" style={menuItemStyle}>🔧 Portal proveedor</a>}
              <a href="/cuenta" style={menuItemStyle}>👤 Mi cuenta</a>
              <div style={{ borderTop: '1px solid #f0f0f0' }} />
              <button onClick={handleLogout} style={{ ...menuItemStyle, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#e53935' }}>
                → Cerrar sesión
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <a href="/login" style={{ fontSize: '14px', color: '#444', textDecoration: 'none', fontWeight: '500' }}>Ingresar</a>
          <a href="/login" style={{ padding: '8px 16px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Registrarse</a>
        </div>
      )}
    </header>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', padding: '10px 16px', fontSize: '14px',
  color: '#222', textDecoration: 'none', cursor: 'pointer',
}
