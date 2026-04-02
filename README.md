# Barberia Nueva

## Arquitectura

- Next.js App Router fullstack sobre Vercel.
- PostgreSQL unico con modelo multi-tenant por `tenant_id`.
- Rutas publicas por slug: `/{tenant}`.
- Middleware para panel owner.
- Capa separada en `repositories/`, `services/` y `app/api/`.

## Por que Next.js fullstack

- Unifica frontend y backend sin microservicios.
- Encaja mejor con Vercel.
- Permite middleware por slug y route handlers simples.
- Reduce complejidad operativa para la primera version.

## Esquema de base de datos

Archivo: `database/schema.sql`

Incluye:
- `tenants`
- `users`
- `customers`
- `services`
- `barbers`
- `barber_services`
- `barber_working_hours`
- `appointments`
- `payments`
- `queue_entries`

Puntos criticos:
- todas las tablas operativas tienen `tenant_id`
- exclusion constraint para evitar solapamientos reales por barbero
- indices compuestos por `tenant_id`
- timestamps `created_at` y `updated_at`

## Algoritmo de disponibilidad

Implementado en `services/availability.ts`.

Regla:
1. para cada barbero compatible con el servicio
2. cursor = ahora
3. leer agenda futura ordenada
4. detectar primer hueco suficiente dentro de jornada
5. si no entra, continuar al siguiente bloque/dia
6. devolver el menor resultado entre barberos

La fila walk-in reutiliza ese calculo y asigna el hueco mas cercano.

## Local con PostgreSQL

1. Crear base de datos local.
2. Instalar dependencias:
   - `npm install`
3. Ejecutar:
   - `npm run dev`
4. Si no existe, el proyecto crea `.env.local` desde `.env.example`, aplica esquema y seed automaticamente.
5. Abrir:
   - `http://localhost:3000/barberia-x`

Credenciales demo:
- email: `owner@barberia-x.test`
- password: `admin1234`

## Endpoints principales

- `GET /api/public/[tenantSlug]/home`
- `GET /api/public/[tenantSlug]/services`
- `GET /api/public/[tenantSlug]/availability?serviceId=...`
- `POST /api/public/[tenantSlug]/appointments`
- `GET /api/public/[tenantSlug]/appointments/[appointmentId]`
- `POST /api/public/[tenantSlug]/queue`
- `POST /api/auth/login`

## Deploy posterior en Vercel + Neon

1. Crear proyecto PostgreSQL en Neon.
2. Ejecutar `database/schema.sql` sobre Neon.
3. Cargar seed inicial si hace falta.
4. En Vercel configurar:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `APP_URL`
5. Deploy con `npm run build` validado antes.
6. Apuntar dominio si luego queres mapear subdominios o dominios custom.

## Gap detectado en el material fuente

El ZIP recibido no trajo el HTML base prometido ni assets de UI listos para convertir. Trajo archivos tecnicos aislados de otro contexto. Por eso esta base respeta el flujo del documento, pero no puede replicar fielmente un diseño visual inexistente.

