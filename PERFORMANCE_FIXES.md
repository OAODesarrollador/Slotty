# Plan de implementación — Performance fixes Barberia SaaS

## Orden recomendado (mayor impacto primero)

---

### P1 — DB Client singleton (5 min, impacto crítico)

**Qué hacer:**
1. Reemplazar `src/lib/db.ts` con el archivo incluido en este paquete.
2. Verificar que todos los imports de `db` usen `@/lib/db` y no instancien
   `createClient()` directamente en cada archivo.

**Verificación:**
```bash
# Buscar instancias de createClient fuera de db.ts (deberían ser 0)
grep -r "createClient" src/ app/ --include="*.ts" --include="*.tsx" | grep -v "src/lib/db.ts"
```

---

### P2 — Queries en paralelo / batch (15 min, impacto alto)

**Qué hacer:**
1. Copiar `src/lib/queries/dashboard.ts` al proyecto.
2. Encontrar las rutas o Server Components que hacen queries al dashboard
   y reemplazar los `await` secuenciales por `getDashboardData()`.

**Patrón a buscar y eliminar:**
```ts
// ❌ ANTES — secuencial (cada await espera al anterior)
const a = await db.execute("SELECT ...");
const b = await db.execute("SELECT ...");
const c = await db.execute("SELECT ...");

// ✅ DESPUÉS — paralelo (todas corren al mismo tiempo)
const [a, b, c] = await Promise.all([
  db.execute("SELECT ..."),
  db.execute("SELECT ..."),
  db.execute("SELECT ..."),
]);

// ✅ MEJOR — batch (un solo viaje de red)
const [ra, rb, rc] = await db.batch([...queries], "read");
```

---

### P3 — Cache con unstable_cache (30 min, impacto alto)

**Qué hacer:**
1. Copiar `src/lib/queries/cached.ts` al proyecto.
2. Reemplazar las llamadas directas a `db.execute()` en Server Components
   por las funciones cacheadas (`getDayAppointments`, `getActiveBarbers`, etc.).
3. En Server Actions o Route Handlers que mutan datos, agregar la invalidación:
   ```ts
   import { invalidateAppointments } from "@/lib/queries/cached";
   await invalidateAppointments(tenantId);
   ```

**Ajustar TTLs según tu caso:**
- Datos que cambian mucho (appointments activos): 15-30s
- Datos que cambian poco (barberos, servicios): 2-5 min
- Configuración del tenant: 5-10 min

---

### P4 — Middleware optimizado (10 min, impacto medio)

**Qué hacer:**
1. Reemplazar `middleware.ts` con el archivo incluido.
2. En los Route Handlers que actualmente llaman `readSessionToken()`,
   reemplazar por lectura de headers:
   ```ts
   // ❌ ANTES
   const session = await readSessionToken(cookies().get(SESSION_COOKIE)?.value);
   const tenantId = session.tenantId;

   // ✅ DESPUÉS (sin crypto extra)
   const tenantId = (await headers()).get("x-session-tenant-id");
   ```

---

### P5 — Índices SQL (20 min, impacto medio-alto con datos reales)

**Qué hacer:**
1. Copiar `src/lib/queries/indexes.ts` al proyecto.
2. Llamar `createPerformanceIndexes()` desde `scripts/setup.ts`:
   ```ts
   import { createPerformanceIndexes } from "@/lib/queries/indexes";
   await createPerformanceIndexes();
   ```
3. Ejecutar en producción:
   ```bash
   npm run setup
   ```

**Verificar que se usen los índices:**
```ts
import { explainQuery } from "@/lib/queries/indexes";

await explainQuery(
  "SELECT * FROM appointments WHERE tenant_id=? AND date(scheduled_at)=?",
  ["mi-tenant-id", "2025-03-26"]
);
// Buscar "SEARCH appointments USING INDEX" en el output
```

---

### P6 — Actualizar Next.js (1-2 días, impacto menor)

```bash
npm install next@latest react@latest react-dom@latest
npm run build
# Corregir breaking changes si los hay
```

Next.js 15 trae:
- `use cache` directivo (más simple que `unstable_cache`)
- Partial Prerendering (PPR) para mezclar estático y dinámico
- Mejoras de performance en App Router sin cambios de código

---

## Resumen de archivos

| Archivo | Destino en el proyecto |
|---|---|
| `src/lib/db.ts` | Reemplaza tu db client actual |
| `src/lib/queries/dashboard.ts` | Nuevo — queries del dashboard en paralelo |
| `src/lib/queries/cached.ts` | Nuevo — wrappers con unstable_cache |
| `src/lib/queries/indexes.ts` | Nuevo — creación de índices SQL |
| `middleware.ts` | Reemplaza el middleware actual |
| `app/[tenant]/owner/dashboard/page.tsx` | Ejemplo de integración completa |

## Ganancia de tiempo estimada

| Escenario | Tiempo de respuesta |
|---|---|
| Actual (sin fixes) | ~1.5 – 2.5 s |
| Solo P1 + P2 | ~500 – 800 ms |
| P1 + P2 + P3 (caché warm) | ~80 – 200 ms |
| P1 + P2 + P3 + P4 + P5 | ~60 – 150 ms |
