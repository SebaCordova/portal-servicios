'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams, useSearchParams } from 'next/navigation'
import { COMUNAS_RM } from '@/lib/constants'

type Sector = {
  nombre: string
  fotos: File[]
  volumen_estimado: string
}

type Step = 1 | 2 | 3 | 4

const MAX_FOTO_MB = 10
const MAX_FOTOS_POR_SECTOR = 5
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']

export default function SolicitarPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const proveedorId = searchParams.get('proveedor')

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [fotoErrors, setFotoErrors] = useState<Record<number, string>>({})
  const [categoria, setCategoria] = useState<{ id: string; name: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [comuna, setComuna] = useState('')
  const [calle, setCalle] = useState('')
  const [numero, setNumero] = useState('')
  const [datoAdicional, setDatoAdicional] = useState('')
  const [sector, setSector] = useState('')

  const [numSectores, setNumSectores] = useState(1)
  const [sectores, setSectores] = useState<Sector[]>([{ nombre: '', fotos: [], volumen_estimado: '' }])
  const [necesitaCortes, setNecesitaCortes] = useState<boolean | null>(null)
  const [accesoVehicular, setAccesoVehicular] = useState('')
  const [comentarios, setComentarios] = useState('')

  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

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

  function validarFotos(archivos: File[]): string {
    if (archivos.length > MAX_FOTOS_POR_SECTOR) {
      return `Máximo ${MAX_FOTOS_POR_SECTOR} archivos por sector`
    }
    for (const archivo of archivos) {
      if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
        return `Solo se permiten imágenes (JPG, PNG, WebP) y videos (MP4, MOV)`
      }
      if (archivo.size > MAX_FOTO_MB * 1024 * 1024) {
        return `"${archivo.name}" supera el límite de ${MAX_FOTO_MB} MB`
      }
    }
    return ''
  }

  function handleFotos(index: number, archivos: File[]) {
    const errorMsg = validarFotos(archivos)
    setFotoErrors(prev => ({ ...prev, [index]: errorMsg }))
    if (!errorMsg) updateSector(index, 'fotos', archivos)
  }

  function updateSector(index: number, field: keyof Sector, value: any) {
    setSectores(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function handleNumSectores(n: number) {
    setNumSectores(n)
    setSectores(Array.from({ length: n }, (_, i) => sectores[i] ?? { nombre: '', fotos: [], volumen_estimado: '' }))
  }

  async function subirFotosSector(sectorIdx: number, solicitudId: string): Promise<string[]> {
    const fotos = sectores[sectorIdx].fotos
    if (!fotos.length) return []
    const urls: string[] = []
    for (const foto of fotos) {
      const ext = foto.name.split('.').pop() ?? 'jpg'
      const path = `${solicitudId}/sector${sectorIdx + 1}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error: uploadError } = await supabase.storage
        .from('solicitudes-fotos')
        .upload(path, foto, { contentType: foto.type, upsert: false })
      if (uploadError) { console.error('Error subiendo foto:', uploadError.message); continue }
      const { data: urlData } = supabase.storage.from('solicitudes-fotos').getPublicUrl(data.path)
      urls.push(urlData.publicUrl)
    }
    return urls
  }

  async function handleSubmit() {
    setLoading(true); setError(''); setUploadProgress(0)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
      if (!profile) throw new Error('Perfil no encontrado')

      const descripcion = `Sectores: ${sectores.map(s => `${s.nombre || 'Sin nombre'} (vol. estimado: ${s.volumen_estimado || 'por estimar'})`).join(', ')}
Necesita cortes: ${necesitaCortes === true ? 'Sí' : necesitaCortes === false ? 'No' : 'No indicado'}
Acceso vehicular: ${accesoVehicular || 'No indicado'}
Comentarios: ${comentarios || 'Ninguno'}`.trim()

      const { data, error: insertError } = await supabase.from('solicitudes').insert({
        cliente_id: profile.id, category_id: categoria?.id, descripcion,
        calle, numero, dato_adicional: datoAdicional,
        direccion: `${calle} ${numero}${datoAdicional ? `, ${datoAdicional}` : ''}`,
        sector, comuna, fecha_inicio: fechaInicio, fecha_fin: fechaFin,
        estado: 'abierta', proveedor_directo_id: proveedorId ?? null
      }).select('id').single()
      if (insertError) throw insertError

      const sectoresConFotos = sectores.filter(s => s.fotos.length > 0)
      let subidos = 0
      for (let i = 0; i < sectores.length; i++) {
        if (!sectores[i].fotos.length) continue
        const urls = await subirFotosSector(i, data.id)
        if (urls.length > 0) {
          await supabase.from('solicitud_fotos').insert(
            urls.map(url => ({
              solicitud_id: data.id,
              sector_idx: i,
              sector_nombre: sectores[i].nombre || `Sector ${i + 1}`,
              url
            }))
          )
        }
        subidos++
        setUploadProgress(Math.round((subidos / sectoresConFotos.length) * 100))
      }

      await fetch('/api/notifications/solicitud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: data.id, categoryId: categoria?.id, comuna })
      })
      setSuccess(true)
    } catch {
      setError('Hubo un error al enviar tu solicitud. Intenta nuevamente.')
    }
    setLoading(false)
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

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e8f9f1', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#1dbf73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>¡Solicitud enviada!</h2>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: '0 0 1.5rem' }}>
            Los proveedores disponibles en tu zona recibirán tu solicitud y te enviarán sus cotizaciones.
          </p>
          <a href="/" style={{ display: 'block', padding: '12px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600' }}>Volver al inicio</a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>Servi<span style={{ color: '#1dbf73' }}>Chile</span></h1>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>
            {categoria?.name ?? 'Solicitar servicio'}{proveedorId && <span style={{ color: '#1dbf73' }}> · Cotización directa</span>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          {[1,2,3,4].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= s ? '#1dbf73' : '#e0e0e0', color: step >= s ? '#fff' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>{s}</div>
              {i < 3 && <div style={{ flex: 1, height: '2px', background: step > s ? '#1dbf73' : '#e0e0e0', margin: '0 8px' }} />}
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

          {step === 2 && (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#222', margin: '0 0 1.5rem' }}>¿Qué necesitas retirar?</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>¿En cuántos sectores está el material? <span style={{ color: '#e53935' }}>*</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1,2,3,4].map(n => (
                    <button key={n} onClick={() => handleNumSectores(n)} style={{ flex: 1, padding: '10px', border: `1.5px solid ${numSectores === n ? '#1dbf73' : '#ddd'}`, borderRadius: '8px', background: numSectores === n ? '#f0fdf7' : '#fff', color: numSectores === n ? '#1dbf73' : '#444', fontWeight: numSectores === n ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>{n === 4 ? '3+' : n}</button>
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
                    <label style={{ ...labelStyle, fontSize: '12px' }}>
                      Fotos del sector{' '}
                      <span style={{ color: '#aaa', fontWeight: 400 }}>— máx. {MAX_FOTOS_POR_SECTOR} archivos · {MAX_FOTO_MB} MB por archivo · JPG, PNG, MP4</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', border: `1.5px dashed ${fotoErrors[i] ? '#e53935' : '#1dbf73'}`, borderRadius: '8px', background: fotoErrors[i] ? '#fff5f5' : '#f0fdf7', color: fotoErrors[i] ? '#e53935' : '#1dbf73', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                      📎 {s.fotos.length > 0 ? `${s.fotos.length} archivo${s.fotos.length !== 1 ? 's' : ''} seleccionado${s.fotos.length !== 1 ? 's' : ''}` : 'Subir fotos o videos'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime" multiple
                        onChange={e => handleFotos(i, Array.from(e.target.files ?? []))}
                        style={{ display: 'none' }} />
                    </label>
                    {fotoErrors[i] && <p style={{ color: '#e53935', fontSize: '12px', margin: '4px 0 0' }}>⚠️ {fotoErrors[i]}</p>}
                    {s.fotos.length > 0 && !fotoErrors[i] && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {s.fotos.map((f, fi) => (
                          <span key={fi} style={{ fontSize: '11px', background: '#e8f9f1', color: '#065f46', padding: '3px 8px', borderRadius: '20px', border: '1px solid #d1fae5' }}>
                            ✓ {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Volumen estimado (m³) <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span></label>
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
                <button onClick={() => { if (Object.values(fotoErrors).some(e => e)) { setError('Corrige los errores en las fotos antes de continuar.'); return } setError(''); setStep(3) }} style={{ flex: 1, padding: '12px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
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
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Sectores</p>
                  {sectores.map((s, i) => (
                    <p key={i} style={{ fontSize: '14px', color: '#222', margin: '0 0 2px' }}>
                      {i + 1}. {s.nombre || `Sector ${i+1}`}
                      {s.volumen_estimado && ` — ${s.volumen_estimado} m³`}
                      {s.fotos.length > 0 && <span style={{ color: '#1dbf73' }}> · {s.fotos.length} foto{s.fotos.length !== 1 ? 's' : ''} ✓</span>}
                    </p>
                  ))}
                </div>
                <div style={{ marginBottom: '0.8rem' }}>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Fechas disponibles</p>
                  <p style={{ fontSize: '14px', color: '#222', margin: 0 }}>
                    {new Date(fechaInicio + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} → {new Date(fechaFin + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {necesitaCortes !== null && (
                  <div style={{ marginBottom: '0.8rem' }}>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Cortes adicionales</p>
                    <p style={{ fontSize: '14px', color: '#222', margin: 0 }}>{necesitaCortes ? 'Sí' : 'No'}</p>
                  </div>
                )}
                {accesoVehicular && (
                  <div style={{ marginBottom: '0.8rem' }}>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Acceso vehicular</p>
                    <p style={{ fontSize: '14px', color: '#222', margin: 0 }}>{accesoVehicular}</p>
                  </div>
                )}
                {comentarios && (
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px', fontWeight: '500', textTransform: 'uppercase' as const }}>Comentarios</p>
                    <p style={{ fontSize: '14px', color: '#555', margin: 0, lineHeight: '1.6' }}>{comentarios}</p>
                  </div>
                )}
              </div>

              {proveedorId && (
                <div style={{ background: '#f0fdf7', border: '1px solid #d1fae5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '13px', color: '#065f46', margin: 0 }}>✓ Esta cotización será enviada directamente al proveedor seleccionado</p>
                </div>
              )}

              {loading && uploadProgress > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '13px', color: '#1dbf73', margin: '0 0 6px' }}>Subiendo fotos... {uploadProgress}%</p>
                  <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#1dbf73', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}

              {error && <p style={{ color: '#e53935', fontSize: '13px', margin: '0 0 1rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '12px', background: loading ? '#a8e6c8' : '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? (uploadProgress > 0 ? `Subiendo fotos... ${uploadProgress}%` : 'Enviando...') : 'Publicar solicitud'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  )
}
