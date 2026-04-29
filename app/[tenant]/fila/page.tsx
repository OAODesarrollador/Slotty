import Link from "next/link";

import { MobileDock } from "@/components/mobile-dock";
import { QueueEntryForm } from "@/components/queue-entry-form";
import { requireTenantBySlug } from "@/lib/tenant";
import { listBarbersForService } from "@/repositories/barbers";
import { listPublicServices } from "@/repositories/services";

export default async function QueuePage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const tenant = await requireTenantBySlug(slug);
  const services = await listPublicServices(tenant.tenantId);
  const barbersByServiceEntries = await Promise.all(
    services.map(async (service) => [service.id, await listBarbersForService(tenant.tenantId, service.id)] as const)
  );

  return (
    <>
      <main className="page">
        <section className="shell stack shell-center" style={{ gap: "35px", paddingTop: "0" }}>
          <div className="header-row">
            <div className="stack" style={{ gap: 8 }}>
              <span className="eyebrow">Fila Virtual</span>
              <h1 style={{ fontSize: "2.2rem" }}>Sumate a la fila sin esperar</h1>
              <p className="page-lead" style={{ fontSize: "0.95rem" }}>
                Elegí el servicio, entrá a la fila y listo. Seguís tu turno en tiempo real desde esta página.
              </p>
            </div>
            <Link className="btn-ghost" href={`/${slug}`}>
              Volver
            </Link>
          </div>

          <div className="notice" style={{ fontSize: "0.9rem", padding: "18px 20px", background: "rgba(255,255,255,0.03)", borderColor: "rgba(245, 200, 66, 0.14)" }}>
            <strong style={{ display: "block", marginBottom: 6, color: "var(--accent)" }}>Como funciona</strong>
            Entrás a la fila y podés seguir tu turno desde esta pantalla. Cuando falte poco, vas a verlo acá mismo.
          </div>

          <div className="notice" style={{ fontSize: "0.9rem", padding: "18px 20px", background: "rgba(255,255,255,0.03)", borderColor: "rgba(245, 200, 66, 0.14)" }}>
            Dejá esta pantalla abierta y te avisamos acá cuando te toque. Podés salir de la fila en cualquier momento.
          </div>

          <article className="stack" style={{ gap: 24 }}>
            {search.cancelled === "1" ? (
              <div className="notice" style={{ fontSize: "0.9rem" }}>
                Saliste de la fila. Si querés, podés volver a sumarte más tarde.
              </div>
            ) : null}
            {search.error ? <div className="notice error">{search.error}</div> : null}
            <QueueEntryForm
              tenantSlug={slug}
              services={services}
              barbersByService={Object.fromEntries(barbersByServiceEntries)}
            />
          </article>
        </section>
      </main>
      <MobileDock tenantSlug={slug} active="queue" />
    </>
  );
}
