import { redirect } from "next/navigation";

import { AdminPageShell, Link, buildAdminPath, formatCurrency, getAdminPageData, getRoleBadgeStyle } from "./_shared";

export default async function OwnerDashboardHomePage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string; notice?: string; date?: string; section?: string; barberId?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;

  if (search.section && search.section !== "overview") {
    const legacyPathBySection: Record<string, string> = {
      appointments: buildAdminPath(slug, "appointments", { date: search.date, barberId: search.barberId, error: search.error, notice: search.notice }),
      services: buildAdminPath(slug, "services", { date: search.date, error: search.error, notice: search.notice }),
      company: buildAdminPath(slug, "company", { date: search.date, error: search.error, notice: search.notice }),
      analytics: buildAdminPath(slug, "analytics", { date: search.date, error: search.error, notice: search.notice })
    };

    const target = legacyPathBySection[search.section];
    if (target) {
      redirect(target);
    }
  }

  const data = await getAdminPageData(slug, search);

  return (
    <AdminPageShell
      tenantName={data.tenant.tenantName}
      session={data.session}
      eyebrow="Centro de administracion"
      description="Elegí un módulo para gestionar turnos, servicios, configuración y análisis de la empresa."
      error={data.error}
      notice={data.notice}
    >
      <section className="stack" style={{ gap: 20 }}>
        <section className="grid cols-2" style={{ gap: 24 }}>
          <Link
            href={buildAdminPath(slug, "appointments", { date: data.scheduleDate })}
            className="card stack admin-home-card"
            style={{ padding: 28, gap: 18 }}
          >
            <span className="eyebrow">Turnos</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ fontSize: "1.8rem" }}>Gestion de turnos</h3>
              <p className="muted">Agenda del día dividida por barbero, cambios de estado y seguimiento operativo.</p>
            </div>
            <div className="header-row" style={{ alignItems: "end" }}>
              <div className="stack" style={{ gap: 2 }}>
                <small className="muted">Turnos del dia</small>
                <strong style={{ fontSize: "2.4rem" }}>{data.analytics.appointments.today_appointments}</strong>
              </div>
              <span className="status-pill">Abrir modulo</span>
            </div>
          </Link>

          <Link
            href={buildAdminPath(slug, "services", { date: data.scheduleDate })}
            className="card stack admin-home-card"
            style={{ padding: 28, gap: 18 }}
          >
            <span className="eyebrow">Servicios</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ fontSize: "1.8rem" }}>Gestion de servicios</h3>
              <p className="muted">Altas, edición, archivo y marcación de promociones con formato diferencial.</p>
            </div>
            <div className="header-row" style={{ alignItems: "end" }}>
              <div className="stack" style={{ gap: 2 }}>
                <small className="muted">Servicios activos</small>
                <strong style={{ fontSize: "2.4rem" }}>{data.services.filter((service) => service.is_active).length}</strong>
              </div>
              <span className="status-pill">{data.services.filter((service) => service.is_promotion && service.is_active).length} promos</span>
            </div>
          </Link>

          <Link
            href={buildAdminPath(slug, "company", { date: data.scheduleDate })}
            className="card stack admin-home-card"
            style={{ padding: 28, gap: 18 }}
          >
            <span className="eyebrow">Empresa</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ fontSize: "1.8rem" }}>Datos de la empresa</h3>
              <p className="muted">Configuración del tenant, barberos, horarios, medios de cobro, Mercado Pago y usuarios internos.</p>
            </div>
            <div className="header-row" style={{ alignItems: "end" }}>
              <div className="stack" style={{ gap: 2 }}>
                <small className="muted">Barberos cargados</small>
                <strong style={{ fontSize: "2.4rem" }}>{data.barbers.length}</strong>
              </div>
              <span className="status-pill">{data.canEditUsers ? `${data.users.length} usuarios` : "Solo lectura"}</span>
            </div>
          </Link>

          <Link
            href={buildAdminPath(slug, "analytics", { date: data.scheduleDate })}
            className="card stack admin-home-card"
            style={{ padding: 28, gap: 18 }}
          >
            <span className="eyebrow">Analisis</span>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ fontSize: "1.8rem" }}>Analisis del negocio</h3>
              <p className="muted">Lectura rápida de rendimiento, cobros, ausencias, cancelaciones y actividad general.</p>
            </div>
            <div className="header-row" style={{ alignItems: "end" }}>
              <div className="stack" style={{ gap: 2 }}>
                <small className="muted">Cobrado</small>
                <strong style={{ fontSize: "2.1rem" }}>{formatCurrency(data.analytics.payments.paid_revenue)}</strong>
              </div>
              <span className="status-pill" style={getRoleBadgeStyle(true)}>{data.analytics.queue.active_queue} en fila</span>
            </div>
          </Link>
        </section>
      </section>
    </AdminPageShell>
  );
}
