import Link from "next/link";

import { PlatformShell, formatPlatformCurrency } from "@/components/platform-shell";
import { requirePlatformSession } from "@/lib/platform-auth";
import { listPlatformTenants } from "@/repositories/platform";

export default async function PlatformTenantsPage() {
  const session = await requirePlatformSession();
  const tenants = await listPlatformTenants();

  return (
    <PlatformShell
      session={session}
      title="Tenants"
      description="Listado global read-only de negocios registrados en la plataforma."
    >
      <section className="card stack" style={{ gap: 18, padding: 24 }}>
        <div className="header-row">
          <div>
            <span className="eyebrow">Directorio SaaS</span>
            <h2 style={{ fontSize: "1.5rem" }}>Negocios</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {session.role === "platform_admin" ? <Link className="btn" href="/platform/tenants/new">Crear tenant</Link> : null}
            <span className="status-pill">{tenants.length} tenants</span>
          </div>
        </div>

        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>SaaS</th>
                <th>Setup</th>
                <th>Turnos</th>
                <th>Cobrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <div className="admin-table__service">
                      <strong>{tenant.name}</strong>
                      <small>{tenant.slug}</small>
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__service">
                      <strong>{tenant.company_email || "Sin email"}</strong>
                      <small>{tenant.company_phone || "Sin telefono"}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-table__badge ${tenant.is_active ? "is-active" : "is-inactive"}`}>
                      {tenant.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table__service">
                      <strong>{tenant.plan}</strong>
                      <small>{tenant.status} · {tenant.billing_status}</small>
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__service">
                      <strong>{tenant.services_count} servicios</strong>
                      <small>{tenant.barbers_count} barberos, {tenant.users_count} usuarios</small>
                    </div>
                  </td>
                  <td>{tenant.appointments_count}</td>
                  <td>{formatPlatformCurrency(tenant.approved_revenue)}</td>
                  <td><Link className="btn-secondary" href={`/platform/tenants/${tenant.id}`}>Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PlatformShell>
  );
}
