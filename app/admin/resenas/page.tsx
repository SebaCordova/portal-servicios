'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Resena = {
  id: string
  rating_calidad: number
  comment: string | null
  created_at: string
  reviewer_id: string
  reviewee_id: string
  reviewer: { full_name: string } | null
  reviewee: { full_name: string } | null
}

export default function AdminResenasPage() {
  const [resenas, setResenas] = useState<Resena[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroRating, setFiltroRating] = useState('todos')
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single()
      if (!profile?.is_admin) { window.location.href = '/'; return }
      await cargarResenas()
    }
    init()
  }, [])

  async function cargarResenas() {
    const { data } = await sb
      .from('reviews')
      .select(`
        id, rating_calidad, comment, created_at, reviewer_id, reviewee_id,
        reviewer:profiles!reviewer_id ( full_name ),
        reviewee:profiles!reviewee_id ( full_name )
      `)
      .order('created_at', { ascending: false })
    setResenas((data ?? []) as unknown as Resena[])
    setLoading(false)
  }

  async function eliminarResena(resena: Resena) {
    setEliminando(resena.id)

    await sb.from('reviews').delete().eq('id', resena.id)

    // Recalcular rating del proveedor afectado
    const { data: reviewsRestantes } = await sb
      .from('reviews')
      .select('rating_calidad')
      .eq('reviewee_id', resena.reviewee_id)

    const total = reviewsRestantes?.length ?? 0
    const avg = total > 0
      ? reviewsRestantes!.reduce((sum, r) => sum + r.rating_calidad, 0) / total
      : null

    // Encontrar provider_profile del reviewee
    const { data: pp } = await sb
      .from('provider_profiles')
      .select('id')
      .eq('profile_id', resena.reviewee_id)
      .single()

    if (pp) {
      await sb
        .from('provider_profiles')
        .update({
          rating_avg: avg ? Math.round(avg * 10) / 10 : null,
          total_reviews: total
        })
        .eq('id', pp.id)
    }

    setConfirmando(null)
    setEliminando(null)
    await cargarResenas()
  }

  function fmtFecha(f: string) {
    return new Date(f).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  function Estrellas({ rating }: { rating: number }) {
    return (
      <span>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ color: i <= rating ? '#1dbf73' : '#e0e0e0', fontSize: '14px' }}>★</span>
        ))}
      </span>
    )
  }

  const filtradas = filtroRating === 'todos'
    ? resenas
    : resenas.filter(r => r.rating_calidad === Number(filtroRating))

  const conteo = {
    todos: resenas.length,
    5: resenas.filter(r => r.rating_calidad === 5).length,
    4: resenas.filter(r => r.rating_calidad === 4).length,
    3: resenas.filter(r => r.rating_calidad === 3).length,
    2: resenas.filter(r => r.rating_calidad === 2).length,
    1: resenas.filter(r => r.rating_calidad === 1).length,
  }

  const avgGeneral = resenas.length > 0
    ? (resenas.reduce((sum, r) => sum + r.rating_calidad, 0) / resenas.length).toFixed(1)
    : '—'

  if (loading) return (
    <div style={{ padding: '2rem' }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem' }}>Reseñas</h1>
      <p style={{ fontSize: '14px', color: '#888', margin: '0 0 2rem' }}>Modera las reseñas de la plataforma</p>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total reseñas',   value: conteo.todos,  color: '#222' },
          { label: 'Rating promedio', value: avgGeneral,    color: '#1dbf73' },
          { label: 'Reseñas 1-2 ★',  value: conteo[1] + conteo[2], color: conteo[1] + conteo[2] > 0 ? '#e53935' : '#222' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '24px', fontWeight: '800', color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros por rating */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          ['todos', `Todas (${conteo.todos})`],
          ['5', `★★★★★ (${conteo[5]})`],
          ['4', `★★★★ (${conteo[4]})`],
          ['3', `★★★ (${conteo[3]})`],
          ['2', `★★ (${conteo[2]})`],
          ['1', `★ (${conteo[1]})`],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFiltroRating(k)}
            style={{ padding: '7px 14px', border: `1.5px solid ${filtroRating===k?'#1dbf73':'#ddd'}`, borderRadius: '20px', background: filtroRating===k?'#f0fdf7':'#fff', color: filtroRating===k?'#1dbf73':'#888', fontSize: '13px', fontWeight: filtroRating===k?'600':'400', cursor: 'pointer', fontFamily: 'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>No hay reseñas en esta categoría</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtradas.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <Estrellas rating={r.rating_calidad} />
                    <span style={{ fontSize: '12px', color: '#aaa' }}>{fmtFecha(r.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: r.comment ? '8px' : '0' }}>
                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                      👤 Cliente: <strong style={{ color: '#222' }}>{(r.reviewer as any)?.full_name ?? '—'}</strong>
                    </p>
                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                      🔧 Proveedor: <strong style={{ color: '#222' }}>{(r.reviewee as any)?.full_name ?? '—'}</strong>
                    </p>
                  </div>
                  {r.comment && (
                    <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
                      "{r.comment}"
                    </p>
                  )}
                </div>

                <div style={{ flexShrink: 0, marginLeft: '1rem' }}>
                  {confirmando === r.id ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setConfirmando(null)}
                        style={{ padding: '6px 12px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                      <button
                        onClick={() => eliminarResena(r)}
                        disabled={eliminando === r.id}
                        style={{ padding: '6px 12px', background: '#e53935', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {eliminando === r.id ? '...' : 'Confirmar'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmando(r.id)}
                      style={{ padding: '6px 12px', background: '#fff', color: '#e53935', border: '1.5px solid #e53935', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
