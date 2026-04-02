import Link from "next/link";

import { MobileDock } from "@/components/mobile-dock";
import { requireTenantBySlug } from "@/lib/tenant";
import { formatCurrency, formatDateTime } from "@/lib/time";
import { listAvailabilityOptions } from "@/services/availability";

export default async function AvailabilityPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string; serviceId: string }>;
  searchParams: Promise<{ barberId?: string }>;
}) {
  const { tenant: slug, serviceId } = await params;
  const search = await searchParams;
  const tenant = await requireTenantBySlug(slug);
  const { service, options } = await listAvailabilityOptions(tenant, serviceId, search.barberId);

  return (
    <>
      <main className="page">
        <section className="shell">
          <section className="card stack">
            <div className="header-row">
              <div>
                <span className="eyebrow">Staff Booking</span>
                <h1>{service.name}</h1>
              </div>
              <Link className="btn-ghost" href={`/${slug}/reservar`}>
                Volver
              </Link>
            </div>
            <div className="filter-row">
              <span className="chip active">Cualquiera</span>
              <span className="chip">Mas temprano</span>
              <span className="chip">Mejor valorado</span>
            </div>
            <div className="list">
              {options.length > 0 ? (
                options.map((slot) => (
                  <Link
                    key={`${slot.barberId}-${slot.start}`}
                    href={`/${slug}/reservar/${service.id}/confirmar?barberId=${slot.barberId}&start=${encodeURIComponent(slot.start)}`}
                    className="slot-card"
                  >
                    <div className="slot-top">
                      <span className="time-pill">{slot.label}</span>
                      <span className="price-tag">{formatCurrency(service.price)}</span>
                    </div>
                    <strong>{slot.barberName}</strong>
                    <small>{slot.barberRating.toFixed(1)} · {service.duration_minutes} min</small>
                    <small>{formatDateTime(slot.start, tenant.timezone)}</small>
                  </Link>
                ))
              ) : (
                <div className="notice">
                  No hay turnos para hoy. Podes revisar manana o sumarte a la fila.
                </div>
              )}
            </div>
            <div className="actions">
              <Link className="btn-secondary" href={`/${slug}/fila`}>
                Sumarme a la fila
              </Link>
            </div>
          </section>
        </section>
      </main>
      <MobileDock tenantSlug={slug} active="availability" />
    </>
  );
}
