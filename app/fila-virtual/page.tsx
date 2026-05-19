import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageBrand } from "@/components/seo-page-brand";

export const metadata: Metadata = {
  title: "Fila virtual para barberías",
  description: "Fila virtual para barberías y negocios de servicios: los clientes se suman desde el celular y siguen su turno online.",
  alternates: {
    canonical: "/fila-virtual"
  },
  openGraph: {
    title: "Fila virtual para barberías | Dibok",
    description: "Organizá atención espontánea sin filas físicas largas ni coordinación manual.",
    url: "https://dibok.app/fila-virtual"
  }
};

export default function FilaVirtualPage() {
  return (
    <main className="page" style={{ paddingTop: '120px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px' }}>
        
        <section style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <SeoPageBrand />
          <span className="eyebrow" style={{ marginTop: '20px' }}>Fila Virtual</span>
          <h1 style={{ fontSize: "clamp(3rem, 7vw, 5rem)", lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Transformá la espera<br/>en <span style={{ color: 'var(--accent)' }}>libertad</span>
          </h1>
          <p className="page-lead" style={{ maxWidth: '640px', fontSize: '1.25rem', color: 'var(--muted)', marginTop: '8px' }}>
            Dibok permite que tus clientes se sumen a la fila desde el celular, elijan su servicio y sigan el estado de atención sin tener que esperar físicamente en el local.
          </p>
        </section>

        <section className="grid cols-3" style={{ gap: '24px' }}>
          <div className="shell stack" style={{ padding: '40px 32px', textAlign: 'center', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 200, 66, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)', marginBottom: '16px' }}>
              <CoffeeIcon />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Menos espera</h3>
            <p className="muted" style={{ lineHeight: 1.6 }}>El cliente ve cuántos turnos faltan en su celular y puede aprovechar su tiempo.</p>
          </div>
          
          <div className="shell stack" style={{ padding: '40px 32px', textAlign: 'center', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 200, 66, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)', marginBottom: '16px' }}>
              <SlidersIcon />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Control Operativo</h3>
            <p className="muted" style={{ lineHeight: 1.6 }}>Llamá, marcá como atendido o cancelá desde un panel privado y en tiempo real.</p>
          </div>

          <div className="shell stack" style={{ padding: '40px 32px', textAlign: 'center', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 200, 66, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)', marginBottom: '16px' }}>
              <ShieldIcon />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Privacidad total</h3>
            <p className="muted" style={{ lineHeight: 1.6 }}>Los clientes solo ven su turno. Los datos y nombres no se exponen al público.</p>
          </div>
        </section>

        <section className="shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '60px', textAlign: 'center', border: '1px solid var(--line-strong)' }}>
          <h2 style={{ fontSize: '2.5rem' }}>Operación sin fricciones</h2>
          <p className="muted" style={{ maxWidth: '500px', fontSize: '1.1rem', lineHeight: 1.6 }}>Desplegá un código QR en tu local, o compartí el enlace en Instagram para que los clientes se anoten antes de llegar.</p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link className="btn" href="/">Crear mi cuenta</Link>
            <Link className="btn-secondary" href="/precios">Ver planes</Link>
          </div>
        </section>

      </div>
    </main>
  );
}

function CoffeeIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg> }
function SlidersIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg> }
function ShieldIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> }
