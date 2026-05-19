import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageBrand } from "@/components/seo-page-brand";

export const metadata: Metadata = {
  title: "Sistema de reservas online",
  description: "Reservas online para barberías y negocios de servicios con agenda, selección de horarios, barberos y pagos configurables.",
  alternates: {
    canonical: "/reservas-online"
  },
  openGraph: {
    title: "Sistema de reservas online | Dibok",
    description: "Turnos online para negocios de servicios, agenda por barbero y pagos configurables.",
    url: "https://dibok.app/reservas-online"
  }
};

export default function ReservasOnlinePage() {
  return (
    <main className="page" style={{ paddingTop: '120px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px' }}>
        
        <section style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <SeoPageBrand />
          <span className="eyebrow" style={{ marginTop: '20px' }}>Reservas Online</span>
          <h1 style={{ fontSize: "clamp(3rem, 7vw, 5rem)", lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Turnos sin fricción,<br/><span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>24/7 para tus clientes</span>
          </h1>
          <p className="page-lead" style={{ maxWidth: '640px', fontSize: '1.25rem', color: 'var(--muted)', marginTop: '8px' }}>
            Permití que tus clientes elijan servicio, barbero y horario disponible desde una experiencia rápida, premium y adaptada a tu negocio.
          </p>
        </section>

        <section className="shell" style={{ padding: '60px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'var(--accent)', opacity: 0.05, filter: 'blur(80px)', borderRadius: '50%' }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '40px', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(245, 200, 66, 0.1)', color: 'var(--accent)', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '16px' }}>PASO 1</span>
                <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Selección de Servicios</h2>
                <p className="muted" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>Tus clientes navegan por un catálogo visual de tus servicios, organizados por categorías. Ven precios, duraciones y pueden elegir el barbero de su preferencia.</p>
              </div>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent)' }}>
                <ScissorsIcon />
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '40px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent)' }}>
                <ClockIcon />
              </div>
              <div>
                <span style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(245, 200, 66, 0.1)', color: 'var(--accent)', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '16px' }}>PASO 2</span>
                <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Disponibilidad Inteligente</h2>
                <p className="muted" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>El sistema calcula en tiempo real los espacios libres según la agenda del barbero y la duración de los servicios seleccionados. Sin choques ni dobles reservas.</p>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '40px', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(245, 200, 66, 0.1)', color: 'var(--accent)', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '16px' }}>PASO 3</span>
                <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Confirmación y Pago</h2>
                <p className="muted" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>El cliente revisa su turno y elige el método de pago configurado (Local, Transferencia o Mercado Pago). Recibe confirmación instantánea.</p>
              </div>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent)' }}>
                <CheckCircleIcon />
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link className="btn" href="/">Empezar ahora</Link>
          <Link className="btn-secondary" href="/fila-virtual">Ver fila virtual</Link>
        </div>
      </div>
    </main>
  );
}

function ScissorsIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg> }
function ClockIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> }
function CheckCircleIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> }
