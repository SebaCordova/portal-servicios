# Contexto del proyecto: ServiChile — Portal de Servicios Presenciales Chile

**Última actualización:** Abril 2026

## Qué estamos construyendo
Marketplace de servicios del hogar para Chile (gasfitería, electricidad, jardinería, etc.).
Modelo: cliente publica solicitud → proveedores envían propuestas → cliente acepta → pago vía Flow.cl → trabajo → reseña.

## Stack tecnológico
- **Frontend**: Next.js 16, React 19, TypeScript (strict), Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL) con RLS
- **Auth**: Supabase Auth — OTP por email (sin contraseñas)
- **Email transaccional**: Resend
- **Deploy**: Vercel (rama `main` → producción automática)
- **Pagos**: Flow.cl — integración pendiente (mock activo)

## Estructura del proyecto
```
portal-servicios/
├── proxy.ts                         ← middleware de protección de rutas por rol
├── app/
│   ├── page.tsx                     ← landing pública
│   ├── login/                       ← login + registro OTP
│   ├── registro-proveedor/          ← onboarding proveedor
│   ├── admin/                       ← portal administrador
│   │   ├── proveedores/             ← listado y aprobación de proveedores
│   │   ├── bookings/                ← gestión de reservas
│   │   ├── pagos/                   ← gestión de pagos
│   │   ├── metricas/                ← dashboard métricas
│   │   └── ...otros módulos admin
│   ├── proveedor/                   ← portal proveedor
│   │   ├── page.tsx                 ← dashboard con indicadores reales
│   │   ├── agenda/                  ← trabajos confirmados y en proceso
│   │   ├── ganancias/               ← historial de ingresos por mes
│   │   ├── servicios/               ← gestión de servicios ofrecidos
│   │   └── perfil/                  ← perfil público del proveedor
│   ├── cliente/                     ← portal cliente
│   │   ├── buscar/                  ← búsqueda de proveedores
│   │   ├── mis-pedidos/             ← historial de solicitudes y reseñas
│   │   └── perfil/
│   └── api/
│       ├── bookings/
│       │   ├── completar/route.ts   ← ✅ con autorización de 3 capas
│       │   └── en-proceso/route.ts  ← ✅ mismo patrón de autorización
│       ├── admin/
│       │   └── aprobar-proveedor/   ← ✅ usa createSupabaseServer()
│       └── webhooks/
│           └── pagos/               ← 🔴 VACÍO — pendiente Flow.cl
├── lib/
│   ├── supabase/
│   │   ├── client.ts                ← ✅ singleton para browser client
│   │   └── server.ts                ← ✅ createSupabaseServer(), getUser(), getRol(), getClientEmail()
│   └── payments/
│       └── flow.ts                  ← mock activo, flowProcessPayment() pendiente
└── types/
    └── index.ts
```

## Base de datos (Supabase)
8 tablas con RLS activado:
- `profiles` — todos los usuarios (id, auth_user_id, full_name, phone, is_client, is_provider, is_admin)
- `provider_profiles` — datos extra de proveedores (bio, rut, verified, rating_avg, total_reviews)
- `services` — servicios que ofrece cada proveedor (title, category_id, price_clp, active)
- `provider_zones` — comunas donde trabaja cada proveedor
- `solicitudes` — pedidos publicados por clientes
- `propuestas` — ofertas de proveedores a solicitudes (estado: pendiente/aceptada/rechazada, campo: descartada_por_proveedor)
- `bookings` — reservas confirmadas (status: confirmado/en_proceso/completado/cancelado)
- `reviews` — reseñas post-servicio (rating 1-5)
- `transactions` — pagos via Flow.cl
- `categories` — categorías de servicios

**Pendiente en DB:**
- 🔴 Trigger `trg_recalcular_rating`: recalcular `rating_avg` y `total_reviews` en `provider_profiles` al insertar en `reviews` (SQL listo en doc de instrucciones 4.3)
- 🔴 Índices compuestos en `bookings` y `propuestas` (SQL listo en doc de instrucciones 4.3)

## Estado de seguridad (Auditoría Abril 2026)

### ✅ Resuelto
- Autorización en `/api/bookings/completar` — 3 capas: auth → is_provider → ownership
- Endpoint `/api/bookings/en-proceso` — mismo patrón
- Indicadores reales en dashboard proveedor (trabajos completados, ganancias del mes)
- Solicitudes descartadas persistidas en DB (`descartada_por_proveedor` en propuestas)
- Singleton Supabase browser client (`lib/supabase/client.ts`)
- Helpers `getUser()`, `getRol()`, `getClientEmail()` en `lib/supabase/server.ts`
- `aprobar-proveedor/route.ts` usa `createSupabaseServer()` con Promise.all()
- Fix TypeScript strict: `implicit any` en `agenda/page.tsx` y `ganancias/page.tsx`
- Deploy en Vercel funcionando en producción ✅

### 🔴 Pendiente crítico
- **Webhook Flow.cl** (`/api/webhooks/pagos/`) — carpeta vacía, sin integración real de pagos
- **Service Role Key** en `completar/route.ts` — pendiente mover a Edge Function

### 🟡 Pendiente medio
- Trigger DB `rating_avg` (SQL documentado)
- Índices compuestos en `bookings` y `propuestas` (SQL documentado)
- Notificación email al proveedor cuando admin lo aprueba
- Rate limiting OTP en Supabase Auth Dashboard
- Fix `mis-pedidos/page.tsx`: eliminar cálculo manual de `rating_avg` (esperar trigger DB primero)

## Convenciones de código
- **Siempre** usar `getSupabaseBrowserClient()` de `lib/supabase/client.ts` en Client Components (nunca instanciar `createBrowserClient()` directamente)
- **Siempre** usar `createSupabaseServer()` de `lib/supabase/server.ts` en route handlers y Server Components
- **Nunca** usar `SUPABASE_SERVICE_ROLE_KEY` fuera de `lib/supabase/server.ts`
- TypeScript strict: tipar resultados de queries Supabase explícitamente (`as { data: Tipo[] | null }`)
- Correr `npm run build` localmente antes de cada push para atrapar errores de TS

## Modelo de negocio
- **Take rate**: 12–15% sobre cada transacción completada (cobro automático via Flow.cl)
- **Suscripción Pro Proveedor**: $9.990 CLP/mes → reduce comisión a 8% + badge verificado
- **Leads pagados** (fase 2): $990–$2.990 CLP por solicitud desbloqueada

## Próximos pasos priorizados
1. 🔴 Implementar webhook Flow.cl con validación HMAC
2. 🔴 Mover Service Role Key a Supabase Edge Function
3. 🟡 Ejecutar SQL de trigger `rating_avg` en Supabase
4. 🟡 Ejecutar SQL de índices en `bookings` y `propuestas`
5. 🟡 Notificación email al proveedor aprobado
6. 🟡 Rate limiting OTP en Supabase Auth Dashboard
7. 🟢 Supabase Realtime para notificaciones en tiempo real
8. 🟢 SEO: páginas por categoría + comuna
9. 🟢 Tests E2E con Playwright (flujos críticos)
