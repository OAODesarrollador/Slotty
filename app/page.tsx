import Image from "next/image";
import Link from "next/link";
import { getTenants } from "@/repositories/tenants";
import { HeroScroll } from "@/components/hero-scroll";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RootHeader } from "@/components/root-header";
import { QuickBookingFlow } from "@/components/quick-booking-flow";
import { ContentExplorer } from "@/components/content-explorer";
import { AudienceMoment } from "@/components/audience-moment";
import { PhoneReveal } from "@/components/phone-reveal";
import styles from "./page.module.css";

export default async function RootPage() {
  const tenants = await getTenants();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={styles.rootContainer}>
      <ScrollReveal />
      <RootHeader />
      
      {/* 1. HERO SCROLL */}
      <HeroScroll tenants={tenants} />

      <main className={styles.mainContent}>
        {/* 2. SOLUTIONS FOR EVERY BUSINESS */}
        <section id="solutions" className={styles.solutionsWrapper} data-animate>
          <div className={styles.sectionHeader}>
            <span className={styles.tagline}>Soluciones integrales</span>
            <h2 className={styles.serifTitle}>Una plataforma, infinitas posibilidades.</h2>
          </div>
          
          <div className={styles.revealGrid}>
            <div className={styles.revealCard}>
              <div className={styles.cardVisual}>
                 <Image 
                  src="/slotty-pos.png" 
                  alt="Hardware Terminal" 
                  fill 
                  style={{ objectFit: 'contain' }}
                />
                <span className={styles.hardwareBadge}>Hardware</span>
              </div>
              <div className={styles.cardInfo}>
                <h3>Terminal POS</h3>
                <p>Pagos rápidos, seguros y sin complicaciones en el mostrador. Diseñado para el flujo constante de tu negocio.</p>
              </div>
            </div>

            <div className={styles.revealCard}>
              <div className={styles.cardVisual}>
                 <Image 
                  src="/slotty-hero.png" 
                  alt="Software Interface" 
                  fill 
                  style={{ objectFit: 'contain' }}
                />
                <span className={styles.softwareBadge}>Software</span>
              </div>
              <div className={styles.cardInfo}>
                <h3>Gestión de citas</h3>
                <p>Agenda inteligente para tu equipo y tus clientes. Sincronización en tiempo real y recordatorios automáticos.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. INDUSTRY GRID */}
        <section className={styles.directoryPartners} data-animate>
          <div className={styles.dirHeaderSection}>
            <span className={styles.tagline}>Especialización por industria</span>
            <h2 className={styles.serifTitle}>Para cada tipo de negocio que busca crecer.</h2>
          </div>
          <div className={styles.dirPartnerGrid}>
            <div className={styles.dirPartnerCard}>
              <div className={styles.iconFrame}>
                 <Image src="/grid-1.png" alt="Restaurantes" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className={styles.cardDetails}>
                 <span>Restaurantes</span>
                 <small>POS especializado, gestión de mesas y pedidos online integrados.</small>
              </div>
            </div>
            <div className={styles.dirPartnerCard}>
              <div className={styles.iconFrame}>
                 <Image src="/grid-2.png" alt="Retail" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className={styles.cardDetails}>
                 <span>Comercio Minorista</span>
                 <small>Control de inventario omnicanal y checkout ultrarrápido.</small>
              </div>
            </div>
            <div className={styles.dirPartnerCard}>
              <div className={styles.iconFrame}>
                 <Image src="/grid-3.png" alt="Salud" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className={styles.cardDetails}>
                 <span>Salud y Belleza</span>
                 <small>Fidelización de clientes, suscripciones y pagos recurrentes.</small>
              </div>
            </div>
          </div>
        </section>

        {/* 4. CONTENT EXPLORER (The Square PwNextContentExplorer Replica) */}
        <ContentExplorer />

        {/* 5. BLACK IMPACT SECTION (Ecosistema Slotty) */}
        <section className={styles.blackImpactSection} data-animate>
          <div className={styles.sectionHeader}>
            <span className={styles.tagline}>Digital & Retail</span>
            <h2 className={styles.serifTitle} style={{ color: '#ffffff' }}>Vende donde tus clientes estén.</h2>
          </div>
          <p className={styles.impactSubtitle}>Desde el mostrador físico hasta la tienda digital, Slotty unifica todo tu ecosistema en una única plataforma de alto rendimiento.</p>
          <div className={styles.actionRow}>
            <Link href="/discovery" className="btn">Explorar socios</Link>
            <Link href="/admin/login" className="btn-secondary">Empezar ahora — Es gratis</Link>
          </div>
        </section>

        {/* 6. AUDIENCE MOMENT (Square Replica) */}
        <AudienceMoment />

        {/* 7. QUICK BOOKING (Call to Action Interface) */}
        <section className={styles.quickBookingSection}>
          <div className={styles.quickBookingContainer}>
            <div className={styles.quickBookingText}>
              <span className={styles.tagline} style={{ color: '#006AFF' }}>RESERVA RÁPIDA</span>
              <h2 className={styles.serifTitle} style={{ color: 'white', fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', maxWidth: '600px', marginBottom: '32px' }}>
                Tu agenda, <br/> siempre en movimiento.
              </h2>
              <p className={styles.impactSubtitle} style={{ textAlign: 'left', margin: '0 0 40px', maxWidth: '480px' }}>
                Experimenta la fluidez de nuestro sistema de reservas. Diseñado para ser intuitivo tanto para el dueño como para el cliente final.
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>
                  <h4 style={{ color: 'white', marginBottom: '8px' }}>+40%</h4>
                  <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Incremento en reservas online</p>
                </div>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>
                  <h4 style={{ color: 'white', marginBottom: '8px' }}>-25%</h4>
                  <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Reducción de ausencias</p>
                </div>
              </div>
            </div>
            <div className={styles.quickBookingVisual}>
              <PhoneReveal>
                <QuickBookingFlow 
                  slug="root"
                  tenantName="Slotty Demo"
                  timezone="UTC"
                  minDate={today}
                  initialDate={today}
                  services={[
                    { id: "s1", name: "Corte", price: "8000", duration_minutes: 30, description: "" },
                    { id: "s2", name: "Barba", price: "5000", duration_minutes: 20, description: "" },
                    { id: "s3", name: "Corte + Barba", price: "12000", duration_minutes: 50, description: "" },
                    { id: "s4", name: "Express", price: "4500", duration_minutes: 15, description: "" }
                  ]}
                  barbersByService={{
                    "s1": [{ id: "b1", full_name: "Alex Pro", rating: "5.0" }, { id: "b2", full_name: "Julian Cuts", rating: "4.9" }],
                    "s2": [{ id: "b1", full_name: "Alex Pro", rating: "5.0" }],
                    "s3": [{ id: "b1", full_name: "Alex Pro", rating: "5.0" }, { id: "b2", full_name: "Julian Cuts", rating: "4.9" }],
                    "s4": [{ id: "b3", full_name: "Maria Nails", rating: "5.0" }]
                  }}
                  paymentSettings={{
                    allowPayAtStore: true,
                    allowBankTransfer: true,
                    allowMercadoPago: true,
                    depositType: "none",
                    depositValue: "0",
                    transferAlias: "SLOTTY.DEMO",
                    transferCbu: "00000031000987654321",
                    transferHolderName: "Slotty Software Inc",
                    transferBankName: "Banco de la Nación Argentina"
                  }}
                  hideErrors={true} // Silenciador de errores activado para la demo
                />
              </PhoneReveal>
            </div>
          </div>
        </section>

        {/* 8. PARTNER SHOWCASE (Live DB Feed) */}
        <section className={styles.directoryPartners} style={{ background: '#f9f9f9', padding: '120px 8%' }} data-animate>
          <div className={styles.sectionHeader}>
            <span className={styles.tagline}>Nuestra red</span>
            <h2 className={styles.serifTitle}>Confían en Slotty.</h2>
          </div>
          <div className={styles.dirPartnerGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {tenants.map((t) => (
              <Link key={t.id} href={`/${t.slug}`} className={styles.dirPartnerCard} style={{ flexDirection: 'row', alignItems: 'center', gap: '20px', padding: '24px' }}>
                <div style={{ position: 'relative', width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: '#fff', border: '1px solid #eee', flexShrink: 0 }}>
                   <Image src={t.logo_url || '/slotty-hero.png'} alt={t.name} fill style={{ objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{t.name}</span>
                  <small style={{ color: '#666' }}>{t.slug}.slotty.me</small>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 9. FOOTER */}
        <footer className={styles.squareFooter}>
          <div className={styles.footerGrid}>
            <div className={styles.footerCol}>
              <h5>PRODUCTO</h5>
              <Link href="#">Terminal POS</Link>
              <Link href="#">Agenda Online</Link>
              <Link href="#">Pagos</Link>
              <Link href="#">CRM</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>INDUSTRIAS</h5>
              <Link href="#">Barberías</Link>
              <Link href="#">Retail</Link>
              <Link href="#">Restaurantes</Link>
              <Link href="#">Servicios Profesionales</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>SOPORTE</h5>
              <Link href="#">Centro de ayuda</Link>
              <Link href="#">Seguridad</Link>
              <Link href="#">Estado del sistema</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>PLATAFORMA</h5>
              <Link href="/admin/login">Acceso Negocio</Link>
              <Link href="/discovery">Directorio Global</Link>
              <Link href="#">API Documentation</Link>
            </div>
          </div>
          <div className={styles.footerRights}>
            © 2026 Slotty Software. Todos los derechos reservados.
          </div>
        </footer>
      </main>

    </div>
  );
}
