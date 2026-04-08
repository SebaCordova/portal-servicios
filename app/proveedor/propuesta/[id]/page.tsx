'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams } from 'next/navigation'

type Solicitud = {
  id: string
  descripcion: string
  comuna: string
  calle: string
  numero: string
  dato_adicional: string
  sector: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  created_at: string
  categories: { name: string }[]
  profiles: { full_name: string }[]
}

export default function PropuestaPage() {
  const params = useParams()
  const id = params.id as string

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null)

  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaHora, setFechaHora] = useState('')

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

      if (!profile?.is_provider) { window.location.href = '/'; return }

      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('profile_id', profile.id)
        .single()

      setProviderProfileId(pp?.id ?? null)

      const { data: sol } = await supabase
        .from('solicitudes')
        .select(`
          id, descripcion, comuna, calle, numero, dato_adicional,
          sector, fecha_inicio, fecha_fin, estado, created_at,
          categories ( name ),
          profiles!cliente_id ( full_name )
        `)
        .eq('id', id)
        .single()

      setSolicitud(sol as unknown as Solicitud)
      setLoading(false)
    }
    loadData()
  }, [id])

  async function handleSubmit() {
    if (!precio || !fechaHora) { setError('Completa el precio y la fecha estimada.'); return }
    setSaving(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('propuestas')
        .insert({
          solicitud_id: id,
          proveedor_id: providerProfileId,
          precio_clp: parseInt(precio),
          descripcion,
          fecha_hora_estimada: fechaHora,
          estado: 'pendiente'
        })

      if (insertError) throw insertError
      // Obtener datos para el email
      const { data: solData } = await supabase
        .from('solicitudes')
        .select('profiles!cliente_id ( full_name, email ), categories ( name )')
        .eq('id', id)
        .single()

      const { data: provData } = await supabase
        .from('provider_profiles')
        .select('profiles ( full_name )')
        .eq('id', providerProfileId)
        .single()

      await fetch('/api/notifications/propuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailCliente: (solData?.profiles as any)?.email,
          nombreCliente: (solData?.profiles as any)?.full_name,
          nombreProveedor: (provData?.profiles as any)?.full_name,
          categoria: (solData?.categories as any)?.name,
          precio: parseInt(precio),
          fechaHora
        })
      })


      setSuccess(true)
    } catch (err: any) {
      setError('Hubo un error al enviar la propuesta. Intenta nuevamente.')
    }
    setSaving(false)
  }

  function formatFecha(fecha: string) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Cargando...</p>
      </main>
    )
  }

  if (!solicitud) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Solicitud no encontrada.</p>
      </main>
    )
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
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>¡Propuesta enviada!</h2>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: '0 0 1.5rem' }}>
            El cliente recibirá tu propuesta y podrá aceptarla o contactarte para más detalles.
          </p>
          <a href="/proveedor" style={{ display: 'block', padding: '12px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600' }}>
            Volver al dashboard
          </a>
        </div>
      </main>
    )
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #ddd',
    borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'inherit'
  }

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: '500' as const,
    color: '#444', marginBottom: '6px'
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <a href="/proveedor" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← Volver</a>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#222', margin: 0 }}>Enviar propuesta</h1>
        </div>

        {/* Detalle de la solicitud */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{(solicitud.categories as any)?.name}</p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>
                📍 {solicitud.calle} {solicitud.numero}{solicitud.dato_adicional ? `, ${solicitud.dato_adicional}` : ''}, {solicitud.comuna}
              </p>
              {solicitud.sector && <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>🗺 {solicitud.sector}</p>}
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                📅 {formatFecha(solicitud.fecha_inicio)} → {formatFecha(solicitud.fecha_fin)}
              </p>
            </div>
            <span style={{ fontSize: '12px', color: '#065f46', background: '#d1fae5', padding: '4px 10px', borderRadius: '20px' }}>Abierta</span>
          </div>

          <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px 12px' }}>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px', fontWeight: '500' }}>DETALLE DEL CLIENTE</p>
            <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line' }}>{solicitud.descripcion}</p>
          </div>
        </div>

        {/* Formulario propuesta */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>Tu propuesta</h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Precio total (CLP) <span style={{ color: '#e53935' }}>*</span></label>
            <input type="number" value={precio} onChange={e => setPrecio(e.target.value)}
              placeholder="Ej: 85000"
              style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Fecha y hora estimada del servicio <span style={{ color: '#e53935' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
  <input type="date" value={fechaHora.split('T')[0] ?? ''} 
    onChange={e => setFechaHora(e.target.value + 'T' + (fechaHora.split('T')[1] ?? '08:00'))}
    min={solicitud.fecha_inicio}
    style={inputStyle} />
  <select value={fechaHora.split('T')[1]?.slice(0,5) ?? '08:00'}
    onChange={e => setFechaHora((fechaHora.split('T')[0] ?? '') + 'T' + e.target.value)}
    style={{ ...inputStyle, background: '#fff' }}>
    {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
      <option key={h} value={`${String(h).padStart(2,'0')}:00`}>
        {h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h-12}:00 PM`}
      </option>
    ))}
  </select>
</div>  
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Descripción de tu propuesta <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Incluye corte y retiro de ramas, limpieza del área. Traigo todo el equipamiento necesario..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}

          <button onClick={handleSubmit} disabled={saving}
            style={{ width: '100%', padding: '13px', background: saving ? '#a8e6c8' : '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Enviando...' : 'Enviar propuesta'}
          </button>
        </div>
      </div>
    </main>
  )
}
