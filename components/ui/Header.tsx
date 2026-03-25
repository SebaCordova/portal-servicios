'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Profile = {
  full_name: string
  is_provider: boolean
  is_admin: boolean
}

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, is_provider, is_admin')
        .eq('auth_user_id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
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

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'Helvetica Neue', Arial, sans-serif", position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Logo */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#1dbf73"/>
          <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#222', letterSpacing: '-0.5px' }}>
          Servi<span style={{ color: '#1dbf73' }}>Chile</span>
        </span>
      </a>

      {/* Derecha */}
      {loading ? (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f0f0' }} />
      ) : profile ? (
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1.5px solid #e0e0e0', borderRadius: '20px', padding: '4px 12px 4px 4px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>
              {getInitials(profile.full_name || 'U')}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#222' }}>
              {profile.full_name?.split(' ')[0] || 'Usuario'}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '180px', overflow: 'hidden', zIndex: 200 }}>
              {profile.is_admin && (
                <a href="/admin" style={menuItemStyle}>
                  🛡 Panel admin
                </a>
              )}
              {profile.is_provider && (
                <a href="/proveedor" style={menuItemStyle}>
                  🔧 Portal proveedor
                </a>
              )}
              <a href="/cuenta" style={menuItemStyle}>
                👤 Mi cuenta
              </a>
              <div style={{ borderTop: '1px solid #f0f0f0' }} />
              <button onClick={handleLogout} style={{ ...menuItemStyle, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#e53935' }}>
                → Cerrar sesión
              </button>
            </div>
          )}
        </div>
      ) : (
        <a href="/login" style={{ padding: '8px 16px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          Ingresar
        </a>
      )}
    </header>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 16px',
  fontSize: '14px',
  color: '#222',
  textDecoration: 'none',
  cursor: 'pointer',
}
