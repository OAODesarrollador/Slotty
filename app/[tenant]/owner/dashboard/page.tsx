import { requireSessionForTenant } from "@/lib/auth";
import { requireTenantBySlug } from "@/lib/tenant";
import { formatDateTime } from "@/lib/time";
import { listOwnerAppointments } from "@/repositories/appointments";
import { listQueueEntries } from "@/repositories/queue";
import Link from "next/link";

export default async function OwnerDashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await requireTenantBySlug(slug);
  await requireSessionForTenant(slug);

  const [appointments, queue] = await Promise.all([
    listOwnerAppointments(tenant.tenantId),
    listQueueEntries(tenant.tenantId)
  ]);

  return (
    <main className="page" style={{ padding: "60px 40px" }}>
      <header className="stack" style={{ gap: "12px", marginBottom: "60px" }}>
        <span className="eyebrow" style={{ letterSpacing: "4px" }}>CENTRO DE OPERACIONES</span>
        <div className="header-row">
            <h1 style={{ fontSize: "3rem" }}>{tenant.tenantName}</h1>
            <div style={{ display: "flex", gap: "12px" }}>
                <Link href={`/${slug}`} className="btn-secondary">Vista Pública</Link>
                <div className="status-pill" style={{ background: "rgba(104, 208, 161, 0.1)", color: "var(--success)", borderColor: "rgba(104, 208, 161, 0.2)" }}>
                   Sistema Activo
                </div>
            </div>
        </div>
      </header>

      <section className="grid cols-3" style={{ marginBottom: "60px" }}>
        <div className="card stack shadow-lg" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line-strong)", padding: "32px", position: "relative", overflow: "hidden" }}>
          <span className="eyebrow" style={{ fontSize: "0.65rem", opacity: 0.6 }}>TURNOS TOTALES</span>
          <h2 style={{ fontSize: "3.5rem", marginTop: "12px", fontWeight: "900" }}>{appointments.length}</h2>
          <small className="muted">Activos en la agenda actual</small>
        </div>
        <div className="card stack shadow-lg" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line-strong)", padding: "32px", position: "relative", overflow: "hidden" }}>
          <span className="eyebrow" style={{ fontSize: "0.65rem", opacity: 0.6 }}>FILA VIRTUAL</span>
          <h2 style={{ fontSize: "3.5rem", marginTop: "12px", fontWeight: "900", color: "var(--accent)" }}>{queue.length}</h2>
          <small className="muted">Clientes esperando asignación</small>
        </div>
        <div className="card stack shadow-lg" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--line-strong)", padding: "32px", position: "relative", overflow: "hidden" }}>
          <span className="eyebrow" style={{ fontSize: "0.65rem", opacity: 0.6 }}>TIPO DE GESTIÓN</span>
          <h2 style={{ fontSize: "1.8rem", marginTop: "34px", fontWeight: "900" }}>Full Multitenant</h2>
          <small className="muted">Plan Platinum Edition</small>
        </div>
      </section>

      <div className="grid cols-2" style={{ gap: "40px" }}>
        <article className="card stack" style={{ background: "rgba(0, 0, 0, 0.2)", minHeight: "500px" }}>
          <div className="header-row">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">AGENDA PRÓXIMA</span>
              <h3 style={{ fontSize: "1.4rem" }}>Últimos turnos agendados</h3>
            </div>
            <span className="status-pill">{appointments.length} registros</span>
          </div>
          
          <div style={{ marginTop: "24px" }}>
            {appointments.length > 0 ? (
                <div className="list" style={{ gap: "12px" }}>
                    {appointments.slice(0, 10).map((app) => (
                        <div key={app.id} className="service-card" style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", alignItems: "center", padding: "20px" }}>
                            <div className="stack" style={{ gap: 2 }}>
                                <strong style={{ color: "var(--accent)" }}>{new Date(app.datetime_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                <small style={{ fontSize: "0.65rem", textTransform: "uppercase" }}>{new Date(app.datetime_start).toLocaleDateString()}</small>
                            </div>
                            <div className="stack" style={{ gap: 2 }}>
                                <strong>{app.customer_name}</strong>
                                <small className="muted">{app.service_name} con {app.barber_name}</small>
                            </div>
                            <span className="status-pill" style={{ fontSize: "0.7rem", padding: "4px 10px" }}>{app.status}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: "100px", color: "var(--muted)" }}>
                    No hay turnos registrados aún.
                </div>
            )}
          </div>
        </article>

        <article className="card stack" style={{ background: "rgba(0, 0, 0, 0.2)", minHeight: "500px" }}>
          <div className="header-row">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">FILA EN TIEMPO REAL</span>
              <h3 style={{ fontSize: "1.4rem" }}>Clientes esperando atención</h3>
            </div>
            <span className="status-pill" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>{queue.length} en espera</span>
          </div>

          <div style={{ marginTop: "24px" }}>
            {queue.length > 0 ? (
                <div className="list" style={{ gap: "12px" }}>
                    {queue.map((entry) => (
                        <div key={entry.id} className="service-card" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "20px" }}>
                            <div className="stack" style={{ gap: 2 }}>
                                <strong>{entry.customer_name}</strong>
                                <small className="muted">{entry.service_name} • {entry.barber_name ?? "Cualquier Profesional"}</small>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <span className="status-pill" style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--line)" }}>{entry.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: "100px", color: "var(--muted)" }}>
                    La fila está vacía por el momento.
                </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
