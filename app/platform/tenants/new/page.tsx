import Link from "next/link";

import { PlatformShell } from "@/components/platform-shell";
import { requirePlatformRole } from "@/lib/platform-auth";

export default async function PlatformNewTenantPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await requirePlatformRole(["platform_admin"]);
  const search = await searchParams;

  return (
    <PlatformShell
      session={session}
      title="Crear tenant"
      description="Alta global de un negocio SaaS con owner inicial. No modifica flujos de reservas existentes."
      error={search.error}
      notice={search.notice}
    >
      <section className="card stack" style={{ gap: 20, padding: 24 }}>
        <form method="post" action="/api/platform/tenants" className="stack" style={{ gap: 20 }}>
          <div>
            <span className="eyebrow">Negocio</span>
            <h2 style={{ fontSize: "1.5rem" }}>Datos base</h2>
          </div>

          <div className="grid cols-2" style={{ gap: 14 }}>
            <label>Nombre<input name="name" required /></label>
            <label>Slug<input name="slug" placeholder="mi-barberia" required /></label>
            <label>Email empresa<input name="companyEmail" type="email" /></label>
            <label>Teléfono empresa<input name="companyPhone" /></label>
            <label>Dirección<input name="address" /></label>
            <label>Zona horaria<input name="timezone" defaultValue="America/Argentina/Buenos_Aires" required /></label>
            <label>Estado
              <select name="status" defaultValue="trial">
                <option value="trial">Trial</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </label>
            <label>Plan
              <select name="plan" defaultValue="starter">
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label>Billing
              <select name="billingStatus" defaultValue="ok">
                <option value="ok">OK</option>
                <option value="pending">Pendiente</option>
                <option value="overdue">Vencido</option>
              </select>
            </label>
          </div>

          <div>
            <span className="eyebrow">Owner inicial</span>
            <h2 style={{ fontSize: "1.5rem" }}>Acceso del negocio</h2>
          </div>

          <div className="grid cols-2" style={{ gap: 14 }}>
            <label>Nombre owner<input name="ownerDisplayName" required /></label>
            <label>Email owner<input name="ownerEmail" type="email" required /></label>
            <label>Contraseña<input name="ownerPassword" type="password" required /></label>
            <label>Repetir contraseña<input name="ownerPasswordConfirm" type="password" required /></label>
          </div>

          <div className="admin-modal__footer">
            <Link className="btn-secondary" href="/platform/tenants">Cancelar</Link>
            <button type="submit" className="btn">Crear tenant</button>
          </div>
        </form>
      </section>
    </PlatformShell>
  );
}
