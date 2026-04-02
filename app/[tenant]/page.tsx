import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MobileDock } from "@/components/mobile-dock";
import { NavHeader } from "@/components/nav-header";
import { requireTenantBySlug } from "@/lib/tenant";
import { formatCurrency } from "@/lib/time";
import { listPublicServices } from "@/repositories/services";
import { listAvailabilityOptions } from "@/services/availability";

export default async function TenantHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await requireTenantBySlug(slug);
  const services = await listPublicServices(tenant.tenantId);
  const firstService = services[0];
  const availability = firstService
    ? await listAvailabilityOptions(tenant, firstService.id).catch(() => ({ options: [] as never[] }))
    : { options: [] as never[] };

  if (!tenant) {
    notFound();
  }

  return (
    <>
      <main className="page">
        <section className="stack">
            <article className="hero">
              <div className="hero-media">
                <Image
                  src="/barbero.png"
                  alt="Interior de barberia"
                  fill
                  priority
                  className="hero-image"
                  sizes="(max-width: 920px) 100vw, 80vw"
                />
                <div className="hero-shade" />
                <div className="hero-glow" />
              </div>
              <div className="stack" style={{ position: "relative", zIndex: 10 }}>
                <span className="eyebrow">{tenant.tenantName}</span>
                <h1 className="hero-title">Reserva tu cita con los mejores expertos</h1>
                <p className="muted" style={{ maxWidth: "500px" }}>
                  Experiencia visual premium. Agenda tu turno de forma rápida, segura y profesional desde cualquier dispositivo.
                </p>
                <div className="actions" style={{ marginTop: "12px" }}>
                  <Link className="btn" href={`/${slug}/reservar`}>
                    Reservar ahora
                  </Link>
                  <Link className="btn-secondary" href={`/${slug}/fila`}>
                    Fila virtual
                  </Link>
                </div>
              </div>
            </article>

            <aside className="card">
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "space-around", alignItems: "center" }}>
                <div className="stack" style={{ gap: 8, textAlign: "center", flex: 1 }}>
                  <span className="eyebrow" style={{ color: "var(--muted)" }}>Disponibilidad</span>
                  <strong style={{ fontSize: "1.2rem" }}>Hoy disponible</strong>
                  <small className="muted">+10 huecos libres</small>
                </div>
                <div style={{ width: "1px", height: "40px", background: "var(--line)", opacity: 0.5 }} />
                <div className="stack" style={{ gap: 8, textAlign: "center", flex: 1 }}>
                  <span className="eyebrow" style={{ color: "var(--muted)" }}>Calificación</span>
                  <strong style={{ fontSize: "1.2rem" }}>4.9 / 5.0</strong>
                  <small className="muted">Basado en +200 reseñas</small>
                </div>
              </div>
            </aside>

          <section className="grid cols-2">
            <article className="card stack">
              <div className="header-row">
                <div className="stack" style={{ gap: 4 }}>
                  <span className="eyebrow">Menú de servicios</span>
                  <h2>Servicios destacados</h2>
                </div>
                <Link className="btn-ghost" href={`/${slug}/reservar`}>
                  Ver todos
                </Link>
              </div>
              <div className="list">
                {services.slice(0, 4).map((service) => (
                  <Link key={service.id} href={`/${slug}/reservar/${service.id}`} className="service-card">
                    <div className="service-top">
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{service.name}</strong>
                        <small>{service.duration_minutes} min · {service.description ?? "Calidad asegurada"}</small>
                      </div>
                      <span className="price-tag">{formatCurrency(service.price)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </article>

            <article className="card stack">
              <div className="header-row">
                <div className="stack" style={{ gap: 4 }}>
                  <span className="eyebrow">Agenda rápida</span>
                  <h2>Turnos recomendados</h2>
                </div>
                {firstService ? (
                  <Link className="btn-ghost" href={`/${slug}/reservar/${firstService.id}`}>
                    Ver agenda
                  </Link>
                ) : null}
              </div>
              <div className="list">
                {availability.options.length > 0 ? (
                  availability.options.slice(0, 3).map((slot) => (
                    <Link key={`${slot.barberId}-${slot.start}`} href={`/${slug}/reservar/${firstService?.id}`} className="slot-card">
                      <div className="service-top">
                        <div className="stack" style={{ gap: 4 }}>
                          <span className="time-pill">{slot.label}</span>
                          <strong>{slot.barberName}</strong>
                        </div>
                        <span className="status-pill">Libre</span>
                      </div>
                      <small>Sugerido según tu preferencia habitual</small>
                    </Link>
                  ))
                ) : (
                  <div className="notice">No hay turnos sugeridos en este momento.</div>
                )}
              </div>
            </article>
          </section>

          <section className="grid cols-2">
            <article className="card stack" style={{ border: "1px solid var(--line-strong)", background: "rgba(245, 200, 66, 0.02)" }}>
              <span className="eyebrow">Walk-In</span>
              <h2>Cola en tiempo real</h2>
              <p className="muted">
                ¿Estás cerca? Súmate a nuestra fila virtual y te avisamos cuando sea tu turno. Sin esperas innecesarias en el local.
              </p>
              <div className="actions">
                <Link className="btn" href={`/${slug}/fila`}>
                  Súmate a la fila
                </Link>
              </div>
            </article>

            <article className="card stack">
              <span className="eyebrow">Feedback</span>
              <h2>Tu opinión cuenta</h2>
              <p className="muted">
                Para nosotros lo más importante es que te vayas conforme. Ayúdanos a mejorar calificando tu última experiencia.
              </p>
              <div className="actions">
                <Link className="btn-secondary" href={`/${slug}/reservar`}>
                  Reservar de nuevo
                </Link>
              </div>
            </article>
          </section>
        </section>
      </main>
      <MobileDock tenantSlug={slug} active="home" />
    </>
  );
}
