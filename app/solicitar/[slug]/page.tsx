'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams, useSearchParams } from 'next/navigation'
import { COMUNAS_RM } from '@/lib/constants'

const SLUGS_FLUJO_ESPECIAL = ['retiro-ramas', 'retiro-escombros']

type Sector = {
  nombre: string
  fotos: File[]
  volumen_estimado: string
}

type Step = 1 | 2 | 3 | 4

export default function SolicitarPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const proveedorId = searchParams.get('proveedor')
  const esFlujoEspecial = SLUGS_FLUJO_ESPECIAL.includes(slug)

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [categoria, setCategoria] = useState<{ id: string; name: string } | null>(null)

  const [comuna, setComuna] = useState('')
  const [calle, setCalle] = useState('')
  const [numero, setNumero] = useState('')
  const [datoAdicional, setDatoAdicional] = useState('')
  const [sector, setSector] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const [descripcionGenerica, setDescripcionGenerica] = useState('')
  const [fotosGenericas, setFotosGenericas] = useState<File[]>([])

  const [numSectores, setNumSectores] = useState(1)
  const [sectores, setSectores] = useState<Sector[]>([{ nombre: '', fotos: [], volumen_estimado: '' }])
  const [necesitaCortes, setNecesitaCortes] = useState<boolean | null>(null)
  const [accesoVehicular, setAccesoVehicular] = useState('')
  const [comentarios, setComentarios] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadCategoria() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('slug', slug)
        .single()
      setCategoria(data)
    }
    loadCategoria()
  }, [slug])

  function updateSector(index: number, field: keyof Sector, value: any) {
    setSectores(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function handleNumSectores(n: number) {
    setNumSectores(n)
    setSectores(Array.from({ length: n }, (_, i) => sectores[i] ?? { nombre: '', fotos: [], volumen_estimado: '' }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
      if (!profile) throw new Error('Perfil no encontrado')

      let descripcion = ''
      if (esFlujoEspecial) {
        descripcion = `Sectores: ${sectores.map(s => `${s.nombre || 'Sin nombre'} (vol. estimado: ${s.volumen_estimado || 'por estimar'})`).join(', ')}. Necesita cortes: ${necesitaCortes === true ? 'Sí' : necesitaCortes === false ? 'No' : 'No indicado'}. Acceso vehicular: ${accesoVehicular || 'No indicado'}. Comentarios: ${comentarios || 'Ninguno'}`
      } else {
        descripcion = descripcionGenerica
      }

      const { data, error: insertError } = await supabase.from('solicitudes').insert({
        cliente_id: profile.id,
        category_id: categoria?.id,
        descripcion,
        calle, numero,
        dato_adicional: datoAdicional,
        direccion: `${calle} ${numero}${datoAdicional ? `, ${datoAdicional}` : ''}`,
        sector, comuna,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: 'abierta',
        proveedor_directo_id: proveedorId ?? null
      }).select('id').single()

      if (insertError) throw insertError

      await fetch('/api/notifications/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: data.id, categoryId: categoria?.id, comuna })
      })

      setSuccess(true)
    } catch {
      setError('Hubo un error al enviar tu solicitud. Intenta nuevamente.')
    }
    setLoading(false)
  }

  const inputStyle = { width: '100%', padding: '11px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500' as const, color: '#444', marginBottom: '6px' }
  const totalSteps = 4

  if (success) return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e8f9f1', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#1dbf73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>¡Solicitud enviada!</h2>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: '0 0 1.5rem' }}>Los proveedores disponibles en tu zona recibirán tu solicitud y te enviarán sus cotizaciones.</p>
        <a href="/" style={{ display: 'block', padding: '12px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600' }}>Volver al inicio</a>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>Servi<span style={{ color: '#1dbf73' }}>Chile</span></h1>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>{categoria?.name ?? 'Solicitar servicio'}{proveedorId && <span style={{ color: '#1dbf73' }}> · Cotización directa</span>}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < totalSteps - 1 ? 1 : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= s ? '#1dbf73' : '#e0e0e0', color: step >= s ? '#fff' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>{s}</div>
              {i < totalSteps - 1 && <div style={{ flex: 1, height: '2px', background: step > s ? '#1dbf73' : '#e0e0e0', margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {step === 1 && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>¿Dónde necesitas el servicio?</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Comuna <span style={{ color: '#e53935' }}>*</span></label>
                <select value={comuna} onChange={e => setComuna(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                  <option value="">Selecciona una comuna</option>
                  {COMUNAS_RM.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Calle <span style={{ color: '#e53935' }}>*</span></label>
                  <input type="text" value={calle} onChange={e => setCalle(e.target.value)} placeholder="Av. Providencia" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Número <span style={{ color: '#e53935' }}>*</span></label>
                  <input type="text" value={numero} onChange={e => setNumero(e.target.value)} placeholder="1234" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Depto / Casa / Dato adicional <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
                <input type="text" value={datoAdicional} onChange={e => setDatoAdicional(e.target.value)} placeholder="Depto 301, Casa B, etc." style={inputStyle} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Referencia / sector <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
                <input type="text" value={sector} onChange={e => setSector(e.target.value)} placeholder="Cerca del metro, portón negro..." style={inputStyle} />
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <button onClick={() => { if (!comuna || !calle || !numero) { setError('Completa los campos obligatorios: comuna, calle y número.'); return } setError(''); setStep(2) }} style={{ width: '100%', padding: '12px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
            </>
          )}

          {step === 2 && !esFlujoEspecial && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>¿Qué necesitas?</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Describe el trabajo que necesitas <span style={{ color: '#e53935' }}>*</span></label>
                <textarea value={descripcionGenerica} onChange={e => setDescripcionGenerica(e.target.value)}
                  placeholder={`Ej: Necesito ${categoria?.name?.toLowerCase() ?? 'el servicio'} para... Describe con el mayor detalle posible qué necesitas, el estado actual y cualquier detalle relevante.`}
                  rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0' }}>Mientras más detalles des, mejores cotizaciones recibirás.</p>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Fotos del trabajo <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', border: '1.5px dashed #1dbf73', borderRadius: '8px', background: '#f0fdf7', color: '#1dbf73', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  📎 {fotosGenericas.length > 0 ? `${fotosGenericas.length} archivo${fotosGenericas.length !== 1 ? 's' : ''} seleccionado${fotosGenericas.length !== 1 ? 's' : ''}` : 'Subir fotos o videos'}
                  <input type="file" accept="image/*,video/*" multiple onChange={e => setFotosGenericas(Array.from(e.target.files ?? []))} style={{ display: 'none' }} />
                </label>
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                <button onClick={() => { if (!descripcionGenerica.trim()) { setError('Por favor describe el trabajo que necesitas.'); return } setError(''); setStep(3) }} style={{ flex: 1, padding: '12px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
              </div>
            </>
          )}

          {step === 2 && esFlujoEspecial && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>¿Qué necesitas retirar?</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>¿En cuántos sectores está el material? <span style={{ color: '#e53935' }}>*</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1,2,3,4].map(n => (
                    <button key={n} onClick={() => handleNumSectores(n)} style={{ flex: 1, padding: '10px', border: `1.5px solid ${numSectores === n ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: numSectores === n ? '#f0fdf7' : '#fff', color: numSectores === n ? '#1dbf73' : '#444', fontWeight: numSectores === n ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>
                      {n === 4 ? '3+' : n}
                    </button>
                  ))}
                </div>
              </div>
              {sectores.map((s, i) => (
                <div key={i} style={{ marginBottom: '1.2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#444', margin: '0 0 10px' }}>Sector {i + 1}</p>
                  <div style={{ marginBottom: '0.8rem' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Nombre del sector</label>
                    <input type="text" value={s.nombre} onChange={e => updateSector(i, 'nombre', e.target.value)} placeholder="Ej: Patio trasero, Entrada, Terraza" style={{ ...inputStyle, padding: '9px 12px', fontSize: '13px' }} />
                  </div>
                  <div style={{ marginBottom: '0.8rem' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Fotos del sector</label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', border: '1.5px dashed #1dbf73', borderRadius: '8px', background: '#f0fdf7', color: '#1dbf73', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      📎 {s.fotos.length > 0 ? `${s.fotos.length} archivo${s.fotos.length !== 1 ? 's' : ''} seleccionado${s.fotos.length !== 1 ? 's' : ''}` : 'Subir fotos o videos'}
                      <input type="file" accept="image/*,video/*" multiple onChange={e => updateSector(i, 'fotos', Array.from(e.target.files ?? []))} style={{ display: 'none' }} />
                    </label>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Volumen estimado (m³)</label>
                    <input type="number" value={s.volumen_estimado} onChange={e => updateSector(i, 'volumen_estimado', e.target.value)} placeholder="Ej: 2.5" style={{ ...inputStyle, padding: '9px 12px', fontSize: '13px' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ ...labelStyle, marginBottom: '8px' }}>¿El material necesita cortes adicionales?</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map(opt => (
                    <button key={opt.label} onClick={() => setNecesitaCortes(opt.value)} style={{ flex: 1, padding: '10px', border: `1.5px solid ${necesitaCortes === opt.value ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: necesitaCortes === opt.value ? '#f0fdf7' : '#fff', color: necesitaCortes === opt.value ? '#1dbf73' : '#444', fontWeight: necesitaCortes === opt.value ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ ...labelStyle, marginBottom: '8px' }}>¿Tiene acceso vehicular?</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Sí', 'No', 'Limitado'].map(opt => (
                    <button key={opt} onClick={() => setAccesoVehicular(opt)} style={{ padding: '10px 16px', border: `1.5px solid ${accesoVehicular === opt ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: accesoVehicular === opt ? '#f0fdf7' : '#fff', color: accesoVehicular === opt ? '#1dbf73' : '#444', fontWeight: accesoVehicular === opt ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>{opt}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Comentarios adicionales <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
                <textarea value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Ej: El acceso es por la puerta lateral..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                <button onClick={() => { setError(''); setStep(3) }} style={{ flex: 1, padding: '12px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>¿Cuándo necesitas el servicio?</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Fecha más cercana disponible <span style={{ color: '#e53935' }}>*</span></label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} min={new Date().toISOString().split('T')[0]} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Fecha límite <span style={{ color: '#e53935' }}>*</span></label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} min={fechaInicio || new Date().toISOString().split('T')[0]} style={inputStyle} />
              </div>
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                <button onClick={() => { if (!fechaInicio || !fechaFin) { setError('Selecciona el rango de fechas.'); return } if (fechaFin < fechaInicio) { setError('La fecha límite debe ser igual o posterior a la fecha de inicio.'); return } setError(''); setStep(4) }} style={{ flex: 1, padding: '12px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>Resumen de tu solicitud</h2>
              <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '1.2rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Servicio</p>
                  <p style={{ fontSize: '14px', color: '#222', margin: 0, fontWeight: '600' }}>{categoria?.name}</p>
                </div>
                <div style={{ marginBottom: '0.8rem' }}>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Ubicación</p>
                  <p style={{ fontSize: '14px', color: '#222', margin: 0 }}>{calle} {numero}{datoAdicional ? `, ${datoAdicional}` : ''}, {comuna}</p>
                  {sector && <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0' }}>{sector}</p>}
                </div>
                <div style={{ marginBottom: '0.8rem' }}>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Descripción</p>
                  {esFlujoEspecial ? (
                    sectores.map((s, i) => (
                      <p key={i} style={{ fontSize: '14px', color: '#222', margin: '0 0 2px' }}>{i + 1}. {s.nombre || `Sector ${i+1}`}{s.volumen_estimado && ` — ${s.volumen_estimado} m³`}</p>
                    ))
                  ) : (
                    <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5' }}>{descripcionGenerica}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Fechas disponibles</p>
                  <p style={{ fontSize: '14px', color: '#222', margin: 0 }}>
                    {new Date(fechaInicio + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} → {new Date(fechaFin + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {proveedorId && (
                <div style={{ background: '#f0fdf7', border: '1px solid #d1fae5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '13px', color: '#065f46', margin: 0 }}>✓ Esta cotización será enviada directamente al proveedor seleccionado</p>
                </div>
              )}
              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '12px', background: loading ? '#a8e6c8' : '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Enviando...' : 'Publicar solicitud'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  )
}
