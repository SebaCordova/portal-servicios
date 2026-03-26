'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams } from 'next/navigation'

type Proveedor = {
  id: string
  bio: string
  price_per_hour: number | null
  rating_avg: number | null
  total_reviews: number
  profiles: {
    full_name: string
    avatar_url: string | null
    phone: string
  }
  provider_zones: { comuna: string }[]
  services: { title: string; categories: { slug: string } }[]
}

function getEmoji(slug: string) {
  const map: Record<string, string> = {
    paisajismo: '🌸', 'retiro-ramas': '✂️', 'retiro-escombros': '🗑️',
    gasfiteria: '🔧', riego: '💧', electricidad: '⚡', remodelaciones: '🔨'
  }
  return map[slug] ?? '🛠️'
}

export default function PerfilProveedorPublicoPage() {
  const params = useParams()
  const id = params.id as string

  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      const { data } = await supabase
        .from('provider_profiles')
        .select(`
          id, bio, price_per_hour, rating_avg, total_reviews,
          profiles ( full_name, avatar_url, phone ),
          provider_zones ( comuna ),
          services ( title, categories ( slug ) )
        `)
        .eq('id', id)
        .eq('verified', true)
        .single()

      setProveedor(data)
      setLoading(false)
    }
    loadData()
  }, [id])

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Cargando...</p>
      </main>
    )
  }

  if (!proveedor) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Proveedor no encontrado.</p>
      </main>
    )
  }

  const esCotizacion = proveedor.services.some(s => 
    s.categories?.slug === 'retiro-ramas' || s.categories?.slug === 'retiro-escombros'
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Card principal */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1dbf73', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
              {proveedor.profiles.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>{proveedor.profiles.full_name}</h1>
              {proveedor.rating_avg ? (
                <p style={{ fontSize: '14px', color: '#888', margin: '0 0 8px' }}>
                  ⭐ {proveedor.rating_avg.toFixed(1)} · {proveedor.total_reviews} reseña{proveedor.total_reviews !== 1 ? 's' : ''}
                </p>
              ) : (
                <p style={{ fontSize: '14px', color: '#aaa', margin: '0 0 8px' }}>Sin reseñas aún</p>
              )}
              <span style={{ fontSize: '12px', background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: '20px' }}>✓ Verificado</span>
            </div>
            {proveedor.price_per_hour && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px' }}>Desde</p>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#222', margin: 0 }}>${proveedor.price_per_hour.toLocaleString('es-CL')}</p>
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>por hora</p>
              </div>
            )}
          </div>

          {proveedor.bio && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#444', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sobre mí</h3>
              <p style={{ fontSize: '14px', color: '#555', margin: 0, lineHeight: '1.6' }}>{proveedor.bio}</p>
            </div>
          )}

          {/* Servicios */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#444', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicios</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {proveedor.services.map((s, i) => (
                <span key={i} style={{ fontSize: '13px', background: '#f0f0ff', color: '#3730a3', padding: '5px 12px', borderRadius: '20px', border: '1px solid #e0e0ff' }}>
                  {getEmoji(s.categories?.slug ?? '')} {s.title}
                </span>
              ))}
            </div>
          </div>

          {/* Comunas */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#444', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comunas de cobertura</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {proveedor.provider_zones.map(z => (
                <span key={z.comuna} style={{ fontSize: '12px', background: '#f0fdf7', color: '#065f46', padding: '4px 10px', borderRadius: '20px', border: '1px solid #d1fae5' }}>{z.comuna}</span>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {isLoggedIn ? (
              <>
                {esCotizacion && (
                  <a href={`/solicitar/${proveedor.services.find(s => s.categories?.slug === 'retiro-ramas' || s.categories?.slug === 'retiro-escombros')?.categories?.slug}?proveedor=${proveedor.id}`}
                    style={{ flex: 1, padding: '12px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>
                    Pedir cotización
                  </a>
                )}
                <a href={`/solicitar/general?proveedor=${proveedor.id}`}
                  style={{ flex: 1, padding: '12px', background: '#fff', color: '#1dbf73', border: '1.5px solid #1dbf73', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>
                  Conseguir cotizaciones
                </a>
              </>
            ) : (
              <a href="/login" style={{ flex: 1, padding: '12px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>
                Ingresar para cotizar
              </a>
            )}
          </div>
        </div>

        {/* Reseñas placeholder */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1rem' }}>Reseñas</h3>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ fontSize: '14px', color: '#aaa', margin: 0 }}>Este proveedor aún no tiene reseñas.</p>
          </div>
        </div>

      </div>
    </main>
  )
}
