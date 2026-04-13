'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Categoria = {
  id: string
  name: string
  slug: string | null
  emoji: string | null
  icon: string | null
  activa: boolean | null
  requiere_cotizacion: boolean | null
}

const EMPTY: Omit<Categoria, 'id'> = {
  name: '',
  slug: '',
  emoji: '',
  icon: null,
  activa: true,
  requiere_cotizacion: true,
}

export default function AdminCategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState('')

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
      await cargarCategorias()
    }
    init()
  }, [])

  async function cargarCategorias() {
    const { data, error } = await sb
      .from('categories')
      .select('id, name, slug, emoji, icon, activa, requiere_cotizacion')
      .order('name', { ascending: true })
    if (error) console.error('Error cargando categorías:', error)
    setCategorias(data ?? [])
    setLoading(false)
  }

  function slugificar(texto: string) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  }

  function abrirCrear() {
    setForm({ ...EMPTY })
    setCreando(true)
    setEditando(null)
    setError('')
  }

  function abrirEditar(cat: Categoria) {
    setForm({
      name: cat.name,
      slug: cat.slug ?? '',
      emoji: cat.emoji ?? '',
      icon: cat.icon,
      activa: cat.activa ?? true,
      requiere_cotizacion: cat.requiere_cotizacion ?? true,
    })
    setEditando(cat.id)
    setCreando(false)
    setError('')
  }

  function cancelar() {
    setCreando(false)
    setEditando(null)
    setError('')
  }

  async function guardar() {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.slug?.trim()) { setError('El slug es obligatorio.'); return }

    setGuardando(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      slug: form.slug?.trim() ?? '',
      emoji: form.emoji?.trim() || '🛠️',
      activa: form.activa,
      requiere_cotizacion: form.requiere_cotizacion,
    }

    if (creando) {
      const { error: insertError } = await sb.from('categories').insert(payload)
      if (insertError) {
        setError(insertError.message.includes('unique') || insertError.message.includes('duplicate')
          ? 'Ya existe una categoría con ese slug.'
          : `Error al crear: ${insertError.message}`)
        setGuardando(false)
        return
      }
    } else if (editando) {
      const { error: updateError } = await sb.from('categories').update(payload).eq('id', editando)
      if (updateError) {
        setError(`Error al actualizar: ${updateError.message}`)
        setGuardando(false)
        return
      }
    }

    setGuardando(false)
    cancelar()
    await cargarCategorias()
  }

  async function toggleActiva(cat: Categoria) {
    await sb.from('categories').update({ activa: !cat.activa }).eq('id', cat.id)
    await cargarCategorias()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #ddd',
    borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'inherit'
  }

  if (loading) return (
    <div style={{ padding: '2rem' }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </div>
  )

  const activas   = categorias.filter(c => c.activa).length
  const inactivas = categorias.filter(c => !c.activa).length

  return (
    <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem' }}>Categorías</h1>
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
            {categorias.length} en total · {activas} activa{activas !== 1 ? 's' : ''} · {inactivas} inactiva{inactivas !== 1 ? 's' : ''}
          </p>
        </div>
        {!creando && !editando && (
          <button onClick={abrirCrear}
            style={{ padding: '10px 20px', background: '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nueva categoría
          </button>
        )}
      </div>

      {(creando || editando) && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #1dbf73', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '0 0 1.2rem' }}>
            {creando ? 'Nueva categoría' : 'Editar categoría'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '4px' }}>NOMBRE *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => {
                  const name = e.target.value
                  setForm(prev => ({
                    ...prev,
                    name,
                    slug: editando ? prev.slug : slugificar(name)
                  }))
                }}
                placeholder="Ej: Gasfitería"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '4px' }}>
                EMOJI <span style={{ color: '#aaa', fontWeight: '400' }}>(opcional)</span>
              </label>
              <input
                type="text"
                value={form.emoji ?? ''}
                onChange={e => setForm(prev => ({ ...prev, emoji: e.target.value }))}
                placeholder="🛠️"
                style={{ ...inputStyle, width: '80px', textAlign: 'center', fontSize: '20px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '4px' }}>
              SLUG * <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '400' }}>(URL: /categorias/slug)</span>
            </label>
            <input
              type="text"
              value={form.slug ?? ''}
              onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="Ej: gasfiteria"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#444' }}>
              <input type="checkbox" checked={form.activa ?? true}
                onChange={e => setForm(prev => ({ ...prev, activa: e.target.checked }))}
                style={{ accentColor: '#1dbf73', width: '16px', height: '16px' }} />
              Activa (visible en el sitio)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#444' }}>
              <input type="checkbox" checked={form.requiere_cotizacion ?? true}
                onChange={e => setForm(prev => ({ ...prev, requiere_cotizacion: e.target.checked }))}
                style={{ accentColor: '#1dbf73', width: '16px', height: '16px' }} />
              Requiere cotización
            </label>
          </div>

          {error && <p style={{ fontSize: '13px', color: '#e53935', margin: '0 0 1rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={cancelar}
              style={{ flex: 1, padding: '10px', background: '#f5f5f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              style={{ flex: 1, padding: '10px', background: guardando ? '#a8e6c8' : '#1dbf73', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        {categorias.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>No hay categorías. Crea la primera.</p>
          </div>
        ) : (
          categorias.map((cat, i) => (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '1rem 1.5rem',
              borderBottom: i < categorias.length - 1 ? '1px solid #f0f0f0' : 'none',
              opacity: cat.activa ? 1 : 0.5
            }}>
              <span style={{ fontSize: '22px', flexShrink: 0, minWidth: '28px', textAlign: 'center' }}>
                {cat.emoji || '🛠️'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: 0 }}>{cat.name}</p>
                  {!cat.activa && (
                    <span style={{ fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '20px' }}>Inactiva</span>
                  )}
                  {cat.requiere_cotizacion && (
                    <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '20px' }}>Cotización</span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
                  {cat.slug ? `/categorias/${cat.slug}` : 'Sin slug'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => abrirEditar(cat)}
                  style={{ padding: '6px 14px', background: '#f5f5f5', color: '#444', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Editar
                </button>
                <button onClick={() => toggleActiva(cat)}
                  style={{ padding: '6px 14px', background: '#fff', color: cat.activa ? '#e53935' : '#1dbf73', border: `1.5px solid ${cat.activa ? '#e53935' : '#1dbf73'}`, borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {cat.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
