import { PlatformShell, formatPlatformCurrency } from "@/components/platform-shell";
import { requirePlatformSession } from "@/lib/platform-auth";
import { getPlatformDashboardSummary, listPlatformTenants } from "@/repositories/platform";

export default async function PlatformDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await requirePlatformSession();
  const search = await searchParams;
  const [summary, tenants] = await Promise.all([
    getPlatformDashboardSummary(),
    listPlatformTenants()
  ]);
  const recentTenants = tenants.slice(0, 5);

  return (
    <PlatformShell
      session={session}
      title="Plataforma Dibok"
      description="Capa interna independiente para operar tenants, salud operativa y métricas SaaS."
      error={search.error}
      notice={search.notice}
    >
      <section className="grid cols-4" style={{ gap: 16 }}>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Tenants activos</small>
          <strong style={{ fontSize: "2rem" }}>{summary.active_tenants}</strong>
          <span className="status-pill">{summary.total_tenants} totales</span>
        </div>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Inactivos</small>
          <strong style={{ fontSize: "2rem" }}>{summary.inactive_tenants}</strong>
          <span className="status-pill">estado operativo</span>
        </div>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Turnos hoy</small>
          <strong style={{ fontSize: "2rem" }}>{summary.today_appointments}</strong>
          <span className="status-pill">{summary.pending_payment_reviews} pagos a revisar</span>
        </div>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Cobrado aprobado</small>
          <strong style={{ fontSize: "2rem" }}>{formatPlatformCurrency(summary.approved_revenue)}</strong>
          <span className="status-pill">global</span>
        </div>
      </section>

      <section className="card stack" style={{ gap: 18, padding: 24 }}>
        <div className="header-row">
          <div>
            <span className="eyebrow">Tenants recientes</span>
            <h2 style={{ fontSize: "1.5rem" }}>Actividad de plataforma</h2>
          </div>
          <a className="btn-secondary" href="/platform/tenants">Ver todos</a>
        </div>
        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Estado</th>
                <th>Turnos</th>
                <th>Cobrado</th>
                <th>Pagos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <div className="admin-table__service">
                      <strong>{tenant.name}</strong>
                      <small>{tenant.slug}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-table__badge ${tenant.is_active ? "is-active" : "is-inactive"}`}>
                      {tenant.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{tenant.appointments_count}</td>
                  <td>{formatPlatformCurrency(tenant.approved_revenue)}</td>
                  <td>{tenant.mercado_pago_ready ? "MP listo" : "MP incompleto"}</td>
                  <td><a className="btn-secondary" href={`/platform/tenants/${tenant.id}`}>Ver</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PlatformShell>
  );
}
