import Link from "next/link";

import { MobileDock } from "@/components/mobile-dock";
import { requireTenantBySlug } from "@/lib/tenant";
import { formatCurrency } from "@/lib/time";
import { listPublicServices } from "@/repositories/services";

export default async function ServicesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await requireTenantBySlug(slug);
  const services = await listPublicServices(tenant.tenantId);

  return (
    <>
      <main className="page">
        <section className="shell">
          <section className="card stack">
            <div className="header-row">
              <div>
                <span className="eyebrow">Select Your Seat</span>
                <h1>¿Que queres reservar?</h1>
              </div>
              <Link className="btn-ghost" href={`/${slug}`}>
                Volver
              </Link>
            </div>
            <p className="page-lead muted">
              Selecciona rápido desde un catálogo visual compacto, con duración y precio destacados.
            </p>
            <div className="list">
              {services.map((service) => (
                <Link key={service.id} href={`/${slug}/reservar/${service.id}`} className="service-card">
                  <div className="service-top">
                    <div className="stack" style={{ gap: 6 }}>
                      <strong>{service.name}</strong>
                      <small>{service.description ?? "Servicio sin descripcion"}</small>
                    </div>
                    <span className="price-tag">{formatCurrency(service.price)}</span>
                  </div>
                  <div className="chip-row">
                    <span className="chip active">{service.duration_minutes} min</span>
                    <span className="chip">Reservar</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </section>
      </main>
      <MobileDock tenantSlug={slug} active="services" />
    </>
  );
}
