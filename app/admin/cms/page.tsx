'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type CmsItem = {
  id: string
  clave: string
  valor: string | null
  tipo: string
  descripcion: string
}

const SECCIONES = [
  {
    titulo: 'Hero',
    claves: ['hero_titulo', 'hero_subtitulo', 'hero_cta', 'hero_imagen', 'hero_video']
  },
  {
    titulo: 'Cómo funciona',
    claves: ['como_funciona_titulo', 'paso1_titulo', 'paso1_descripcion', 'paso2_titulo', 'paso2_descripcion', 'paso3_titulo', 'paso3_descripcion']
  },
  {
    titulo: 'Banner proveedor',
    claves: ['banner_proveedor_titulo', 'banner_proveedor_subtitulo', 'banner_proveedor_cta']
  },
  {
    titulo: 'Testimonios',
    claves: ['testimonio_1_nombre', 'testimonio_1_texto', 'testimonio_2_nombre', 'testimonio_2_texto', 'testimonio_3_nombre', 'testimonio_3_texto']
  },
  {
    titulo: 'Contenido / Blog',
    claves: ['contenido_1_titulo', 'contenido_1_descripcion', 'contenido_1_link', 'contenido_2_titulo', 'contenido_2_descripcion', 'contenido_2_link', 'contenido_3_titulo', 'contenido_3_descripcion', 'contenido_3_link']
  },
  {
    titulo: 'Footer',
    claves: ['footer_texto']
  }
]

export default function CmsPage() {
  const [items, setItems] = useState<CmsItem[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('cms_home').select('*').order('clave')
      setItems(data ?? [])
      const vals: Record<string, string> = {}
      for (const item of data ?? []) {
        vals[item.clave] = item.valor ?? ''
      }
      setValores(vals)
      setLoading(false)
    }
    loadData()
  }, [])

  async function handleSave() {
    setSaving(true)
    for (const [clave, valor] of Object.entries(valores)) {
      await supabase.from('cms_home').update({ valor: valor || null, updated_at: new Date().toISOString() }).eq('clave', clave)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function getItem(clave: string) {
    return items.find(i => i.clave === clave)
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #ddd',
    borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'inherit'
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}><p style={{ color: '#888' }}>Cargando...</p></div>
  }

  return (
    <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>Home / CMS</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>Edita el contenido del sitio sin tocar código</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/" target="_blank" style={{ fontSize: '13px', color: '#1dbf73', textDecoration: 'none', fontWeight: '500' }}>
            Ver home →
          </a>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 20px', background: saved ? '#e8f9f1' : saving ? '#a8e6c8' : '#1dbf73', color: saved ? '#065f46' : '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {SECCIONES.map(seccion => (
          <div key={seccion.titulo} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', background: '#f9f9f9' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: 0 }}>{seccion.titulo}</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {seccion.claves.map(clave => {
                const item = getItem(clave)
                if (!item) return null
                const esTipo = item.tipo
                return (
                  <div key={clave}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {item.descripcion}
                    </label>
                    {esTipo === 'texto' && clave.includes('descripcion') ? (
                      <textarea value={valores[clave] ?? ''} onChange={e => setValores(prev => ({ ...prev, [clave]: e.target.value }))}
                        rows={2} placeholder={`Ingresa ${item.descripcion.toLowerCase()}...`}
                        style={{ ...inputStyle, resize: 'vertical' }} />
                    ) : esTipo === 'imagen' || esTipo === 'video' ? (
                      <div>
                        <input type="text" value={valores[clave] ?? ''} onChange={e => setValores(prev => ({ ...prev, [clave]: e.target.value }))}
                          placeholder={`URL de ${esTipo === 'imagen' ? 'la imagen' : 'el video'}...`}
                          style={inputStyle} />
                        <p style={{ fontSize: '11px', color: '#aaa', margin: '4px 0 0' }}>
                          Ingresa la URL. Las subidas de archivos estarán disponibles próximamente con Supabase Storage.
                        </p>
                      </div>
                    ) : (
                      <input type="text" value={valores[clave] ?? ''} onChange={e => setValores(prev => ({ ...prev, [clave]: e.target.value }))}
                        placeholder={`Ingresa ${item.descripcion.toLowerCase()}...`}
                        style={inputStyle} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '12px 24px', background: saved ? '#e8f9f1' : saving ? '#a8e6c8' : '#1dbf73', color: saved ? '#065f46' : '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
