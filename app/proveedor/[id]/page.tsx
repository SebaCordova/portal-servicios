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
    id: string
  }
  provider_zones: { comuna: string }[]
  services: { title: string; categories: { slug: string } }[]
}

type Review = {
  id: string
  rating_calidad: number
  comment: string
  created_at: string
  profiles: { full_name: string }
}

function getEmoji(slug: string) {
  const map: Record<string, string> = {
    paisajismo: '🌸', 'retiro-ramas': '✂️', 'retiro-escombros': '🗑️',
    gasfiteria: '🔧', riego: '💧', electricidad: '⚡', remodelaciones: '🔨'
  }
  return map[slug] ?? '🛠️'
}

function Estrellas({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= rating ? '#1dbf73' : '#e0e0e0', fontSize: `${size}px` }}>★</span>
      ))}
    </span>
  )
}

function getRatingLabel(rating: number) {
  if (rating >= 4.8) return 'Excelente'
  if (rating >= 4.0) return 'Muy bueno'
  if (rating >= 3.0) return 'Bueno'
  return 'Regular'
}

export default function PerfilProveedorPublicoPage() {
  const params = useParams()
  const id = params.id as string

  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
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
          profiles ( id, full_name, avatar_url, phone ),
          provider_zones ( comuna ),
          services ( title, categories ( slug ) )
        `)
        .eq('id', id)
        .eq('verified', true)
        .single()

      setProveedor(data)

      if (data) {
        const { data: revs } = await supabase
          .from('reviews')
          .select('id, rating_calidad, comment, created_at, profiles!reviewer_id ( full_name )')
          .eq('reviewee_id', data.profiles.id)
          .order('created_at', { ascending: false })
        setReviews(revs ?? [])
      }

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

  const slugCotizacion = proveedor.services.find(s =>
    s.categories?.slug === 'retiro-ramas' || s.categories?.slug === 'retiro-escombros'
  )?.categories?.slug

  // Distribución de ratings
  const distribucion = [5,4,3,2,1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating_calidad === stars).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating_calidad === stars).length / reviews.length) * 100) : 0
  }))

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
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 6px' }}>{proveedor.profiles.full_name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Estrellas rating={proveedor.rating_avg ? Math.round(proveedor.rating_avg) : 0} size={18} />
                {proveedor.rating_avg ? (
                  <span style={{ fontSize: '14px', color: '#666' }}>{proveedor.rating_avg.toFixed(1)} · {proveedor.total_reviews} reseña{proveedor.total_reviews !== 1 ? 's' : ''}</span>
                ) : (
                  <span style={{ fontSize: '13px', color: '#aaa' }}>Sin reseñas aún</span>
                )}
              </div>
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
              <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#888', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sobre mí</h3>
              <p style={{ fontSize: '14px', color: '#555', margin: 0, lineHeight: '1.6' }}>{proveedor.bio}</p>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#888', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicios</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {proveedor.services.map((s, i) => (
                <span key={i} style={{ fontSize: '13px', background: '#f0f0ff', color: '#3730a3', padding: '5px 12px', borderRadius: '20px', border: '1px solid #e0e0ff' }}>
                  {getEmoji(s.categories?.slug ?? '')} {s.title}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#888', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comunas de cobertura</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {proveedor.provider_zones.map(z => (
                <span key={z.comuna} style={{ fontSize: '12px', background: '#f0fdf7', color: '#065f46', padding: '4px 10px', borderRadius: '20px', border: '1px solid #d1fae5' }}>{z.comuna}</span>
              ))}
            </div>
          </div>

          {/* CTA */}
          {isLoggedIn ? (
            <a href={`/solicitar/${slugCotizacion ?? 'general'}?proveedor=${proveedor.id}`}
              style={{ display: 'block', padding: '13px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>
              Pedir cotización
            </a>
          ) : (
            <a href="/login"
              style={{ display: 'block', padding: '13px', background: '#1dbf73', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', textAlign: 'center' }}>
              Ingresar para cotizar
            </a>
          )}
        </div>

        {/* Reseñas */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#222', margin: '0 0 0.5rem' }}>Reseñas</h2>

          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Estrellas rating={0} size={28} />
              <p style={{ fontSize: '15px', color: '#888', margin: '1rem 0 0' }}>Este profesional aún no tiene reseñas.</p>
            </div>
          ) : (
            <>
              {/* Resumen */}
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#1dbf73', margin: '0 0 4px' }}>
                    {getRatingLabel(proveedor.rating_avg ?? 0)} {proveedor.rating_avg?.toFixed(1)}
                  </p>
                  <Estrellas rating={Math.round(proveedor.rating_avg ?? 0)} size={24} />
                  <p style={{ fontSize: '13px', color: '#888', margin: '6px 0 0' }}>{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ flex: 1 }}>
                  {distribucion.map(d => (
                    <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#888', width: '20px' }}>{d.stars}★</span>
                      <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${d.pct}%`, height: '100%', background: '#1dbf73', borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#888', width: '32px' }}>{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Listado */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#888' }}>
                          {r.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: '#222', margin: '0 0 2px' }}>{r.profiles?.full_name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Estrellas rating={r.rating_calidad} size={13} />
                            <span style={{ fontSize: '11px', color: '#888' }}>· Contratado en ServiChile</span>
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#aaa' }}>
                        {new Date(r.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {r.comment && <p style={{ fontSize: '14px', color: '#555', margin: 0, lineHeight: '1.6' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </main>
  )
}
