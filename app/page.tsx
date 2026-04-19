'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type CmsData = Record<string, string | null>
type Categoria = { id: string; name: string; slug: string; emoji: string }
type Proveedor = {
  id: string
  rating_avg: number | null
  total_reviews: number
  profiles: { full_name: string } | { full_name: string }[] | null
  services: { title: string }[] | null
}

function getNombre(profiles: Proveedor['profiles']): string {
  if (!profiles) return 'Profesional'
  if (Array.isArray(profiles)) return profiles[0]?.full_name ?? 'Profesional'
  return (profiles as { full_name: string }).full_name ?? 'Profesional'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function HomePage() {
  const [cms, setCms] = useState<CmsData>({})
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [sinResultados, setSinResultados] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      try {
        const [cmsRes, catsRes, provsRes] = await Promise.all([
          supabase.from('cms_home').select('clave, valor'),
          supabase.from('categories').select('id, name, slug, emoji').eq('activa', true).order('name'),
          supabase.from('provider_profiles').select(`
            id, rating_avg, total_reviews,
            profiles ( full_name ),
            services ( title )
          `).eq('verified', true).not('rating_avg', 'is', null).order('rating_avg', { ascending: false }).limit(4)
        ])
        const cmsMap: CmsData = {}
        for (const item of cmsRes.data ?? []) cmsMap[item.clave] = item.valor
        setCms(cmsMap)
        setCategorias(catsRes.data ?? [])
        setProveedores((provsRes.data ?? []) as unknown as Proveedor[])
      } catch (e) {
        console.error('Error cargando datos:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  function handleBusqueda(e: React.FormEvent) {
    e.preventDefault()
    const texto = busqueda.trim().toLowerCase()
    setSinResultados(false)
    if (!texto) return
    // Buscar en categorías primero
    const exacta = categorias.find(c => c.name.toLowerCase().startsWith(texto))
    if (exacta) { window.location.href = `/categorias/${exacta.slug}`; return }
    const parcial = categorias.find(c => c.name.toLowerCase().includes(texto))
    if (parcial) { window.location.href = `/categorias/${parcial.slug}`; return }
    // Si no hay categoría, redirigir a cuenta/negocio para que el proveedor actualice su perfil
    // o buscar directamente en la URL con el término
    window.location.href = `/categorias?q=${encodeURIComponent(busqueda.trim())}`
  }

  const tieneContenido = [1,2,3].some(i => cms[`contenido_${i}_titulo`])

  if (loading) return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <section style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '1rem' }} />
          <div style={{ height: '24px', background: 'rgba(255,255,255,0.07)', borderRadius: '8px', marginBottom: '2.5rem' }} />
        </div>
      </section>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      <section style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: '5rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#fff', margin: '0 0 1rem', lineHeight: '1.2', letterSpacing: '-1px' }}>
            {cms['hero_titulo'] ?? 'Servicios profesionales a domicilio'}
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', margin: '0 0 2.5rem', lineHeight: '1.5' }}>
            {cms['hero_subtitulo'] ?? 'Encuentra profesionales verificados cerca de ti'}
          </p>
          <form onSubmit={handleBusqueda} style={{ display: 'flex', maxWidth: '560px', margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="¿Qué servicio necesitas?"
              style={{ flex: 1, padding: '16px 20px', border: 'none', fontSize: '15px', color: '#222', outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
            <button type="submit" style={{ padding: '16px 24px', background: '#1dbf73', color: '#fff', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              {cms['hero_cta'] ?? 'Buscar'}
            </button>
          </form>
          {sinResultados && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '12px' }}>No encontramos esa categoría. Prueba con alguno de los servicios listados abajo.</p>}
        </div>
      </section>

      <section style={{ padding: '4rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem', textAlign: 'center' }}>Servicios disponibles</h2>
          <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', margin: '0 0 2.5rem' }}>Profesionales verificados para cada necesidad</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {categorias.map(cat => (
              <a key={cat.id} href={`/categorias/${cat.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: '1px solid #e0e0e0', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf7'; e.currentTarget.style.borderColor = '#1dbf73' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f9f9f9'; e.currentTarget.style.borderColor = '#e0e0e0' }}>
                  <div style={{ fontSize: '36px', marginBottom: '0.8rem' }}>{cat.emoji ?? '🛠️'}</div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#222', margin: 0 }}>{cat.name}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '4rem 2rem', background: '#f5f5f5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#222', margin: '0 0 3rem', textAlign: 'center' }}>
            {cms['como_funciona_titulo'] ?? '¿Cómo funciona?'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {[1,2,3].map(paso => (
              <div key={paso} style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1dbf73', color: '#fff', fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>{paso}</div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 8px' }}>
                  {cms[`paso${paso}_titulo`] ?? ['Publica tu solicitud', 'Recibe propuestas', 'Elige y contrata'][paso-1]}
                </h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.5' }}>
                  {cms[`paso${paso}_descripcion`] ?? ['Cuéntanos qué necesitas y dónde', 'Profesionales verificados te envían sus cotizaciones', 'Selecciona la propuesta que más te acomode'][paso-1]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {proveedores.length > 0 && (
        <section style={{ padding: '4rem 2rem', background: '#fff' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem', textAlign: 'center' }}>Profesionales destacados</h2>
            <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', margin: '0 0 2.5rem' }}>Los mejor evaluados por nuestros clientes</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {proveedores.map(p => {
                const nombre = getNombre(p.profiles)
                const servicio = Array.isArray(p.services) ? p.services[0]?.title : null
                return (
                  <a key={p.id} href={`/proveedor/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e0e0e0', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 1rem' }}>
                        {getInitials(nombre)}
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#222', margin: '0 0 4px' }}>{nombre}</p>
                      <p style={{ fontSize: '12px', color: '#888', margin: '0 0 8px' }}>
                        ⭐ {p.rating_avg?.toFixed(1)} · {p.total_reviews} reseña{p.total_reviews !== 1 ? 's' : ''}
                      </p>
                      {servicio && <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>{servicio}</p>}
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: '4rem 2rem', background: '#1dbf73' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', margin: '0 0 1rem' }}>¿Eres profesional? Ofrece tus servicios</h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', margin: '0 0 2rem', lineHeight: '1.5' }}>
            Únete a {cms['nombre_plataforma'] ?? 'ServiChile'} y conecta con clientes que necesitan tu expertise
          </p>
          <a href="/registro-proveedor" style={{ display: 'inline-block', padding: '14px 32px', background: '#fff', color: '#1dbf73', borderRadius: '8px', textDecoration: 'none', fontSize: '16px', fontWeight: '700' }}>
            Comenzar ahora →
          </a>
        </div>
      </section>

      {tieneContenido && (
        <section style={{ padding: '4rem 2rem', background: '#f5f5f5' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#222', margin: '0 0 2rem', textAlign: 'center' }}>Recursos y consejos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {[1,2,3].map(i => {
                const titulo = cms[`contenido_${i}_titulo`]
                const descripcion = cms[`contenido_${i}_descripcion`]
                const link = cms[`contenido_${i}_link`]
                if (!titulo) return null
                return (
                  <a key={i} href={link ?? '#'} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                      {cms[`contenido_${i}_imagen`] && <img src={cms[`contenido_${i}_imagen`]!} alt={titulo} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />}
                      <div style={{ padding: '1.2rem' }}>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 6px' }}>{titulo}</p>
                        {descripcion && <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: '1.4' }}>{descripcion}</p>}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <footer style={{ background: '#1a1a2e', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {cms['footer_texto'] ?? 'ServiChile — Servicios profesionales a domicilio'}
        </p>
      </footer>

    </div>
  )
}
