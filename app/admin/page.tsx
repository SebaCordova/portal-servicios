'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState({
    totalUsuarios: 0,
    totalProveedores: 0,
    proveedoresPendientes: 0,
    totalSolicitudes: 0,
    solicitudesAbiertas: 0,
    totalBookings: 0,
    bookingsCompletados: 0,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile?.is_admin) { window.location.href = '/'; return }

      const [
        { count: totalUsuarios },
        { count: totalProveedores },
        { count: proveedoresPendientes },
        { count: totalSolicitudes },
        { count: solicitudesAbiertas },
        { count: totalBookings },
        { count: bookingsCompletados },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('verified', false),
        supabase.from('solicitudes').select('*', { count: 'exact', head: true }),
        supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('estado', 'abierta'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completado'),
      ])

      setMetricas({
        totalUsuarios: totalUsuarios ?? 0,
        totalProveedores: totalProveedores ?? 0,
        proveedoresPendientes: proveedoresPendientes ?? 0,
        totalSolicitudes: totalSolicitudes ?? 0,
        solicitudesAbiertas: solicitudesAbiertas ?? 0,
        totalBookings: totalBookings ?? 0,
        bookingsCompletados: bookingsCompletados ?? 0,
      })

      setLoading(false)
    }
    loadData()
  }, [])

  const stats = [
    { label: 'Usuarios totales', value: metricas.totalUsuarios, icon: '👥', color: '#3730a3' },
    { label: 'Proveedores activos', value: metricas.totalProveedores, icon: '🔧', color: '#1dbf73' },
    { label: 'Proveedores pendientes', value: metricas.proveedoresPendientes, icon: '⏳', color: '#f59e0b', alert: metricas.proveedoresPendientes > 0 },
    { label: 'Solicitudes totales', value: metricas.totalSolicitudes, icon: '📋', color: '#0891b2' },
    { label: 'Solicitudes abiertas', value: metricas.solicitudesAbiertas, icon: '🟢', color: '#059669' },
    { label: 'Trabajos totales', value: metricas.totalBookings, icon: '📅', color: '#7c3aed' },
    { label: 'Trabajos completados', value: metricas.bookingsCompletados, icon: '✅', color: '#1dbf73' },
  ]

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 0.5rem' }}>Dashboard</h1>
      <p style={{ fontSize: '14px', color: '#888', margin: '0 0 2rem' }}>Resumen general de la plataforma</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background: '#fff', borderRadius: '10px', padding: '1.5rem',
            border: stat.alert ? '1.5px solid #f59e0b' : '1px solid #e0e0e0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
              {stat.alert && <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '20px' }}>Atención</span>}
            </div>
            <p style={{ fontSize: '32px', fontWeight: '800', color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {metricas.proveedoresPendientes > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: '#92400e', margin: 0, fontWeight: '500' }}>
            ⚠️ Tienes {metricas.proveedoresPendientes} proveedor{metricas.proveedoresPendientes !== 1 ? 'es' : ''} pendiente{metricas.proveedoresPendientes !== 1 ? 's' : ''} de aprobación
          </p>
          <a href="/admin/proveedores" style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', textDecoration: 'none', background: '#fcd34d', padding: '6px 14px', borderRadius: '6px' }}>
            Revisar →
          </a>
        </div>
      )}
    </div>
  )
}
