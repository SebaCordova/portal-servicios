import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'

export async function enviarEmailAprobacion(email: string, nombre: string) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: email,
    subject: '¡Tu cuenta de proveedor fue aprobada!',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 24px; font-weight: 800; color: #222;">Servi<span style="color: #1dbf73;">Chile</span></h1>
        <div style="background: #f0fdf7; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
          <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0;">✓ ¡Tu cuenta de proveedor fue aprobada!</p>
        </div>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">Hola ${nombre}, ya puedes acceder al portal de proveedores.</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${SITE_URL}/proveedor" style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Ir al portal proveedor</a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">ServiChile — Servicios profesionales a domicilio</p>
      </div>
    `
  })
}

export async function enviarEmailRechazo(email: string, nombre: string) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: email,
    subject: 'Actualización sobre tu solicitud de proveedor',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 24px; font-weight: 800; color: #222;">Servi<span style="color: #1dbf73;">Chile</span></h1>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">Hola ${nombre}, luego de revisar tu solicitud, no pudimos aprobar tu cuenta en este momento.</p>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">Si tienes dudas, responde este email.</p>
        <p style="color: #aaa; font-size: 12px; text-align: center;">ServiChile — Servicios profesionales a domicilio</p>
      </div>
    `
  })
}

export async function enviarEmailNuevaSolicitudAdmin(nombreProveedor: string) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: 'sebastian.cordova@gmail.com',
    subject: `Nueva solicitud de proveedor: ${nombreProveedor}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 24px; font-weight: 800; color: #222;">Servi<span style="color: #1dbf73;">Chile</span></h1>
        <p style="color: #444; font-size: 14px; line-height: 1.6;"><strong>${nombreProveedor}</strong> ha enviado una solicitud para ser proveedor.</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${SITE_URL}/admin" style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Revisar en el panel admin</a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">ServiChile — Servicios profesionales a domicilio</p>
      </div>
    `
  })
}

export async function enviarEmailNuevaSolicitudProveedor(
  emailProveedor: string,
  nombreProveedor: string,
  categoria: string,
  comuna: string,
  fechaInicio: string,
  fechaFin: string
) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: emailProveedor,
    subject: `Nueva solicitud en tu zona: ${categoria}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 24px; font-weight: 800; color: #222;">Servi<span style="color: #1dbf73;">Chile</span></h1>
        <div style="background: #fef3c7; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
          <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0;">📋 Nueva solicitud disponible en ${comuna}</p>
        </div>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">Hola ${nombreProveedor}, un cliente necesita <strong>${categoria}</strong>.</p>
        <p style="color: #444; font-size: 14px;">Fechas disponibles: ${fechaInicio} → ${fechaFin}</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${SITE_URL}/proveedor" style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Ver solicitud y enviar propuesta</a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">ServiChile — Servicios profesionales a domicilio</p>
      </div>
    `
  })
}

export async function enviarEmailNuevaPropuesta(
  emailCliente: string,
  nombreCliente: string,
  nombreProveedor: string,
  categoria: string,
  precio: number,
  fechaHora: string
) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: emailCliente,
    subject: `Nueva propuesta recibida: ${categoria}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 24px; font-weight: 800; color: #222;">Servi<span style="color: #1dbf73;">Chile</span></h1>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">Hola ${nombreCliente}, <strong>${nombreProveedor}</strong> envió una propuesta para tu solicitud de <strong>${categoria}</strong>.</p>
        <div style="background: #f9f9f9; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <p style="font-size: 12px; color: #888; margin: 0 0 4px;">PRECIO</p>
          <p style="font-size: 20px; font-weight: 800; color: #222; margin: 0 0 8px;">$${precio.toLocaleString('es-CL')}</p>
          <p style="font-size: 12px; color: #888; margin: 0 0 4px;">FECHA ESTIMADA</p>
          <p style="font-size: 14px; color: #222; margin: 0;">${new Date(fechaHora).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${SITE_URL}/cliente/mis-pedidos" style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Ver propuesta</a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">ServiChile — Servicios profesionales a domicilio</p>
      </div>
    `
  })
}

export async function enviarEmailPropuestaAceptada(
  emailProveedor: string,
  nombreProveedor: string,
  categoria: string,
  direccion: string,
  comuna: string,
  fechaHora: string,
  precio: number
) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: emailProveedor,
    subject: `¡Tu propuesta fue aceptada! ${categoria}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 24px; font-weight: 800; color: #222;">Servi<span style="color: #1dbf73;">Chile</span></h1>
        <div style="background: #f0fdf7; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
          <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0;">✓ ¡Tu propuesta fue aceptada!</p>
        </div>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">Hola ${nombreProveedor}, tu propuesta para <strong>${categoria}</strong> fue aceptada.</p>
        <div style="background: #f9f9f9; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <p style="font-size: 12px; color: #888; margin: 0 0 4px;">DIRECCIÓN</p>
          <p style="font-size: 14px; color: #222; margin: 0 0 8px;">${direccion}, ${comuna}</p>
          <p style="font-size: 12px; color: #888; margin: 0 0 4px;">FECHA Y HORA</p>
          <p style="font-size: 14px; color: #222; margin: 0 0 8px;">${new Date(fechaHora).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p style="font-size: 12px; color: #888; margin: 0 0 4px;">PRECIO</p>
          <p style="font-size: 20px; font-weight: 800; color: #222; margin: 0;">$${precio.toLocaleString('es-CL')}</p>
        </div>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${SITE_URL}/proveedor" style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Ver en mi dashboard</a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">ServiChile — Servicios profesionales a domicilio</p>
      </div>
    `
  })
}

export async function enviarEmailNuevoMensaje(
  emailDestinatario: string,
  nombreDestinatario: string,
  nombreRemitente: string,
  categoria: string,
  solicitudId: string
) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: emailDestinatario,
    subject: `Nuevo mensaje de ${nombreRemitente}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h1 style="font-size: 24px; font-weight: 800; color: #222;">Servi<span style="color: #1dbf73;">Chile</span></h1>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">Hola ${nombreDestinatario}, <strong>${nombreRemitente}</strong> te envió un mensaje sobre <strong>${categoria}</strong>.</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${SITE_URL}/mensajes/${solicitudId}" style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Ver mensaje</a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">ServiChile — Servicios profesionales a domicilio</p>
      </div>
    `
  })
}
