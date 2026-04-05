import Link from "next/link";
import Image from "next/image";

import { MobileDock } from "@/components/mobile-dock";
import { requireTenantBySlug } from "@/lib/tenant";
import { listPublicServices } from "@/repositories/services";

export default async function QueuePage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const tenant = await requireTenantBySlug(slug);
  const services = await listPublicServices(tenant.tenantId);

  return (
    <>
      <main className="page">
        <section className="shell-center">
          <aside className="card stack" style={{ background: "var(--bg-2)", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <div className="hero-media">
               <Image 
                src="/barbero.png" 
                alt="Queue visual" 
                fill 
                className="hero-image" 
                style={{ opacity: 0.4 }}
                sizes="(max-width: 920px) 100vw, 40vw"
              />
              <div className="hero-shade" />
            </div>
            <div className="stack" style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "20px" }}>
              <span className="eyebrow">Sin turno previo</span>
              <h2 style={{ fontSize: "2rem" }}>Cola Virtual Inteligente</h2>
              <p className="muted">
                Nuestro sistema de IA analiza la carga de trabajo actual y te asigna el primer espacio disponible automáticamente.
              </p>
              <div className="status-pill" style={{ marginTop: "20px" }}>
                Atención rápida garantizada
              </div>
            </div>
          </aside>

          <article className="form-shell stack">
            <div className="header-row">
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow">Join the line</span>
                <h1>Sumarme ahora</h1>
              </div>
              <Link className="btn-ghost" href={`/${slug}`}>
                Volver
              </Link>
            </div>
            
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Completa tus datos para entrar en la fila virtual. Recibirás una notificación cuando debas acercarte al local.
            </p>

            {search.error ? <div className="notice error">{search.error}</div> : null}
            
            <form method="post" action={`/api/public/${slug}/queue`} className="stack">
              <div className="grid cols-2" style={{ gap: "16px" }}>
                <label>
                  Nombre completo
                  <input name="fullName" placeholder="Ej: Juan Pérez" required />
                </label>
                <label>
                  WhatsApp / Teléfono
                  <input name="phone" placeholder="+54 9..." required />
                </label>
              </div>

              <label>
                Email (opcional)
                <input type="email" name="email" placeholder="tu@email.com" />
              </label>

              <label>
                Servicio deseado
                <select name="serviceId" required style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                  <option value="">Seleccionar un servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {service.duration_minutes} min
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ paddingTop: "12px" }}>
                <button className="btn" type="submit" style={{ width: "100%" }}>
                  Entrar en la fila virtual
                </button>
              </div>
              
              <p className="muted" style={{ fontSize: "0.75rem", textAlign: "center" }}>
                Al sumarte, aceptas nuestro sistema de turnos dinámico. 
                El tiempo de espera es una estimación.
              </p>
            </form>
          </article>
        </section>
      </main>
      <MobileDock tenantSlug={slug} active="queue" />
    </>
  );
}

