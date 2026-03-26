'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams } from 'next/navigation'

type Categoria = {
  id: string
  name: string
  slug: string
  icon: string
}

type Proveedor = {
  id: string
  bio: string
  price_per_hour: number | null
  rating_avg: number | null
  total_reviews: number
  profiles: {
    full_name: string
    avatar_url: string | null
  }
  provider_zones: { comuna: string }[]
}

function getEmoji(icon: string) {
  const map: Record<string, string> = {
    flower: '🌸', scissors: '✂️', trash: '🗑️',
    wrench: '🔧', droplets: '💧', zap: '⚡', hammer: '🔨'
  }
  return map[icon] ?? '🛠️'
}

export default function CategoriaPage() {
  const params = useParams()
  const slug = params.slug as string

  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [comunaFiltro, setComunaFiltro] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: cat } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .eq('slug', slug)
        .single()

      if (!cat) { setLoading(false); return }
      setCategoria(cat)

      const { data: provs } = await supabase
        .from('provider_profiles')
        .select(`
          id, bio, price_per_hour, rating_avg, total_reviews,
          profiles ( full_name, avatar_url ),
          provider_zones ( comuna )
        `)
        .eq('verified', true)
        .in('id', 
          (await supabase
            .from('services')
            .select('provider_id')
            .eq('category_id', cat.id)
            .eq('active', true)
          ).data?.map(s => s.provider_id) ?? []
        )

      setProveedores(provs ?? [])
      setLoading(false)
    }
    loadData()
  }, [slug])

  const proveedoresFiltrados = comunaFiltro
    ? proveedores.filter(p => p.provider_zones.some(z => z.comuna.toLowerCase().includes(comunaFiltro.toLowerCase())))
    : proveedores

  const esCotizacion = slug === 'retiro-ramas' || slug === 'retiro-escombros'

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Cargando...</p>
      </main>
    )
  }

  if (!categoria) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Categoría no encontrada.</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      {/* Hero */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '36px' }}>{getEmoji(categoria.icon)}</span>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#222', margin: 0 }}>{categoria.name}</h1>
          </div>
          <p style={{ fontSize: '15px', color: '#666', margin: '0 0 1.5rem', lineHeight: '1.6' }}>
            Encuentra profesionales verificados en tu comuna.
          </p>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={comunaFiltro}
              onChange={e => setComunaFiltro(e.target.value)}
              placeholder="Filtrar por comuna..."
              style={{ padding: '10px 16px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', fontFamily: 'inherit', minWidth: '220px' }}
            />
            {esCotizacion && (
              <a href={`/solicitar/${slug}`} style={{ padding: '10px 20px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                Conseguir cotizaciones
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Proveedores */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 1.5rem' }}>
          {proveedoresFiltrados.length} profesional{proveedoresFiltrados.length !== 1 ? 'es' : ''} disponible{proveedoresFiltrados.length !== 1 ? 's' : ''}
        </p>

        {proveedoresFiltrados.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '1rem' }}>🔍</div>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#222', margin: '0 0 6px' }}>No hay profesionales disponibles</p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
              {comunaFiltro ? `No encontramos profesionales en "${comunaFiltro}".` : 'Aún no hay profesionales en esta categoría.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {proveedoresFiltrados.map(p => (
              <a key={p.id} href={`/proveedor/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}>

                  {/* Avatar y nombre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {p.profiles.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 2px' }}>{p.profiles.full_name}</p>
                      {p.rating_avg ? (
                        <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>⭐ {p.rating_avg.toFixed(1)} · {p.total_reviews} reseña{p.total_reviews !== 1 ? 's' : ''}</p>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Sin reseñas aún</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {p.bio && (
                    <p style={{ fontSize: '13px', color: '#555', margin: '0 0 1rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.bio}
                    </p>
                  )}

                  {/* Comunas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '1rem' }}>
                    {p.provider_zones.slice(0, 3).map(z => (
                      <span key={z.comuna} style={{ fontSize: '11px', background: '#f0fdf7', color: '#065f46', padding: '2px 8px', borderRadius: '20px', border: '1px solid #d1fae5' }}>{z.comuna}</span>
                    ))}
                    {p.provider_zones.length > 3 && (
                      <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px' }}>+{p.provider_zones.length - 3} más</span>
                    )}
                  </div>

                  {/* Precio y CTA */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {p.price_per_hour ? (
                      <p style={{ fontSize: '13px', color: '#222', margin: 0 }}>
                        Desde <strong>${p.price_per_hour.toLocaleString('es-CL')}/hr</strong>
                      </p>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Precio a cotizar</p>
                    )}
                    <span style={{ fontSize: '12px', color: '#1dbf73', fontWeight: '600' }}>Ver perfil →</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
