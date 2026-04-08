'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams } from 'next/navigation'

type Mensaje = {
  id: string
  contenido: string
  created_at: string
  remitente_id: string
  leido: boolean
  profiles: { full_name: string }
}

const MAX_CHARS = 500

// Patrones para detectar bypass
const BYPASS_PATTERNS = [
  /(\+?56\s?9[\s\-]?\d{4}[\s\-]?\d{4})/gi,        // teléfonos chilenos
  /(\+?\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{4})/gi, // teléfonos internacionales
  /[\w.-]+@[\w.-]+\.\w{2,}/gi,                       // emails
  /(https?:\/\/|www\.)\S+/gi,                        // links
  /whatsapp|wsp|wasap|telegram|signal|instagram|ig\s*:|ig\s*@/gi, // apps de mensajería
]

function detectaBypass(texto: string): boolean {
  return BYPASS_PATTERNS.some(pattern => pattern.test(texto))
}

export default function ChatPage() {
  const params = useParams()
  const solicitudId = params.solicitudId as string

  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [loading, setLoading] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [solicitud, setSolicitud] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

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
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) return
      setProfileId(profile.id)

      // Cargar info de la solicitud
      const { data: sol } = await supabase
        .from('solicitudes')
        .select('estado, comuna, categories ( name ), profiles!cliente_id ( full_name, email )')
        .eq('id', solicitudId)
        .single()

      setSolicitud(sol)

      // Cargar mensajes
      await cargarMensajes(profile.id)
      setLoading(false)
    }
    loadData()
  }, [solicitudId])

  async function cargarMensajes(pid?: string) {
    const { data } = await supabase
      .from('mensajes')
      .select('id, contenido, created_at, remitente_id, leido, profiles!remitente_id ( full_name )')
      .eq('solicitud_id', solicitudId)
      .order('created_at', { ascending: true })

    setMensajes((data ?? []) as unknown as Mensaje[])

    // Marcar como leídos
    const myId = pid ?? profileId
    if (myId) {
      await supabase
        .from('mensajes')
        .update({ leido: true })
        .eq('solicitud_id', solicitudId)
        .neq('remitente_id', myId)
        .eq('leido', false)
    }

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function enviarMensaje() {
    if (!texto.trim()) return
    if (texto.length > MAX_CHARS) { setError(`Máximo ${MAX_CHARS} caracteres.`); return }
    if (detectaBypass(texto)) {
      setError('No puedes compartir datos de contacto, links o apps de mensajería externa. Mantén la comunicación en ServiChile.')
      return
    }

    setEnviando(true)
    setError('')

    const { error: insertError } = await supabase
      .from('mensajes')
      .insert({
        solicitud_id: solicitudId,
        remitente_id: profileId,
        contenido: texto.trim(),
        leido: false
      })

    if (insertError) {
      setError('Error al enviar el mensaje. Intenta nuevamente.')
    } else {
      setTexto('')
      await cargarMensajes()

// Notificar al destinatario
await fetch('/api/notifications/mensaje', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailDestinatario: solicitud?.profiles?.email,
    nombreDestinatario: solicitud?.profiles?.full_name,
    nombreRemitente: (await supabase.from('profiles').select('full_name').eq('id', profileId).single()).data?.full_name,
    categoria: solicitud?.categories?.name,
    solicitudId
  })
})
    }

    setEnviando(false)
  }

  function formatHora(fecha: string) {
    return new Date(fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function esMismoDia(a: string, b: string) {
    return new Date(a).toDateString() === new Date(b).toDateString()
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: '#888' }}>Cargando...</p>
      </main>
    )
  }

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      {/* Header del chat */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href="/mensajes" style={{ color: '#888', textDecoration: 'none', fontSize: '20px' }}>←</a>
        <div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', margin: '0 0 2px' }}>
            {(solicitud?.categories as any)?.name ?? 'Servicio'}
          </p>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
            {solicitud?.comuna} · {(solicitud?.profiles as any)?.full_name}
          </p>
        </div>
      </div>

      {/* Aviso de privacidad */}
      <div style={{ background: '#fef3c7', padding: '8px 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#92400e', margin: 0 }}>
          🔒 Por seguridad, no compartas datos de contacto ni links externos. Mantén la comunicación aquí.
        </p>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {mensajes.length === 0 && (
          <div style={{ textAlign: 'center', margin: 'auto' }}>
            <p style={{ fontSize: '36px', margin: '0 0 0.8rem' }}>💬</p>
            <p style={{ fontSize: '14px', color: '#888' }}>Sé el primero en escribir</p>
          </div>
        )}

        {mensajes.map((m, i) => {
          const esMio = m.remitente_id === profileId
          const mostrarFecha = i === 0 || !esMismoDia(m.created_at, mensajes[i-1].created_at)

          return (
            <div key={m.id}>
              {mostrarFecha && (
                <p style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', margin: '12px 0 8px', textTransform: 'capitalize' }}>
                  {formatFecha(m.created_at)}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: esMio ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
                <div style={{
                  maxWidth: '70%', padding: '10px 14px', borderRadius: esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: esMio ? '#1dbf73' : '#fff',
                  border: esMio ? 'none' : '1px solid #e0e0e0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                }}>
                  {!esMio && (
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#1dbf73', margin: '0 0 4px' }}>
                      {(m.profiles as any)?.full_name}
                    </p>
                  )}
                  <p style={{ fontSize: '14px', color: esMio ? '#fff' : '#222', margin: '0 0 4px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                    {m.contenido}
                  </p>
                  <p style={{ fontSize: '10px', color: esMio ? 'rgba(255,255,255,0.7)' : '#aaa', margin: 0, textAlign: 'right' }}>
                    {formatHora(m.created_at)}
                    {esMio && <span style={{ marginLeft: '4px' }}>{m.leido ? '✓✓' : '✓'}</span>}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0', padding: '1rem 1.5rem' }}>
        {error && (
          <p style={{ fontSize: '12px', color: '#e53935', margin: '0 0 8px', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', lineHeight: '1.4' }}>
            ⚠️ {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              value={texto}
              onChange={e => { setTexto(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje() } }}
              placeholder="Escribe un mensaje..."
              rows={1}
              maxLength={MAX_CHARS}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '10px', fontSize: '14px', color: '#222', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none', lineHeight: '1.4' }}
            />
            <p style={{ fontSize: '11px', color: texto.length > MAX_CHARS * 0.9 ? '#e53935' : '#aaa', margin: '4px 0 0', textAlign: 'right' }}>
              {texto.length}/{MAX_CHARS}
            </p>
          </div>
          <button
            onClick={enviarMensaje}
            disabled={enviando || !texto.trim()}
            style={{ padding: '10px 16px', background: texto.trim() ? '#1dbf73' : '#e0e0e0', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: texto.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginBottom: '22px' }}>
            {enviando ? '...' : '→'}
          </button>
        </div>
      </div>

    </main>
  )
}
