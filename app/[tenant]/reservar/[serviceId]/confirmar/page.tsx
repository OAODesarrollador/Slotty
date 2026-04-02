import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTenantBySlug } from "@/lib/tenant";
import { formatCurrency, formatDateTime } from "@/lib/time";
import { listBarbersForService } from "@/repositories/barbers";
import { getServiceById } from "@/repositories/services";

export default async function ConfirmPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string; serviceId: string }>;
  searchParams: Promise<{ barberId?: string; start?: string; error?: string }>;
}) {
  const { tenant: slug, serviceId } = await params;
  const search = await searchParams;
  const tenant = await requireTenantBySlug(slug);
  const service = await getServiceById(tenant.tenantId, serviceId);

  if (!service || !search.barberId || !search.start) {
    notFound();
  }

  const barbers = await listBarbersForService(tenant.tenantId, serviceId);
  const barber = barbers.find((item) => item.id === search.barberId);

  if (!barber) {
    notFound();
  }

  return (
    <main className="page">
      <section className="shell shadow-2xl">
        <section className="summary stack" style={{ padding: "40px" }}>
          <div className="header-row">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow" style={{ letterSpacing: "4px" }}>REVISIÓN FINAL</span>
              <h1 style={{ fontSize: "2.8rem" }}>Verificá los detalles de tu experiencia</h1>
            </div>
          </div>

          {search.error ? (
            <div className="notice error" style={{ borderRadius: "16px", padding: "20px", background: "rgba(255, 127, 127, 0.1)", border: "1px solid var(--danger)" }}>
              <strong>Lo sentimos:</strong> Este horario ya no está disponible. Alguien más ha reservado esta franja hace unos instantes. Por favor, seleccioná una nueva opción.
            </div>
          ) : (
            <p className="muted" style={{ fontSize: "1.1rem", maxWidth: "600px" }}>
              Estás a un paso de confirmar tu cita. Por favor, aseguráte de que todos los datos sean correctos antes de proceder al checkout seguro.
            </p>
          )}

          <div className="grid cols-2" style={{ gap: "24px", marginTop: "20px" }}>
            <div className="card" style={{ background: "rgba(255, 255, 255, 0.02)", display: "flex", flexDirection: "column", gap: "8px", padding: "32px" }}>
              <span className="eyebrow" style={{ color: "var(--muted)", fontSize: "0.65rem" }}>SERVICIO SELECCIONADO</span>
              <strong style={{ fontSize: "1.4rem" }}>{service.name}</strong>
              <span className="muted">{service.duration_minutes} minutos de atención dedicada</span>
            </div>
            
            <div className="card" style={{ background: "rgba(255, 255, 255, 0.02)", display: "flex", flexDirection: "column", gap: "8px", padding: "32px" }}>
              <span className="eyebrow" style={{ color: "var(--muted)", fontSize: "0.65rem" }}>PROFESIONAL A CARGO</span>
              <strong style={{ fontSize: "1.4rem" }}>{barber.full_name}</strong>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--accent)" }}>★★★★★</span>
                <small className="muted">{Number(barber.rating).toFixed(1)} Rating de distinción</small>
              </div>
            </div>

            <div className="card" style={{ background: "rgba(255, 255, 255, 0.02)", display: "flex", flexDirection: "column", gap: "8px", padding: "32px" }}>
              <span className="eyebrow" style={{ color: "var(--muted)", fontSize: "0.65rem" }}>AGENDA Y HORARIO</span>
              <strong style={{ fontSize: "1.4rem" }}>{formatDateTime(search.start, tenant.timezone)}</strong>
              <span className="muted">Zona horaria: {tenant.timezone.replace("_", " ")}</span>
            </div>

            <div className="card" style={{ background: "rgba(255, 255, 255, 0.02)", display: "flex", flexDirection: "column", gap: "8px", padding: "32px", border: "1px solid var(--line-strong)" }}>
              <span className="eyebrow" style={{ color: "var(--muted)", fontSize: "0.65rem" }}>INVERSIÓN TOTAL</span>
              <span className="price-tag" style={{ fontSize: "2.2rem" }}>{formatCurrency(service.price)}</span>
              <small className="muted">IVA e impuestos de servicio incluidos</small>
            </div>
          </div>

          <div className="card" style={{ background: "rgba(245, 200, 66, 0.03)", border: "1px solid var(--line)", marginTop: "12px", display: "flex", gap: "16px", alignItems: "center" }}>
             <div style={{ color: "var(--accent)" }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
             </div>
             <p className="muted" style={{ fontSize: "0.9rem", margin: 0 }}>
               <strong>Política de Transparencia:</strong> Calculamos automáticamente el depósito de seña y los saldos pendientes para asegurar tu lugar en la agenda de {tenant.tenantName}.
             </p>
          </div>

          <div className="actions" style={{ display: "flex", gap: "20px", marginTop: "40px" }}>
            <Link
              className="btn"
              href={`/${slug}/reservar/${serviceId}/pago?barberId=${search.barberId}&start=${encodeURIComponent(search.start)}`}
              style={{ padding: "0 60px", height: "64px", fontSize: "1.1rem" }}
            >
              Proceder al Checkout Seguro
            </Link>
            <Link className="btn-secondary" href={`/${slug}/reservar/${serviceId}`} style={{ border: "1px solid rgba(255,255,255,0.1)", background: "transparent" }}>
              Cambiar horario
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
