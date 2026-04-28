'use client'

import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams } from 'next/navigation'

type Proveedor = {
  id: string
  bio: string
  price_per_hour: number | null
  rating_avg: number | null
  total_reviews: number
  profiles: { full_name: string } | null
  provider_zones: { comuna: string }[]
  services: { title: string; categories: { name: string; slug: string; emoji: string } | null }[]
}

function CategoriasContenido() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      const { data } = await supabase
        .from('provider_profiles')
        .select(`
          id, bio, price_per_hour, rating_avg, total_reviews,
          profiles ( full_name ),
          provider_zones ( comuna ),
          services ( title, categories ( name, slug, emoji ) )
        `)
        .eq('verified', true)
        .ilike('bio', `%${q}%`)

      setProveedores((data ?? []) as unknown as Proveedor[])
      setLoading(false)
    }
    if (q) buscar()
    else setLoading(false)
  }, [q])

  function getNombre(profiles: Proveedor['profiles']) {
    if (!profiles) return 'Profesional'
    if (Array.isArray(profiles)) return (profiles as any)[0]?.full_name ?? 'Profesional'
    return (profiles as { full_name: string }).full_name
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>
          Resultados para "{q}"
        </h1>
        <p style={{ fontSize: '14px', color: '#888', margin: '0 0 2rem' }}>
          Profesionales que ofrecen este servicio
        </p>

        {loading ? (
          <p style={{ color: '#888' }}>Buscando...</p>
        ) : proveedores.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', margin: '0 0 1rem' }}>🔍</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#222', margin: '0 0 6px' }}>
              No encontramos resultados para "{q}"
            </p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 1.5rem' }}>
              Intenta con otras palabras o revisa nuestras categorías disponibles.
            </p>
            <a href="/" style={{ display: 'inline-block', padding: '10px 20px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
              Ver todas las categorías
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {proveedores.map(p => {
              const nombre = getNombre(p.profiles)
              return (
                <a key={p.id} href={`/proveedor/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                        {nombre.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 2px' }}>{nombre}</p>
                        {p.rating_avg
                          ? <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>⭐ {p.rating_avg.toFixed(1)} · {p.total_reviews} reseña{p.total_reviews !== 1 ? 's' : ''}</p>
                          : <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Sin reseñas aún</p>
                        }
                      </div>
                    </div>
                    {p.bio && (
                      <p style={{ fontSize: '13px', color: '#555', margin: '0 0 1rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.bio}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '1rem' }}>
                      {p.provider_zones.slice(0, 3).map(z => (
                        <span key={z.comuna} style={{ fontSize: '11px', background: '#f0fdf7', color: '#065f46', padding: '2px 8px', borderRadius: '20px', border: '1px solid #d1fae5' }}>{z.comuna}</span>
                      ))}
                      {p.provider_zones.length > 3 && <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px' }}>+{p.provider_zones.length - 3} más</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {p.price_per_hour
                        ? <p style={{ fontSize: '13px', color: '#222', margin: 0 }}>Desde <strong>${p.price_per_hour.toLocaleString('es-CL')}/hr</strong></p>
                        : <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Precio a cotizar</p>
                      }
                      <span style={{ fontSize: '12px', color: '#1dbf73', fontWeight: '600' }}>Ver perfil →</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

export default function CategoriasPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}><p style={{ color: '#888' }}>Cargando...</p></main>}>
      <CategoriasContenido />
    </Suspense>
  )
}
