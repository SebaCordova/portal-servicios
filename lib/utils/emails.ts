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
