import Image from "next/image";
import Link from "next/link";
import { getTenants } from "@/repositories/tenants";
import { HeroScroll } from "@/components/hero-scroll";
import { HomeHeaderContrast } from "@/components/home-header-contrast";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RootHeader } from "@/components/root-header";
import { ContentExplorer } from "@/components/content-explorer";
import { HowItWorksShowcase } from "@/components/how-it-works-showcase";
import { LeadCaptureSection } from "@/components/lead-capture-section";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function getSafeDatabaseHost() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return "DATABASE_URL no configurada";
  }

  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return "DATABASE_URL invalida";
  }
}

function getErrorInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name
    };
  }

  return {
    message: String(error),
    name: "UnknownError"
  };
}

export default async function RootPage() {
  const tenants = await getTenants().catch((error) => {
    console.error("No se pudieron cargar los tenants para la home.", {
      ...getErrorInfo(error),
      databaseHost: getSafeDatabaseHost()
    });
    return [];
  });

  console.log("Tenants cargados para la home.", {
    count: tenants.length,
    databaseHost: getSafeDatabaseHost()
  });

  const today = new Date().toISOString().split("T")[0];
  const acquisitionCards = [
    {
      title: "Aparecé cuando buscan dónde atenderse",
      description: "Tu barbería puede mostrarse a personas que no tienen una definida y están listas para reservar.",
      icon: "search"
    },
    {
      title: "Recibí nuevos turnos automáticamente",
      description: "Sumá reservas sin depender solo de tus redes o contactos actuales.",
      icon: "calendar"
    },
    {
      title: "Más visibilidad para crecer",
      description: "El sistema no solo organiza tu agenda, también te ayuda a generar nuevas oportunidades.",
      icon: "spark"
    }
  ];

  return (
    <div className={styles.rootContainer}>
      <ScrollReveal />
      <HomeHeaderContrast />
      <RootHeader />
      
      {/* 1. HERO SCROLL */}
      <div data-header-theme="dark">
        <HeroScroll tenants={tenants} />
      </div>

      <main className={styles.mainContent} data-header-theme="light">
        {/* 2. SOLUTIONS FOR EVERY BUSINESS (THE PAIN POINTS) */}
        <section id="solutions" className={styles.solutionsWrapper} data-header-theme="light" data-animate>
          <div className={styles.sectionHeader}>
            <span className={styles.tagline}>EL PROBLEMA</span>
            <h2 className={styles.serifTitle} style={{ maxWidth: '900px' }}>
              Esto es lo que te hace perder turnos todos los días
            </h2>
            <p className={styles.impactSubtitle} style={{ marginTop: '24px', textAlign: 'left', margin: '24px 0 0' }}>
              Mientras resolvés la agenda de forma manual, perdés tiempo, orden y oportunidades de ingreso.
            </p>
          </div>
          
          <div className={styles.revealGrid}>
            {/* IZQUIERDA: Reservas y agenda inteligente */}
            <div className={styles.revealCard}>
              <div className={styles.cardVisual}>
                <div style={{ width: 48, height: 48, background: 'rgba(245, 200, 66, 0.18)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245, 200, 66, 0.3)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c29931" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4" />
                    <path d="M8 2v4" />
                    <path d="M3 10h18" />
                    <path d="M8 14h3" />
                    <path d="M13 14h3" />
                    <path d="M8 18h3" />
                  </svg>
                </div>
              </div>
              <div className={styles.cardInfo}>
                <h3>Turnos mal organizados</h3>
                <ul className={styles.cardList}>
                  <li>Horarios que se pisan</li>
                  <li>Espacios vacíos entre reservas</li>
                  <li>Disponibilidad confusa por barbero</li>
                </ul>
              </div>
            </div>

            {/* DERECHA: Control del flujo de clientes */}
            <div className={styles.revealCard}>
              <div className={styles.cardVisual}>
                <div style={{ width: 48, height: 48, background: 'rgba(245, 200, 66, 0.18)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245, 200, 66, 0.3)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c29931" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="6" width="16" height="12" rx="2" />
                    <path d="M9 10h6" />
                    <circle cx="18" cy="18" r="3" />
                    <path d="M16.5 16.5l3 3" />
                    <path d="M19.5 16.5l-3 3" />
                  </svg>
                </div>
              </div>
              <div className={styles.cardInfo}>
                <h3>Clientes que no se concretan</h3>
                <ul className={styles.cardList}>
                  <li>Reservas que no se confirman</li>
                  <li>Ausencias que te hacen perder plata</li>
                  <li>Tiempo perdido resolviendo cada turno</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BARBERSHOP PERFECTION (The Difference) */}
                <div data-header-theme="light">
                  <HowItWorksShowcase today={today} />
                </div>

        {/* 4. CONTENT EXPLORER (The Square PwNextContentExplorer Replica) */}
        <div data-header-theme="dark">
          <ContentExplorer />
        </div>



        {/* 8. PARTNER SHOWCASE (Live DB Feed) */}
        <section className={styles.directoryPartners} data-header-theme="light" style={{ background: '#f9f9f9', padding: '120px 8%' }} data-animate>
          <div className={styles.sectionHeader}>
            <span className={styles.tagline}>Nuevos clientes</span>
            <h2 className={styles.serifTitle}>También podés recibir clientes que todavía no te conocen</h2>
            <p className={styles.impactSubtitle} style={{ marginTop: '24px', textAlign: 'left', margin: '24px 0 0', maxWidth: '760px' }}>
              Personas que buscan una barbería pueden encontrar tu negocio y reservar directamente desde la plataforma.
            </p>
          </div>
          <div className={styles.dirPartnerGrid} style={{ gridTemplateColumns: 'repeat(3, minmax(360px, 420px))', justifyContent: 'center' }}>
            {acquisitionCards.map((card) => (
              <div key={card.title} className={styles.dirPartnerCard} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '24px', padding: '32px', minHeight: '180px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', background: 'rgba(245, 200, 66, 0.18)', border: '1px solid rgba(245, 200, 66, 0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon === 'search' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c29931" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  ) : card.icon === 'calendar' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c29931" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 14h4"/></svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c29931" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M3 12h18"/><path d="m5.5 5.5 13 13"/><path d="m18.5 5.5-13 13"/></svg>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.35rem', lineHeight: 1.2 }}>{card.title}</span>
                  <small style={{ color: '#666', lineHeight: 1.6, fontSize: '1rem' }}>{card.description}</small>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '28px' }}>
            {tenants.map((t) => (
              <Link
                key={t.id}
                href={`/${t.slug}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  borderRadius: '999px',
                  background: '#fff',
                  border: '1px solid #e7e7e7',
                  color: '#111',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              >
                <span style={{ position: 'relative', width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: '#f4f4f4', flexShrink: 0 }}>
                  <Image src={t.logo_url || '/slotty-hero.png'} alt={t.name} fill style={{ objectFit: 'cover' }} />
                </span>
                <span>{t.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.finalCtaSection} data-header-theme="dark" data-animate>
          <div className={styles.finalCtaShell}>
            <span className={`${styles.tagline} ${styles.finalCtaEyebrow}`}>EMPEZÁ HOY</span>
            <h2 className={styles.finalCtaTitle}>Empezá a llenar tu agenda desde hoy</h2>
            <p className={styles.finalCtaText}>
              Organizá tus turnos, reducí ausencias y abrí tu barbería a nuevos clientes desde un solo lugar.
            </p>
            <div className={styles.finalCtaActions}>
              <Link href="#demo" className={`btn ${styles.finalCtaPrimary}`}>Ver demo en 2 minutos</Link>
              <Link href="#demo" className={`btn-secondary ${styles.finalCtaSecondary}`}>Solicitar acceso</Link>
            </div>
            <ul className={styles.finalCtaBullets}>
              <li>Sin instalaciones</li>
              <li>Configuración simple</li>
              <li>Adaptado a tu forma de trabajo</li>
            </ul>
          </div>
        </section>

        <div data-header-theme="light">
          <LeadCaptureSection />
        </div>

        {/* 9. FOOTER */}
        <footer className={styles.squareFooter} data-header-theme="light">
          <div className={styles.footerGrid}>
            <div className={styles.footerCol}>
              <h5>Slotty</h5>
              <p className={styles.footerBrandText}>Sistema de reservas para negocios de servicios</p>
            </div>
            <div className={styles.footerCol}>
              <h5>Producto</h5>
              <Link href="#demo">Cómo funciona</Link>
              <Link href="#benefits">Beneficios</Link>
              <Link href="#start">Empezar</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>Contacto</h5>
              <span className={styles.footerContactValue}>WhatsApp: +543704054127</span>
              <Link href="https://wa.me/543704054127" target="_blank" rel="noreferrer">Hablá por WhatsApp</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>Legal</h5>
              <Link href="/terminos">Términos</Link>
              <Link href="/privacidad">Privacidad</Link>
            </div>
          </div>
          <div className={styles.footerRights}>
            © 2026 Slotty
          </div>
        </footer>
      </main>

    </div>
  );
}
