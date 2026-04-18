'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { COMUNAS_RM } from '@/lib/constants'
import { useCategorias } from '@/lib/hooks/useCategorias'
import { validarRut, formatearRut } from '@/lib/utils/validators'

const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', border:'1.5px solid #ddd', borderRadius:'8px', fontSize:'14px', color:'#222', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#fff' }
const lbl: React.CSSProperties = { display:'block', fontSize:'13px', fontWeight:'500', color:'#444', marginBottom:'6px' }

export default function RegistroProveedorPage() {
  const [sent, setSent]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [rut, setRut]             = useState('')
  const [rutError, setRutError]   = useState('')
  const [comuna, setComuna]       = useState('')
  const [cats, setCats]           = useState<string[]>([])
  const [bio, setBio]             = useState('')
  const { categorias }            = useCategorias()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  function handleRut(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; setRut(v)
    if (v.length > 3) { const ok = validarRut(v); setRutError(ok ? '' : 'RUT inválido'); if (ok) setRut(formatearRut(v)) }
    else setRutError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName||!lastName||!email||!phone||!rut||!comuna||cats.length===0) { setError('Completa todos los campos obligatorios.'); return }
    if (!validarRut(rut)) { setError('RUT inválido.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000'}/auth/callback`,
      data: { full_name:`${firstName.trim()} ${lastName.trim()}`, first_name:firstName.trim(), last_name:lastName.trim(), phone, rut:formatearRut(rut), comuna, is_provider_applicant:true, categorias:JSON.stringify(cats), bio }
    }})
    if (err) { setError('No pudimos enviar el link. Intenta nuevamente.'); setLoading(false); return }
    setSent(true); setLoading(false)
  }

  if (sent) return (
    <main style={{minHeight:'100vh',background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
      <div style={{background:'#fff',borderRadius:'12px',border:'1px solid #e0e0e0',padding:'3rem',maxWidth:'420px',width:'100%',textAlign:'center',margin:'1rem'}}>
        <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'#e8f9f1',margin:'0 auto 1.2rem',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#1dbf73" strokeWidth="1.8"/><path d="M2 8l10 6 10-6" stroke="#1dbf73" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <h2 style={{fontSize:'18px',fontWeight:'700',color:'#222',margin:'0 0 0.8rem'}}>Revisa tu email</h2>
        <p style={{color:'#666',fontSize:'14px',lineHeight:'1.6',margin:'0 0 0.5rem'}}>Enviamos un link a</p>
        <p style={{color:'#222',fontWeight:'600',fontSize:'15px',margin:'0 0 1rem'}}>{email}</p>
        <p style={{color:'#aaa',fontSize:'13px',lineHeight:'1.6',margin:'0 0 1.5rem'}}>Al hacer clic completarás tu registro y podrás ingresar los datos de tu negocio.</p>
        <button onClick={()=>setSent(false)} style={{background:'none',border:'none',color:'#1dbf73',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>← Volver</button>
      </div>
    </main>
  )

  return (
    <main style={{minHeight:'100vh',background:'#f5f5f5',fontFamily:"'Helvetica Neue',Arial,sans-serif",padding:'2rem 1.5rem'}}>
      <div style={{maxWidth:'560px',margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <a href="/" style={{textDecoration:'none'}}><span style={{fontSize:'22px',fontWeight:'800',color:'#222'}}>Servi<span style={{color:'#1dbf73'}}>Chile</span></span></a>
          <p style={{color:'#888',fontSize:'13px',margin:'6px 0 0'}}>Registro de proveedor de servicios</p>
        </div>
        <div style={{background:'#fff',borderRadius:'12px',border:'1px solid #e0e0e0',padding:'2rem',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <h2 style={{fontSize:'18px',fontWeight:'700',color:'#222',margin:'0 0 4px'}}>Ofrece tus servicios</h2>
          <p style={{fontSize:'13px',color:'#888',margin:'0 0 1.5rem'}}>Completa el formulario y recibirás un email para verificar tu cuenta.</p>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1rem'}}>
              <div><label style={lbl}>Nombre <span style={{color:'#e53935'}}>*</span></label><input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Tu nombre" required style={inp}/></div>
              <div><label style={lbl}>Apellido <span style={{color:'#e53935'}}>*</span></label><input type="text" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Tu apellido" required style={inp}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1rem'}}>
              <div><label style={lbl}>Email <span style={{color:'#e53935'}}>*</span></label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required style={inp}/></div>
              <div><label style={lbl}>Teléfono <span style={{color:'#e53935'}}>*</span></label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+56 9 1234 5678" required style={inp}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1rem'}}>
              <div>
                <label style={lbl}>RUT <span style={{color:'#e53935'}}>*</span></label>
                <input type="text" value={rut} onChange={handleRut} placeholder="12.345.678-9" required style={{...inp,borderColor:rutError?'#e53935':'#ddd'}}/>
                {rutError&&<p style={{color:'#e53935',fontSize:'12px',margin:'4px 0 0'}}>{rutError}</p>}
              </div>
              <div><label style={lbl}>Comuna <span style={{color:'#e53935'}}>*</span></label>
                <select value={comuna} onChange={e=>setComuna(e.target.value)} required style={{...inp,cursor:'pointer'}}>
                  <option value="">Selecciona...</option>
                  {COMUNAS_RM.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:'1rem'}}>
              <label style={lbl}>Servicios que ofreces <span style={{color:'#e53935'}}>*</span></label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                {categorias.map(cat=>(
                  <label key={cat.id} style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',padding:'9px 12px',border:`1.5px solid ${cats.includes(cat.id)?'#1dbf73':'#ddd'}`,borderRadius:'8px',background:cats.includes(cat.id)?'#f0fdf7':'#fff',fontSize:'13px',color:'#222'}}>
                    <input type="checkbox" checked={cats.includes(cat.id)} onChange={()=>setCats(p=>p.includes(cat.id)?p.filter(c=>c!==cat.id):[...p,cat.id])} style={{accentColor:'#1dbf73',flexShrink:0}}/>
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{marginBottom:'1.5rem'}}>
              <label style={lbl}>Experiencia y comentarios <span style={{color:'#aaa',fontWeight:'400'}}>(opcional)</span></label>
              <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Años de experiencia, especialidades, certificaciones..." rows={3} style={{...inp,resize:'vertical'}}/>
            </div>
            {error&&<p style={{color:'#e53935',fontSize:'13px',margin:'0 0 1rem'}}>{error}</p>}
            <button type="submit" disabled={loading} style={{width:'100%',padding:'13px',background:loading?'#a8e6c8':'#1dbf73',color:'#fff',border:'none',borderRadius:'8px',fontSize:'15px',fontWeight:'700',cursor:loading?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {loading?'Enviando...':'Registrarme y ofrecer mis servicios →'}
            </button>
            <p style={{textAlign:'center',fontSize:'13px',color:'#aaa',margin:'1rem 0 0'}}>
              ¿Ya tienes cuenta?{' '}<a href="/login" style={{color:'#1dbf73',textDecoration:'none',fontWeight:'500'}}>Ingresa aquí</a>
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
