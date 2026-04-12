'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Usuario = {
  id: string
  auth_user_id: string
  full_name: string
  phone: string | null
  is_client: boolean
  is_provider: boolean
  is_admin: boolean
  activo: boolean
  created_at: string
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [accionando, setAccionando] = useState<string | null>(null)

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
      await cargarUsuarios()
    }
    init()
  }, [])

  async function cargarUsuarios() {
    const { data } = await sb
      .from('profiles')
      .select('id, auth_user_id, full_name, phone, is_client, is_provider, is_admin, activo, created_at')
      .order('created_at', { ascending: false })
    setUsuarios((data ?? []) as unknown as Usuario[])
    setLoading(false)
  }

  async function toggleActivo(usuario: Usuario) {
    setAccionando(usuario.id)
    await sb
      .from('profiles')
      .update({ activo: !usuario.activo })
      .eq('id', usuario.id)
    await cargarUsuarios()
    setAccionando(null)
  }

  function getRol(u: Usuario) {
    if (u.is_admin)    return { label: 'Admin',     bg: '#f0f0ff', color: '#3730a3' }
    if (u.is_provider) return { label: 'Proveedor', bg: '#f0fdf7', color: '#065f46' }
    return                    { label: 'Cliente',   bg: '#f5f5f5', color: '#666'    }
  }

  function fmtFecha(f: string) {
    return new Date(f).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filtrados = usuarios.filter(u => {
    const matchBusqueda = busqueda === '' ||
      u.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.phone?.includes(busqueda)
    const matchRol =
      filtroRol === 'todos' ||
      (filtroRol === 'admin'     && u.is_admin) ||
      (filtroRol === 'proveedor' && u.is_provider && !u.is_admin) ||
      (filtroRol === 'cliente'   && !u.is_provider && !u.is_admin)
    return matchBusqueda && matchRol
  })

  const conteo = {
    todos:     usuarios.length,
    cliente:   usuarios.filter(u => !u.is_provider && !u.is_admin).length,
    proveedor: usuarios.filter(u => u.is_provider && !u.is_admin).length,
    admin:     usuarios.filter(u => u.is_admin).length,
  }

  if (loading) return (
    <div style={{ padding: '2rem' }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem' }}>Usuarios</h1>
      <p style={{ fontSize: '14px', color: '#888', margin: '0 0 2rem' }}>Todos los usuarios registrados en la plataforma</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total usuarios', value: conteo.todos,     color: '#222'    },
          { label: 'Clientes',       value: conteo.cliente,   color: '#222'    },
          { label: 'Proveedores',    value: conteo.proveedor, color: '#1dbf73' },
          { label: 'Admins',         value: conteo.admin,     color: '#3730a3' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '24px', fontWeight: '800', color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          style={{ padding: '9px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', color: '#222', outline: 'none', fontFamily: 'inherit', minWidth: '260px' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            ['todos',     `Todos (${conteo.todos})`],
            ['cliente',   `Clientes (${conteo.cliente})`],
            ['proveedor', `Proveedores (${conteo.proveedor})`],
            ['admin',     `Admins (${conteo.admin})`],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setFiltroRol(k)}
              style={{ padding: '7px 14px', border: `1.5px solid ${filtroRol===k?'#1dbf73':'#ddd'}`, borderRadius: '20px', background: filtroRol===k?'#f0fdf7':'#fff', color: filtroRol===k?'#1dbf73':'#888', fontSize: '13px', fontWeight: filtroRol===k?'600':'400', cursor: 'pointer', fontFamily: 'inherit' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#aaa', margin: '0 0 1rem' }}>
        {filtrados.length} usuario{filtrados.length !== 1 ? 's' : ''}
      </p>

      {filtrados.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>No se encontraron usuarios</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          {filtrados.map((u, i) => {
            const rol = getRol(u)
            return (
              <div key={u.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: i < filtrados.length - 1 ? '1px solid #f0f0f0' : 'none',
                opacity: u.activo === false ? 0.5 : 1
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: 0 }}>
                      {u.full_name ?? 'Sin nombre'}
                    </p>
                    <span style={{ fontSize: '11px', background: rol.bg, color: rol.color, padding: '2px 8px', borderRadius: '20px' }}>
                      {rol.label}
                    </span>
                    {u.activo === false && (
                      <span style={{ fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '20px' }}>
                        Desactivado
                      </span>
                    )}
                  </div>
                  {u.phone && (
                    <p style={{ fontSize: '13px', color: '#888', margin: '0 0 2px' }}>{u.phone}</p>
                  )}
                  <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Registrado el {fmtFecha(u.created_at)}</p>
                </div>
                {!u.is_admin && (
                  <button
                    onClick={() => toggleActivo(u)}
                    disabled={accionando === u.id}
                    style={{
                      padding: '7px 14px', fontSize: '12px', fontWeight: '600',
                      border: `1.5px solid ${u.activo === false ? '#1dbf73' : '#e53935'}`,
                      borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                      background: '#fff',
                      color: u.activo === false ? '#1dbf73' : '#e53935',
                      flexShrink: 0, marginLeft: '1rem'
                    }}>
                    {accionando === u.id ? '...' : u.activo === false ? 'Reactivar' : 'Desactivar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
