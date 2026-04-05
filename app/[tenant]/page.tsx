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
        <section className="stack shell-center" style={{ gap: "40px" }}>
            <article className="hero" style={{ padding: "30px 40px" }}>
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
              <div className="stack" style={{ position: "relative", zIndex: 10, gap: "24px" }}>
                <span className="eyebrow" style={{ color: "var(--accent)" }}>{tenant.tenantName} · Professional Care</span>
                <h1 className="hero-title">Elevá tu estilo con manos expertas</h1>
                <p className="page-lead" style={{ color: "rgba(255,255,255,0.7)", maxWidth: "540px" }}>
                  Un refugio de sofisticación donde la tradición se encuentra con la tendencia. 
                  Reservá tu espacio de distinción de forma instantánea.
                </p>
                <div className="actions" style={{ marginTop: "8px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <Link className="btn" href={`/${slug}/reservar`} style={{ minWidth: "200px" }}>
                    Reservar Turno
                  </Link>
                  <Link className="btn-secondary" href={`/${slug}/fila`} style={{ minWidth: "200px" }}>
                    Fila Virtual
                  </Link>
                </div>
              </div>
            </article>
            
          <aside className="card" style={{ padding: "24px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "24px", alignItems: "center", textAlign: "center" }}>
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.7 }}>Disponibilidad</span>
                <strong style={{ fontSize: "1.4rem", color: "var(--success)" }}>Hoy Libre</strong>
                <small className="muted" style={{ fontWeight: 600 }}>+15 huecos disponibles</small>
              </div>
              <div style={{ width: "1px", height: "40px", background: "var(--line)", opacity: 0.5, margin: "0 auto" }} className="mobile-hide" />
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.7 }}>Excelente Servicio</span>
                <strong style={{ fontSize: "1.4rem", color: "var(--accent)" }}>4.9 / 5.0</strong>
                <small className="muted" style={{ fontWeight: 600 }}>+250 reseñas positivas</small>
              </div>
              <div style={{ width: "1px", height: "40px", background: "var(--line)", opacity: 0.5, margin: "0 auto" }} className="mobile-hide" />
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.7 }}>Ubicación</span>
                <strong style={{ fontSize: "1.4rem" }}>Centro</strong>
                <small className="muted" style={{ fontWeight: 600 }}>Fácil acceso y parking</small>
              </div>
            </div>
          </aside>

          <section className="grid cols-2" style={{ gap: "24px" }}>
            <article className="card stack" style={{ 
              background: "linear-gradient(135deg, rgba(245, 200, 66, 0.05), rgba(0,0,0,0))", 
              border: "1px solid var(--line-strong)"
            }}>
              <span className="eyebrow">No esperes más</span>
              <h2 style={{ fontSize: "2.2rem" }}>Fila Virtual</h2>
              <p className="page-lead" style={{ fontSize: "1rem" }}>
                ¿Cerca del local? Súmate a nuestra tecnología de fila en tiempo real y optimizá tu tiempo. Te avisamos por WhatsApp.
              </p>
              <div className="actions" style={{ marginTop: "12px" }}>
                <Link className="btn" href={`/${slug}/fila`} style={{ width: "100%" }}>
                  Súmate a la Fila de Hoy
                </Link>
              </div>
            </article>

            <article className="card stack">
              <span className="eyebrow">Experiencia Garantizada</span>
              <h2 style={{ fontSize: "2.2rem" }}>Tu opinión importa</h2>
              <p className="page-lead" style={{ fontSize: "1rem" }}>
                Buscamos la excelencia en cada corte. Si ya te atendiste, calificá tu experiencia y ayúdanos a seguir mejorando.
              </p>
              <div className="actions" style={{ marginTop: "12px" }}>
                <Link className="btn-secondary" href={`/${slug}/reservar`} style={{ width: "100%" }}>
                  Compartir Feedback
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


