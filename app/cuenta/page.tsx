'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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

type Tab = 'personal' | 'negocio'

export default function CuentaPage() {
  const [tab, setTab] = useState<Tab>('personal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isProvider, setIsProvider] = useState(false)
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null)

  // Datos personales
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  // Datos negocio
  const [bio, setBio] = useState('')
  const [price, setPrice] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [comunas, setComunas] = useState<string[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, address, is_provider, id')
        .eq('auth_user_id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setPhone(profile.phone ?? '')
        setAddress(profile.address ?? '')
        setIsProvider(profile.is_provider)

        if (profile.is_provider) {
          const { data: pp } = await supabase
            .from('provider_profiles')
            .select('id, bio, price_per_hour')
            .eq('profile_id', profile.id)
            .single()

          if (pp) {
            setProviderProfileId(pp.id)
            setBio(pp.bio ?? '')
            setPrice(pp.price_per_hour?.toString() ?? '')

            const { data: services } = await supabase
              .from('services')
              .select('category_id')
              .eq('provider_id', pp.id)
            setCategorias(services?.map(s => s.category_id) ?? [])

            const { data: zones } = await supabase
              .from('provider_zones')
              .select('comuna')
              .eq('provider_id', pp.id)
            setComunas(zones?.map(z => z.comuna) ?? [])
          }
        }
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function savePersonal() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, address })
      .eq('auth_user_id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveNegocio() {
    setSaving(true)
    if (!providerProfileId) return

    await supabase
      .from('provider_profiles')
      .update({ bio, price_per_hour: price ? parseInt(price) : null })
      .eq('id', providerProfileId)

    // Actualizar categorías
    await supabase.from('services').delete().eq('provider_id', providerProfileId)
    if (categorias.length > 0) {
      await supabase.from('services').insert(
        categorias.map(category_id => ({
          provider_id: providerProfileId,
          category_id,
          title: CATEGORIAS.find(c => c.id === category_id)?.name ?? '',
          active: true
        }))
      )
    }

    // Actualizar comunas
    await supabase.from('provider_zones').delete().eq('provider_id', providerProfileId)
    if (comunas.length > 0) {
      await supabase.from('provider_zones').insert(
        comunas.map(comuna => ({
          provider_id: providerProfileId,
          comuna,
          region: 'Región Metropolitana'
        }))
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#1dbf73"/>
            <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#222' }}>Servi<span style={{ color: '#1dbf73' }}>Chile</span></span>
        </div>
        <a href="/" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#222', margin: '0 0 1.5rem' }}>Mi cuenta</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', marginBottom: '2rem' }}>
          <button onClick={() => setTab('personal')} style={{
            padding: '10px 20px', background: 'none', border: 'none',
            borderBottom: tab === 'personal' ? '2px solid #1dbf73' : '2px solid transparent',
            marginBottom: '-2px', fontSize: '14px',
            fontWeight: tab === 'personal' ? '600' : '400',
            color: tab === 'personal' ? '#1dbf73' : '#888',
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Datos personales
          </button>
          {isProvider && (
            <button onClick={() => setTab('negocio')} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: tab === 'negocio' ? '2px solid #1dbf73' : '2px solid transparent',
              marginBottom: '-2px', fontSize: '14px',
              fontWeight: tab === 'negocio' ? '600' : '400',
              color: tab === 'negocio' ? '#1dbf73' : '#888',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Mi negocio
            </button>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Tab Personal */}
          {tab === 'personal' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                  Correo electrónico <span style={{ fontSize: '11px', color: '#1dbf73' }}>✓ verificado</span>
                </label>
                <input type="email" value={email} readOnly
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', color: '#888', background: '#f9f9f9', cursor: 'not-allowed', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              {[
                { label: 'Nombre completo', value: fullName, setter: setFullName, placeholder: 'Tu nombre completo', type: 'text' },
                { label: 'Teléfono', value: phone, setter: setPhone, placeholder: '+56 9 1234 5678', type: 'tel' },
                { label: 'Dirección', value: address, setter: setAddress, placeholder: 'Tu dirección', type: 'text' },
              ].map(({ label, value, setter, placeholder, type }) => (
                <div key={label} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>{label}</label>
                  <input type={type} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              ))}
              <button onClick={savePersonal} disabled={saving}
                style={{ width: '100%', padding: '12px', background: saved ? '#e8f9f1' : saving ? '#a8e6c8' : '#1dbf73', color: saved ? '#065f46' : '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          )}

          {/* Tab Negocio */}
          {tab === 'negocio' && isProvider && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Descripción / experiencia</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Cuéntanos sobre tu experiencia..." rows={3}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>Precio por hora (CLP)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="15000"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '8px' }}>Categorías</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {CATEGORIAS.map(cat => (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', border: `1.5px solid ${categorias.includes(cat.id) ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: categorias.includes(cat.id) ? '#f0fdf7' : '#fff' }}>
                      <input type="checkbox" checked={categorias.includes(cat.id)}
                        onChange={() => setCategorias(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                        style={{ accentColor: '#1dbf73' }} />
                      <span style={{ fontSize: '14px', color: '#222' }}>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '8px' }}>Comunas</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '320px', overflowY: 'auto', padding: '4px' }}>
                  {COMUNAS.map(comuna => (
                    <label key={comuna} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 10px', border: `1.5px solid ${comunas.includes(comuna) ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: comunas.includes(comuna) ? '#f0fdf7' : '#fff' }}>
                      <input type="checkbox" checked={comunas.includes(comuna)}
                        onChange={() => setComunas(prev => prev.includes(comuna) ? prev.filter(c => c !== comuna) : [...prev, comuna])}
                        style={{ accentColor: '#1dbf73' }} />
                      <span style={{ fontSize: '13px', color: '#222' }}>{comuna}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={saveNegocio} disabled={saving}
                style={{ width: '100%', padding: '12px', background: saved ? '#e8f9f1' : saving ? '#a8e6c8' : '#1dbf73', color: saved ? '#065f46' : '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
