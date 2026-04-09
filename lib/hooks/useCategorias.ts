'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type Categoria = {
  id: string
  name: string
  slug: string
  icon: string
}

// Hook para cargar categorías desde Supabase
// Usar en cualquier componente que necesite la lista de categorías
export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .eq('activa', true)
        .order('name')
      setCategorias(data ?? [])
      setLoading(false)
    }

    load()
  }, [])

  return { categorias, loading }
}
