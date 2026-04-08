'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { validarRut, formatearRut } from '@/lib/utils/validators'

const CATEGORIAS = [
  { id: '505d3851-f7a8-4dbd-ae4d-d738df48dc8c', name: 'Paisajismo, Planificación y cuidado del jardín' },
  { id: '9abeee56-a7bc-45ef-9f9e-5aae8573429d', name: 'Retiro de ramas y poda' },
  { id: 'a9c16462-2e91-42d3-9b8e-f8fba39ea868', name: 'Retiro de escombros' },
  { id: '0d9821d5-bceb-46c5-85b8-64a51b23b4d8', name: 'Gasfitería domiciliaria' },
  { id: 'd13264d6-5df6-4581-b274-1b7afa3e449d', name: 'Instalación de Riego' },
  { id: '1b5acddd-f545-42d1-a7e1-fde2680bf400', name: 'Electricidad domiciliaria' },
  { id: '9ff6fa40-ce6d-4f4d-949c-79ff3b2accbc', name: 'Obras menores y Remodelaciones' },
]

const COMUNAS = [
  'Santiago', 'Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa',
  'La Florida', 'Maipú', 'Pudahuel', 'Quilicura', 'Recoleta',
  'Independencia', 'San Miguel', 'La Cisterna', 'El Bosque', 'La Pintana',
  'Peñalolén', 'Macul', 'San Joaquín', 'Lo Espejo', 'Cerrillos',
  'Estación Central', 'Quinta Normal', 'Lo Prado', 'Cerro Navia', 'Renca',
  'Huechuraba', 'Conchalí', 'Colina', 'Lampa', 'Til Til',
  'Pirque', 'San José de Maipo', 'Puente Alto', 'La Reina', 'Lo Barnechea',
]

type Step = 1 | 2 | 3

export default function PerfilProveedorPage() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [rut, setRut] = useState('')
  const [rutError, setRutError] = useState('')
  const [phone, setPhone] = useState('')

  const [categorias, setCategorias] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [price, setPrice] = useState('')

  const [comunas, setComunas] = useState<string[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email ?? '')
        setFullName(user.user_metadata?.full_name ?? '')
      }
    }
    loadUser()
  }, [])

  function handleRutChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value
    setRut(valor)
    if (valor.length > 3) {
      if (!validarRut(valor)) {
        setRutError('RUT inválido')
      } else {
        setRutError('')
        setRut(formatearRut(valor))
      }
    } else {
      setRutError('')
    }
  }

  function toggleCategoria(id: string) {
    setCategorias(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  function toggleComuna(comuna: string) {
    setComunas(prev =>
      prev.includes(comuna) ? prev.filter(c => c !== comuna) : [...prev, comuna]
    )
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('auth_user_id', user.id)
        .select('id')
        .single()

      if (profileError) throw profileError

      const { data: providerProfile, error: providerError } = await supabase
        .from('provider_profiles')
        .insert({ profile_id: profile.id, rut, bio, price_per_hour: price ? parseInt(price) : null })
        .select('id')
        .single()

      if (providerError) throw providerError

      // Guardar comunas
      const zonasData = comunas.map(comuna => ({
        provider_id: providerProfile.id,
        comuna,
        region: 'Región Metropolitana'
      }))
      const { error: zonasError } = await supabase
        .from('provider_zones')
        .insert(zonasData)
      if (zonasError) throw zonasError

      // Guardar categorías en services
      const serviciosData = categorias.map(category_id => ({
        provider_id: providerProfile.id,
        category_id,
        title: CATEGORIAS.find(c => c.id === category_id)?.name ?? '',
        description: bio,
        price_clp: price ? parseInt(price) : null,
        active: false
      }))
      const { error: serviciosError } = await supabase
        .from('services')
        .insert(serviciosData)
      if (serviciosError) throw serviciosError

      await fetch("/api/notifications/solicitud-proveedor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: fullName }) })
      setSuccess(true)
    } catch (err: any) {
      setError('Hubo un error al guardar. Intenta nuevamente.')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e8f9f1', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#1dbf73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>¡Solicitud enviada!</h2>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            Revisaremos tu perfil y te notificaremos cuando esté aprobado.<br/>Normalmente tarda 1-2 días hábiles.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 6px' }}>
            Servi<span style={{ color: '#1dbf73' }}>Chile</span>
          </h1>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Registro de proveedor</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: step >= s ? '#1dbf73' : '#e0e0e0',
                color: step >= s ? '#fff' : '#999',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '600', flexShrink: 0
              }}>{s}</div>
              {i < 2 && <div style={{ flex: 1, height: '2px', background: step > s ? '#1dbf73' : '#e0e0e0', margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {step === 1 && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>Datos personales</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Nombre completo <span style={{ color: '#e53935' }}>*</span></label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre completo"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                  Correo electrónico <span style={{ fontSize: '11px', color: '#1dbf73', fontWeight: '400' }}>✓ verificado</span>
                </label>
                <input type="email" value={email} readOnly
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', color: '#888', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#f9f9f9', cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>RUT <span style={{ color: '#e53935' }}>*</span></label>
                <input type="text" value={rut} onChange={handleRutChange} placeholder="12.345.678-9"
                  style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${rutError ? '#e53935' : '#ddd'}`, borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {rutError && <p style={{ color: '#e53935', fontSize: '12px', margin: '4px 0 0' }}>{rutError}</p>}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Teléfono <span style={{ color: '#e53935' }}>*</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+56 9 1234 5678"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <button
                onClick={() => {
                  if (!fullName || !rut || !phone) { setError('Completa todos los campos obligatorios.'); return }
                  if (!validarRut(rut)) { setError('El RUT ingresado no es válido.'); return }
                  setError('')
                  setStep(2)
                }}
                style={{ width: '100%', padding: '12px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Continuar →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>Servicios</h2>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '8px' }}>Categorías <span style={{ color: '#e53935' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {CATEGORIAS.map(cat => (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', border: `1.5px solid ${categorias.includes(cat.id) ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: categorias.includes(cat.id) ? '#f0fdf7' : '#fff' }}>
                      <input type="checkbox" checked={categorias.includes(cat.id)} onChange={() => toggleCategoria(cat.id)} style={{ accentColor: '#1dbf73' }} />
                      <span style={{ fontSize: '14px', color: '#222' }}>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Descripción / experiencia <span style={{ color: '#aaa', fontWeight: '400' }}>(opcional)</span></label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Cuéntanos sobre tu experiencia..." rows={3}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Precio por hora (CLP) <span style={{ color: '#aaa', fontWeight: '400' }}>(opcional)</span></label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="15000"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                <button
                  onClick={() => {
                    if (categorias.length === 0) { setError('Selecciona al menos una categoría.'); return }
                    setError('')
                    setStep(3)
                  }}
                  style={{ flex: 1, padding: '12px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Continuar →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>Cobertura</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '8px' }}>Comunas donde trabajas <span style={{ color: '#e53935' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '320px', overflowY: 'auto', padding: '4px' }}>
                  {COMUNAS.map(comuna => (
                    <label key={comuna} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 10px', border: `1.5px solid ${comunas.includes(comuna) ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: comunas.includes(comuna) ? '#f0fdf7' : '#fff' }}>
                      <input type="checkbox" checked={comunas.includes(comuna)} onChange={() => toggleComuna(comuna)} style={{ accentColor: '#1dbf73' }} />
                      <span style={{ fontSize: '13px', color: '#222' }}>{comuna}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                <button
                  onClick={() => {
                    if (comunas.length === 0) { setError('Selecciona al menos una comuna.'); return }
                    handleSubmit()
                  }}
                  disabled={loading}
                  style={{ flex: 1, padding: '12px', background: loading ? '#a8e6c8' : '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
