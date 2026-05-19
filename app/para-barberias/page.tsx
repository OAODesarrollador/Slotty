import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageBrand } from "@/components/seo-page-brand";

export const metadata: Metadata = {
  title: "Software para barberías",
  description: "Dibok ayuda a barberías a gestionar reservas online, agenda diaria, servicios, barberos y clientes desde una plataforma SaaS.",
  alternates: {
    canonical: "/para-barberias"
  },
  openGraph: {
    title: "Software para barberías | Dibok",
    description: "Reservas online, agenda y gestión operativa para barberías.",
    url: "https://dibok.app/para-barberias"
  }
};

export default function ParaBarberiasPage() {
  return (
    <main className="page" style={{ paddingTop: '120px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '100px' }}>
        
        <section style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <SeoPageBrand />
          <span className="eyebrow" style={{ marginTop: '20px' }}>Software de Gestión</span>
          <h1 style={{ fontSize: "clamp(3rem, 7vw, 5rem)", lineHeight: 1.1, maxWidth: '1000px', letterSpacing: '-0.02em' }}>
            El ecosistema completo para <span style={{ color: 'var(--accent)' }}>tu barbería</span>
          </h1>
          <p className="page-lead" style={{ maxWidth: '760px', fontSize: '1.25rem', color: 'var(--muted)', marginTop: '8px' }}>
            Centralizá turnos online, servicios, barberos, medios de pago y fila virtual para operar con claridad y escalar tus ganancias.
          </p>
          <div className="actions" style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link className="btn" href="/">Crear cuenta gratis</Link>
            <Link className="btn-secondary" href="/reservas-online">Ver demostración</Link>
          </div>
        </section>

        <section>
          <div className="grid cols-3" style={{ gap: '24px' }}>
            <FeatureCard 
              icon={<CalendarIcon />}
              title="Agenda inteligente"
              desc="Disponibilidad automática por barbero, selección de servicios y seguimiento en tiempo real del día."
            />
            <FeatureCard 
              icon={<SmartphoneIcon />}
              title="Reservas simples"
              desc="Tus clientes reservan desde su celular en segundos, sin depender de mensajes de WhatsApp manuales."
            />
            <FeatureCard 
              icon={<UsersIcon />}
              title="Fila Virtual"
              desc="Organizá la atención espontánea. Los clientes se anotan y siguen su lugar desde el celular sin esperar."
            />
            <FeatureCard 
              icon={<CreditCardIcon />}
              title="Pagos integrados"
              desc="Cobra señas o servicios completos con Mercado Pago para reducir las ausencias a cero."
            />
            <FeatureCard 
              icon={<TrendingUpIcon />}
              title="Panel de métricas"
              desc="Entendé qué barberos rinden más y qué servicios generan mayores ingresos a tu local."
            />
            <FeatureCard 
              icon={<SettingsIcon />}
              title="Operación SaaS"
              desc="Configuración total de tu tenant. Ajustá horarios, excepciones y roles de tu equipo fácilmente."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <article className="shell" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(245, 200, 66, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{title}</h2>
        <p className="muted" style={{ lineHeight: 1.6 }}>{desc}</p>
      </div>
    </article>
  );
}

function CalendarIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> }
function SmartphoneIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg> }
function UsersIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> }
function CreditCardIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> }
function TrendingUpIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg> }
function SettingsIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> }
