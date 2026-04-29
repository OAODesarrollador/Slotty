import { AdminPageShell, formatCurrency, getAdminPageData } from "../_shared";

export default async function OwnerAnalyticsPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ date?: string; error?: string; notice?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const data = await getAdminPageData(slug, search);

  return (
    <AdminPageShell
      tenantName={data.tenant.tenantName}
      session={data.session}
      eyebrow="Analisis"
      description="Metricas, rendimiento y lectura operativa del tenant."
      error={data.error}
      notice={data.notice}
    >
      <section className="stack" style={{ gap: 20 }}>
        <article className="grid cols-3" style={{ gap: 16 }}>
          <div className="card stack" style={{ padding: 24 }}>
            <small className="muted">Turnos completados</small>
            <strong style={{ fontSize: "2.2rem" }}>{data.analytics.appointments.completed_appointments}</strong>
          </div>
          <div className="card stack" style={{ padding: 24 }}>
            <small className="muted">Cancelados</small>
            <strong style={{ fontSize: "2.2rem" }}>{data.analytics.appointments.cancelled_appointments}</strong>
          </div>
          <div className="card stack" style={{ padding: 24 }}>
            <small className="muted">No show</small>
            <strong style={{ fontSize: "2.2rem" }}>{data.analytics.appointments.no_show_appointments}</strong>
          </div>
        </article>

        <article className="card stack" style={{ padding: 24, gap: 18 }}>
          <div className="header-row">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">Rendimiento por barbero</span>
              <h2 style={{ fontSize: "1.45rem" }}>Estadisticas del tenant</h2>
            </div>
          </div>

          <div className="list" style={{ gap: 12 }}>
            {data.appointmentsByBarberSummary.map((item) => (
              <div key={item.barber_id} className="service-card" style={{ padding: 18 }}>
                <div className="header-row">
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{item.barber_name}</strong>
                    <small className="muted">{item.total_appointments} turnos | {item.completed_appointments} completados</small>
                  </div>
                  <strong>{formatCurrency(item.generated_revenue)}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AdminPageShell>
  );
}
