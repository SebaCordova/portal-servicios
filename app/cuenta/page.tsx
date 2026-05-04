'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { COMUNAS_RM } from '@/lib/constants'
import { useCategorias } from '@/lib/hooks/useCategorias'
import { validarRut, formatearRut } from '@/lib/utils/validators'

const PENDING_REGISTRATION_KEY = 'serviChile_pending_provider_registration'

type Tab    = 'personal' | 'negocio'
type Estado = 'pendiente' | 'aprobado' | 'nuevo'

export default function CuentaPage() {
  return (
    <Suspense fallback={<main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f5f5"}}><p style={{color:"#888",fontFamily:"sans-serif"}}>Cargando...</p></main>}>
      <CuentaPageInner />
    </Suspense>
  )
}

function CuentaPageInner() {
  const searchParams = useSearchParams()
  const [tab, setTab]             = useState<Tab>('negocio')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState('')
  const [profileId, setProfileId] = useState('')
  const [providerProfileId, setProviderProfileId] = useState<string|null>(null)
  const [estado, setEstado]       = useState<Estado>('nuevo')
  const { categorias: listaCategorias } = useCategorias()

  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [rut, setRut]             = useState('')
  const [rutError, setRutError]   = useState('')
  const [comuna, setComuna]       = useState('')
  const [bio, setBio]             = useState('')
  const [price, setPrice]         = useState('')
  const [cats, setCats]           = useState<string[]>([])
  const [comunas, setComunas]     = useState<string[]>([])

  const supabase = getSupabaseBrowserClient()

  // Paso 2 del registro de proveedor:
  // Si llegamos con ?complete_registration=1, leer sessionStorage y hacer POST autenticado
  useEffect(() => {
    if (searchParams.get('complete_registration') !== '1') return

    async function completeRegistration() {
      setCompleting(true)
      setCompleteError('')

      let pendingData: Record<string, unknown> | null = null
      try {
        const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY)
        if (raw) pendingData = JSON.parse(raw)
      } catch {
        // sessionStorage no disponible
      }

      if (!pendingData) {
        // No hay datos pendientes — redirigir al formulario
        window.location.href = '/registro-proveedor'
        return
      }

      const res = await fetch('/api/providers/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingData),
      })

      if (res.ok) {
        sessionStorage.removeItem(PENDING_REGISTRATION_KEY)
        // Recargar sin el query param para mostrar la página de cuenta normal
        window.location.href = '/cuenta?registered=1'
      } else {
        const body = await res.json().catch(() => ({}))
        setCompleteError(body.error ?? 'Error al completar el registro.')
        setCompleting(false)
      }
    }

    completeRegistration()
  }, [searchParams])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email ?? '')

      // Cargar datos desde DB — nunca desde user_metadata
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, phone, is_provider')
        .eq('auth_user_id', user.id)
        .single()

      if (profile) {
        setProfileId(profile.id)
        if (profile.full_name && profile.full_name !== 'Sin nombre') setFullName(profile.full_name)
        if (profile.phone) setPhone(profile.phone)

        const { data: pp } = await supabase
          .from('provider_profiles')
          .select('id, rut, bio, price_per_hour, verified')
          .eq('profile_id', profile.id)
          .maybeSingle()

        if (pp) {
          setProviderProfileId(pp.id)
          setRut(pp.rut ?? '')
          setBio(pp.bio ?? '')
          setPrice(pp.price_per_hour?.toString() ?? '')
          setEstado(pp.verified ? 'aprobado' : 'pendiente')

          const { data: svcsRaw } = await supabase.from('services').select('category_id').eq('provider_id', pp.id)
          const svcs = svcsRaw as {category_id: string}[] | null
          setCats((svcs ?? []).map(s => s.category_id))

          const { data: zonesRaw } = await supabase.from('provider_zones').select('comuna').eq('provider_id', pp.id)
          const zones = zonesRaw as {comuna: string}[] | null
          setComunas((zones ?? []).map(z => z.comuna))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleRut(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; setRut(v)
    if (v.length>3) { const ok=validarRut(v); setRutError(ok?'':'RUT inválido'); if(ok) setRut(formatearRut(v)) } else setRutError('')
  }

  async function savePersonal() {
    setSaving(true)
    await supabase.from('profiles').update({ full_name:fullName, phone }).eq('id',profileId)
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  async function saveNegocio() {
    setSaving(true)
    let ppId = providerProfileId
    if (!ppId) {
      const { data: pp } = await supabase.from('provider_profiles')
        .insert({ profile_id:profileId, rut, bio, price_per_hour:price?parseInt(price):null, verified:false })
        .select('id').single()
      if (!pp) { setSaving(false); return }
      ppId = pp.id; setProviderProfileId(ppId); setEstado('pendiente')
      await supabase.from('profiles').update({ is_provider:false }).eq('id',profileId)
      await fetch('/api/notifications/solicitud-proveedor', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ nombre:fullName }) })
    } else {
      await supabase.from('provider_profiles').update({ bio, price_per_hour:price?parseInt(price):null }).eq('id',ppId)
    }
    await supabase.from('services').delete().eq('provider_id',ppId)
    if (cats.length>0) await supabase.from('services').insert(cats.map(category_id=>({ provider_id:ppId, category_id, title:listaCategorias.find(c=>c.id===category_id)?.name??'', active:false })))
    await supabase.from('provider_zones').delete().eq('provider_id',ppId)
    if (comunas.length>0) await supabase.from('provider_zones').insert(comunas.map(c=>({ provider_id:ppId, comuna:c, region:'Región Metropolitana' })))
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', border:'1.5px solid #ddd', borderRadius:'8px', fontSize:'14px', color:'#222', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const lbl: React.CSSProperties = { display:'block', fontSize:'13px', fontWeight:'500', color:'#444', marginBottom:'6px' }
  const btnPrimary = (disabled=false): React.CSSProperties => ({ width:'100%', padding:'12px', background:saved?'#e8f9f1':disabled?'#a8e6c8':'#1dbf73', color:saved?'#065f46':'#fff', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit' })

  // Pantalla de carga durante el paso 2 del registro
  if (completing) return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f5',fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
      <div style={{textAlign:'center'}}>
        <p style={{color:'#666',fontSize:'14px',marginBottom:'8px'}}>Completando tu registro…</p>
        <p style={{color:'#aaa',fontSize:'13px'}}>Esto solo toma unos segundos.</p>
        {completeError && (
          <div style={{marginTop:'1rem'}}>
            <p style={{color:'#e53935',fontSize:'13px',marginBottom:'8px'}}>{completeError}</p>
            <a href="/registro-proveedor" style={{color:'#1dbf73',fontSize:'13px'}}>← Volver al formulario</a>
          </div>
        )}
      </div>
    </main>
  )

  if (loading) return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f5',fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
      <p style={{color:'#888'}}>Cargando...</p>
    </main>
  )

  return (
    <main style={{minHeight:'100vh',background:'#f5f5f5',fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
      <div style={{background:'#fff',borderBottom:'1px solid #e0e0e0',padding:'1rem 2rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{textDecoration:'none'}}><span style={{fontSize:'18px',fontWeight:'800',color:'#222'}}>Servi<span style={{color:'#1dbf73'}}>Chile</span></span></a>
        <a href="/" style={{fontSize:'13px',color:'#888',textDecoration:'none'}}>← Volver al inicio</a>
      </div>
      <div style={{maxWidth:'640px',margin:'0 auto',padding:'2rem 1.5rem'}}>
        <h1 style={{fontSize:'20px',fontWeight:'800',color:'#222',margin:'0 0 1.5rem'}}>Mi cuenta</h1>
        {searchParams.get('registered')==='1' && (
          <div style={{background:'#d1fae5',border:'1px solid #6ee7b7',borderRadius:'10px',padding:'1rem 1.5rem',marginBottom:'1.5rem',display:'flex',gap:'12px',alignItems:'center'}}>
            <span style={{fontSize:'20px'}}>🎉</span>
            <p style={{fontSize:'14px',fontWeight:'600',color:'#065f46',margin:0}}>¡Registro completado! Tu perfil está en revisión. Te notificaremos cuando sea aprobado.</p>
          </div>
        )}
        {estado==='pendiente' && (
          <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:'10px',padding:'1rem 1.5rem',marginBottom:'1.5rem',display:'flex',gap:'12px',alignItems:'flex-start'}}>
            <span style={{fontSize:'20px'}}>⏳</span>
            <div>
              <p style={{fontSize:'14px',fontWeight:'600',color:'#92400e',margin:'0 0 4px'}}>Solicitud en revisión</p>
              <p style={{fontSize:'13px',color:'#92400e',margin:0}}>Tu perfil está siendo revisado por nuestro equipo. Te notificaremos por email (1-2 días hábiles).</p>
            </div>
          </div>
        )}
        {estado==='aprobado' && (
          <div style={{background:'#d1fae5',border:'1px solid #6ee7b7',borderRadius:'10px',padding:'1rem 1.5rem',marginBottom:'1.5rem',display:'flex',gap:'12px',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
              <span style={{fontSize:'20px'}}>✅</span>
              <p style={{fontSize:'14px',fontWeight:'600',color:'#065f46',margin:0}}>Proveedor aprobado — puedes recibir solicitudes</p>
            </div>
            <a href="/proveedor" style={{fontSize:'13px',fontWeight:'600',color:'#065f46',background:'#6ee7b7',padding:'6px 14px',borderRadius:'6px',textDecoration:'none',whiteSpace:'nowrap'}}>Ir al portal →</a>
          </div>
        )}
        <div style={{display:'flex',borderBottom:'2px solid #f0f0f0',marginBottom:'2rem'}}>
          {(['personal','negocio'] as Tab[]).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 20px',background:'none',border:'none',borderBottom:tab===t?'2px solid #1dbf73':'2px solid transparent',marginBottom:'-2px',fontSize:'14px',fontWeight:tab===t?'600':'400',color:tab===t?'#1dbf73':'#888',cursor:'pointer',fontFamily:'inherit'}}>
              {t==='personal'?'Datos personales':'Mi negocio'}
            </button>
          ))}
        </div>
        <div style={{background:'#fff',borderRadius:'12px',border:'1px solid #e0e0e0',padding:'2rem',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          {tab==='personal' && (
            <>
              <div style={{marginBottom:'1rem'}}>
                <label style={lbl}>Correo electrónico <span style={{fontSize:'11px',color:'#1dbf73'}}>✓ verificado</span></label>
                <input type="email" value={email} readOnly style={{...inp,color:'#888',background:'#f9f9f9',cursor:'not-allowed',border:'1.5px solid #e0e0e0'}}/>
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={lbl}>Nombre completo</label>
                <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Tu nombre completo" style={inp}/>
              </div>
              <div style={{marginBottom:'1.5rem'}}>
                <label style={lbl}>Teléfono</label>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+56 9 1234 5678" style={inp}/>
              </div>
              <button onClick={savePersonal} disabled={saving} style={btnPrimary(saving)}>
                {saved?'✓ Guardado':saving?'Guardando...':'Guardar cambios'}
              </button>
            </>
          )}
          {tab==='negocio' && (
            <>
              {!providerProfileId && (
                <div style={{background:'#f0fdf7',border:'1px solid #d1fae5',borderRadius:'8px',padding:'12px 16px',marginBottom:'1.5rem'}}>
                  <p style={{fontSize:'13px',color:'#065f46',margin:0}}>Completa los datos y haz clic en <strong>Enviar solicitud</strong>. Nuestro equipo la revisará y te notificará.</p>
                </div>
              )}
              <div style={{marginBottom:'1rem'}}>
                <label style={lbl}>RUT</label>
                <input type="text" value={rut} onChange={handleRut} placeholder="12.345.678-9" style={{...inp,borderColor:rutError?'#e53935':'#ddd'}}/>
                {rutError&&<p style={{color:'#e53935',fontSize:'12px',margin:'4px 0 0'}}>{rutError}</p>}
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={lbl}>Descripción / experiencia</label>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Años de experiencia, especialidades..." rows={3} style={{...inp,resize:'vertical'}}/>
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={lbl}>Precio referencial por hora (CLP)</label>
                <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="15000" style={inp}/>
              </div>
              <div style={{marginBottom:'1rem'}}>
                <label style={lbl}>Servicios que ofreces</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {listaCategorias.map(cat=>(
                    <label key={cat.id} style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',padding:'9px 12px',border:`1.5px solid ${cats.includes(cat.id)?'#1dbf73':'#ddd'}`,borderRadius:'8px',background:cats.includes(cat.id)?'#f0fdf7':'#fff',fontSize:'13px',color:'#222'}}>
                      <input type="checkbox" checked={cats.includes(cat.id)} onChange={()=>setCats(p=>p.includes(cat.id)?p.filter(c=>c!==cat.id):[...p,cat.id])} style={{accentColor:'#1dbf73',flexShrink:0}}/>
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:'1.5rem'}}>
                <label style={lbl}>Comunas donde trabajas</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',maxHeight:'280px',overflowY:'auto',padding:'4px'}}>
                  {COMUNAS_RM.map(c=>(
                    <label key={c} style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',padding:'8px 10px',border:`1.5px solid ${comunas.includes(c)?'#1dbf73':'#ddd'}`,borderRadius:'8px',background:comunas.includes(c)?'#f0fdf7':'#fff',fontSize:'13px',color:'#222'}}>
                      <input type="checkbox" checked={comunas.includes(c)} onChange={()=>setComunas(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])} style={{accentColor:'#1dbf73',flexShrink:0}}/>
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={saveNegocio} disabled={saving} style={btnPrimary(saving)}>
                {saved?'✓ Guardado':saving?'Guardando...':providerProfileId?'Guardar cambios':'Enviar solicitud →'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
