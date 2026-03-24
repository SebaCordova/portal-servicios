import { redirect } from 'next/navigation'
import { getRol } from '@/lib/supabase/server'

// Este layout protege TODAS las páginas dentro de /admin
// Aunque el middleware ya redirige, esta es una segunda capa de seguridad
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar rol directamente en el servidor
  // Si falla (sin sesión o rol incorrecto), redirige
  let rol: string
  try {
    rol = await getRol()
  } catch {
    redirect('/login')
  }

  if (rol !== 'admin') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar del admin */}
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h1 className="text-lg font-semibold mb-8">Panel Admin</h1>
        <nav className="space-y-2">
          <a href="/admin" className="block px-3 py-2 rounded hover:bg-gray-700">
            Dashboard
          </a>
          <a href="/admin/proveedores" className="block px-3 py-2 rounded hover:bg-gray-700">
            Proveedores
          </a>
          <a href="/admin/usuarios" className="block px-3 py-2 rounded hover:bg-gray-700">
            Usuarios
          </a>
          <a href="/admin/bookings" className="block px-3 py-2 rounded hover:bg-gray-700">
            Reservas
          </a>
          <a href="/admin/pagos" className="block px-3 py-2 rounded hover:bg-gray-700">
            Pagos
          </a>
          <a href="/admin/metricas" className="block px-3 py-2 rounded hover:bg-gray-700">
            Métricas
          </a>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-8 bg-gray-50">
        {children}
      </main>
    </div>
  )
}
