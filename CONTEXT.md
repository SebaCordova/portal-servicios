# Contexto del proyecto: Portal de Servicios Presenciales Chile

## Qué estamos construyendo
Una plataforma tipo Fiverr pero para servicios que requieren presencia física en Chile.
Foco inicial en servicios del hogar y jardín: gasfitería, electricidad, jardinería, podas,
retiro de ramas y mantención de jardines.

## Stack tecnológico
- **Frontend**: Next.js 16 con App Router, TypeScript, Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth con OTP por email (sin contraseñas)
- **Deploy**: Vercel
- **Pagos**: Flow.cl (pasarela de pagos chilena)

## Estructura del proyecto
```
portal-servicios/
├── proxy.ts                    ← protección de rutas por rol (antes middleware.ts)
├── app/
│   ├── page.tsx                ← landing pública
│   ├── (auth)/
│   │   └── login/page.tsx      ← login + registro en una sola página
│   ├── admin/
│   │   └── layout.tsx          ← portal administrador
│   ├── proveedor/
│   │   └── layout.tsx          ← portal proveedor
│   └── cliente/
│       └── layout.tsx          ← portal cliente
├── lib/
│   └── supabase/
│       └── server.ts           ← cliente Supabase para server components
└── .env.local                  ← claves de Supabase
```

## Base de datos (Supabase)
8 tablas ya creadas con RLS activado:
- `profiles` — todos los usuarios (campos: id, auth_user_id, full_name, phone, avatar_url, is_client, is_provider, created_at)
- `provider_profiles` — datos extra de proveedores (bio, rut, verified, rating_avg)
- `services` — servicios que ofrece cada proveedor (title, category_id, price_clp, duration_min)
- `provider_zones` — comunas donde trabaja cada proveedor
- `bookings` — reservas entre cliente y proveedor (status: pendiente/confirmado/en_curso/completado/cancelado)
- `reviews` — reseñas post-servicio (rating 1-5)
- `transactions` — pagos via Flow.cl
- `categories` — categorías de servicios (gasfitería, electricidad, jardinería, etc.)

## Modelo de usuarios
Un usuario puede ser cliente Y proveedor al mismo tiempo:
- Al registrarse → `is_client: true`, `is_provider: false`
- Para ofrecer servicios → completa perfil de proveedor y espera verificación del admin
- Una vez verificado → `is_provider: true`, puede cambiar entre modo cliente y modo proveedor

## Autenticación
- Sin contraseñas — solo email + código OTP de 6 dígitos
- Login y registro en la misma página `/login`
- Al autenticarse por primera vez → se crea automáticamente su fila en `profiles` (via trigger en Supabase)
- Redirección post-login:
  - Si is_provider: true → `/proveedor`
  - Si solo is_client: true → `/cliente`
  - Si es admin → `/admin`

## Protección de rutas (proxy.ts)
- Rutas públicas: `/`, `/login`
- `/admin` → solo admins
- `/proveedor` → solo usuarios con is_provider: true
- `/cliente` → usuarios autenticados

## Convenciones de código
- Server Components por defecto en Next.js App Router
- Client Components solo cuando se necesita interactividad (formularios, estado)
- Siempre usar `lib/supabase/server.ts` para queries en el servidor
- Tailwind para todos los estilos
- TypeScript estricto

## Lo que viene a construir ahora
1. Página de login/registro con OTP por email (`app/(auth)/login/page.tsx`)
2. Portal cliente — búsqueda de proveedores por comuna
3. Portal proveedor — gestión de servicios y agenda
4. Portal admin — dashboard de gestión
5. Integración Flow.cl para pagos
6. Deploy en Vercel
