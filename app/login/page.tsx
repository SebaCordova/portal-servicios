'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode]       = useState<Mode>('login')
  const [email, setEmail]     = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'http://localhost:3000/auth/callback',
        data: mode === 'register' ? { full_name: name } : {}
      }
    })

    if (error) {
      setError('No pudimos enviar el link. Intenta nuevamente.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setEmail('')
    setName('')
    setError('')
    setSent(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f5f5f5',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#1dbf73"/>
              <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#222', letterSpacing: '-0.5px' }}>
              Servi<span style={{ color: '#1dbf73' }}>Chile</span>
            </span>
          </div>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>
            Servicios profesionales a domicilio
          </p>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          padding: '2rem',
          width: '100%',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>
          {!sent ? (
            <>
              <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', marginBottom: '1.8rem' }}>
                {(['login', 'register'] as Mode[]).map(m => (
                  <button key={m} onClick={() => switchMode(m)} style={{
                    flex: 1, padding: '10px', background: 'none', border: 'none',
                    borderBottom: mode === m ? '2px solid #1dbf73' : '2px solid transparent',
                    marginBottom: '-2px', fontSize: '14px',
                    fontWeight: mode === m ? '600' : '400',
                    color: mode === m ? '#1dbf73' : '#888',
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    {m === 'login' ? 'Ingresar' : 'Registrarse'}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSend}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>
                  {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
                </h2>
                {mode === 'register' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                      Nombre completo
                    </label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Tu nombre" required
                      style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      onFocus={e => e.target.style.borderColor = '#1dbf73'}
                      onBlur={e => e.target.style.borderColor = '#ddd'}
                    />
                  </div>
                )}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                    Correo electrónico
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com" required
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => e.target.style.borderColor = '#1dbf73'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                </div>
                {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '12px',
                  background: loading ? '#a8e6c8' : '#1dbf73',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '15px', fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}>
                  {loading ? 'Enviando...' : 'Continuar'}
                </button>
                <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', margin: '1.2rem 0 0', lineHeight: '1.6' }}>
                  Al continuar aceptas nuestros{' '}
                  <a href="#" style={{ color: '#1dbf73', textDecoration: 'none' }}>Términos de servicio</a>
                  {' '}y{' '}
                  <a href="#" style={{ color: '#1dbf73', textDecoration: 'none' }}>Política de privacidad</a>
                </p>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: '#e8f9f1', margin: '0 auto 1.2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="#1dbf73" strokeWidth="1.8"/>
                  <path d="M2 8l10 6 10-6" stroke="#1dbf73" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#222', margin: '0 0 0.8rem' }}>
                Revisa tu email
              </h2>
              <p style={{ color: '#666', fontSize: '14px', margin: '0 0 1.5rem', lineHeight: '1.6' }}>
                Enviamos un link de acceso a<br/>
                <strong style={{ color: '#222' }}>{email}</strong>
              </p>
              <p style={{ color: '#aaa', fontSize: '13px', margin: '0 0 1.5rem', lineHeight: '1.6' }}>
                Haz clic en el link del email para ingresar.<br/>
                El link expira en 1 hora.
              </p>
              <button onClick={() => setSent(false)} style={{
                background: 'none', border: 'none', color: '#1dbf73',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit'
              }}>
                ← Usar otro email
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
