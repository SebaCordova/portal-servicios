import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function enviarEmailAprobacion(email: string, nombre: string) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: email,
    subject: '¡Tu cuenta de proveedor fue aprobada!',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 24px; font-weight: 800; color: #222;">
            Servi<span style="color: #1dbf73;">Chile</span>
          </h1>
        </div>
        <div style="background: #f0fdf7; border-radius: 12px; padding: 2rem; text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 48px; margin-bottom: 1rem;">✓</div>
          <h2 style="color: #065f46; font-size: 20px; margin: 0 0 0.5rem;">¡Felicitaciones, ${nombre}!</h2>
          <p style="color: #047857; margin: 0;">Tu cuenta de proveedor ha sido aprobada.</p>
        </div>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          Ya puedes acceder al portal de proveedores y comenzar a ofrecer tus servicios.
        </p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="http://localhost:3000/proveedor" 
            style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Ir al portal proveedor
          </a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          ServiChile — Servicios profesionales a domicilio
        </p>
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
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 24px; font-weight: 800; color: #222;">
            Servi<span style="color: #1dbf73;">Chile</span>
          </h1>
        </div>
        <h2 style="color: #222; font-size: 18px;">Hola ${nombre},</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          Luego de revisar tu solicitud, no pudimos aprobar tu cuenta de proveedor en este momento.
        </p>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          Si crees que hubo un error o quieres más información, responde este email y te ayudaremos.
        </p>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 2rem;">
          ServiChile — Servicios profesionales a domicilio
        </p>
      </div>
    `
  })
}

export async function enviarEmailNuevaSolicitud(nombreProveedor: string) {
  await resend.emails.send({
    from: 'ServiChile <onboarding@resend.dev>',
    to: 'sebastian.cordova@gmail.com',
    subject: `Nueva solicitud de proveedor: ${nombreProveedor}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 24px; font-weight: 800; color: #222;">
            Servi<span style="color: #1dbf73;">Chile</span>
          </h1>
        </div>
        <h2 style="color: #222; font-size: 18px;">Nueva solicitud pendiente</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          <strong>${nombreProveedor}</strong> ha enviado una solicitud para ser proveedor.
        </p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="http://localhost:3000/admin" 
            style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Revisar en el panel admin
          </a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          ServiChile — Servicios profesionales a domicilio
        </p>
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
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 24px; font-weight: 800; color: #222;">
            Servi<span style="color: #1dbf73;">Chile</span>
          </h1>
        </div>
        <div style="background: #fef3c7; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 4px;">📋 Nueva solicitud disponible</p>
          <p style="color: #92400e; font-size: 13px; margin: 0;">Hay un cliente buscando tu servicio en tu zona.</p>
        </div>
        <h2 style="color: #222; font-size: 18px; margin: 0 0 1rem;">Hola ${nombreProveedor},</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 1rem;">
          Un cliente necesita el servicio de <strong>${categoria}</strong> en <strong>${comuna}</strong>.
        </p>
        <div style="background: #f9f9f9; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
          <p style="font-size: 13px; color: #888; margin: 0 0 4px; font-weight: 500;">FECHAS DISPONIBLES</p>
          <p style="font-size: 14px; color: #222; margin: 0;">${fechaInicio} → ${fechaFin}</p>
        </div>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="http://localhost:3000/proveedor"
            style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Ver solicitud y enviar propuesta
          </a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 2rem;">
          ServiChile — Servicios profesionales a domicilio
        </p>
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
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 24px; font-weight: 800; color: #222;">
            Servi<span style="color: #1dbf73;">Chile</span>
          </h1>
        </div>
        <div style="background: #f0fdf7; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0 0 4px;">💰 Nueva propuesta recibida</p>
          <p style="color: #047857; font-size: 13px; margin: 0;">Un profesional respondió a tu solicitud.</p>
        </div>
        <h2 style="color: #222; font-size: 18px; margin: 0 0 1rem;">Hola ${nombreCliente},</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 1rem;">
          <strong>${nombreProveedor}</strong> envió una propuesta para tu solicitud de <strong>${categoria}</strong>.
        </p>
        <div style="background: #f9f9f9; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
          <div style="margin-bottom: 8px;">
            <p style="font-size: 12px; color: #888; margin: 0 0 2px; font-weight: 500;">PRECIO PROPUESTO</p>
            <p style="font-size: 20px; font-weight: 800; color: #222; margin: 0;">$${precio.toLocaleString('es-CL')}</p>
          </div>
          <div>
            <p style="font-size: 12px; color: #888; margin: 0 0 2px; font-weight: 500;">FECHA Y HORA ESTIMADA</p>
            <p style="font-size: 14px; color: #222; margin: 0;">${new Date(fechaHora).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="http://localhost:3000/cliente/mis-pedidos"
            style="background: #1dbf73; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Ver propuesta y responder
          </a>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 2rem;">
          ServiChile — Servicios profesionales a domicilio
        </p>
      </div>
    `
  })
}
