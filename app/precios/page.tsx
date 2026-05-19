import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageBrand } from "@/components/seo-page-brand";

export const metadata: Metadata = {
  title: "Precios",
  description: "Planes de Dibok para barberías y negocios de servicios que necesitan reservas online, agenda y fila virtual.",
  alternates: {
    canonical: "/precios"
  },
  openGraph: {
    title: "Precios | Dibok",
    description: "Planes para gestionar reservas online, agenda y fila virtual.",
    url: "https://dibok.app/precios"
  }
};

export default function PreciosPage() {
  return (
    <main className="page" style={{ paddingTop: '120px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px' }}>
        
        <section style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <SeoPageBrand />
          <span className="eyebrow" style={{ marginTop: '20px' }}>Precios Transparentes</span>
          <h1 style={{ fontSize: "clamp(3rem, 8vw, 5rem)", lineHeight: 1, maxWidth: '900px' }}>
            Planes diseñados para<br/>escalar tu negocio
          </h1>
          <p className="page-lead" style={{ maxWidth: '640px', fontSize: '1.25rem', color: 'var(--muted)' }}>
            Dibok se adapta a negocios que necesitan empezar con agenda online y escalar hacia pagos, fila virtual y gestión multiusuario.
          </p>
        </section>

        <div className="grid cols-3" style={{ gap: '32px', alignItems: 'stretch' }}>
          <article className="shell stack" style={{ position: 'relative', overflow: 'hidden', padding: '48px 32px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Starter</h2>
              <p className="muted" style={{ minHeight: '48px' }}>Para empezar a recibir turnos online y ordenar servicios.</p>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '24px 0' }}>
              Consultar
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text)' }}>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon /> Agenda online básica
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon /> Perfil público de reserva
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon /> Hasta 2 barberos
              </li>
            </ul>
            <Link className="btn-secondary" href="/" style={{ width: '100%', marginTop: 'auto' }}>Consultar plan</Link>
          </article>

          <article className="shell stack" style={{ position: 'relative', overflow: 'hidden', padding: '48px 32px', borderColor: 'var(--accent)', transform: 'scale(1.05)', zIndex: 10, boxShadow: '0 32px 80px rgba(245, 200, 66, 0.15)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent)' }} />
            <div style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(245, 200, 66, 0.15)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Popular</div>
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--accent)' }}>Pro</h2>
              <p className="muted" style={{ minHeight: '48px' }}>Para operar agenda, pagos configurables y fila virtual.</p>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '24px 0', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              Consultar
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text)' }}>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon color="var(--accent)" /> Todo lo de Starter
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon color="var(--accent)" /> Fila virtual en tiempo real
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon color="var(--accent)" /> Integración Mercado Pago
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon color="var(--accent)" /> Barberos ilimitados
              </li>
            </ul>
            <Link className="btn" href="/" style={{ width: '100%', marginTop: 'auto' }}>Consultar plan</Link>
          </article>

          <article className="shell stack" style={{ position: 'relative', overflow: 'hidden', padding: '48px 32px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Enterprise</h2>
              <p className="muted" style={{ minHeight: '48px' }}>Para operación avanzada, franquicias y configuración a medida.</p>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '30px 0' }}>
              Consultar
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text)' }}>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon /> Todo lo de Pro
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon /> Panel multi-sucursal
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon /> Soporte prioritario
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckIcon /> Onboarding dedicado
              </li>
            </ul>
            <Link className="btn-secondary" href="/para-barberias" style={{ width: '100%', marginTop: 'auto' }}>Consultar a medida</Link>
          </article>
        </div>
      </div>
    </main>
  );
}

function CheckIcon({ color = "var(--success)" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
