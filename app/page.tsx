import Image from "next/image";
import Link from "next/link";
import { getTenants } from "@/repositories/tenants";
import styles from "./page.module.css";

// ELEGANT SVG ICONS
const IconFlow = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

const IconGrowth = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/>
  </svg>
);

const IconPremium = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l3 12"/><path d="M13 3l3 6-3 12"/><path d="M2 9h20"/>
  </svg>
);

export default async function RootPage() {
  const tenants = await getTenants();

  return (
    <main className="page">
      {/* 1. HERO IMMERSIVE */}
      <section className={styles.heroSection}>
        <div className={styles.heroMedia}>
          <Image
            src="/Barberia.png"
            alt="Slotty Luxury Experience"
            fill
            priority
            className={styles.heroImage}
            sizes="100vw"
          />
          <div className={styles.heroMask} />
          <div className={styles.heroGlow} />
        </div>
        
        <div className={styles.heroContent}>
          <span className={styles.sectionLabel} style={{ color: "#fff", opacity: 0.8 }}>BIENVENIDO AL FUTURO</span>
          <h1 className={styles.gradientTitle}>Transformamos cada Turno en una Experiencia de Lujo.</h1>
          <p className={styles.heroSubtitle}>
            Slotty es la plataforma definitiva donde la tecnología de vanguardia se encuentra con la excelencia del servicio. 
            No gestionamos simples agendas, potenciamos marcas de prestigio.
          </p>
          <div className={styles.ctaGroup}>
            <a href="#sedes" className="btn">Explorar Sedes</a>
            <button className="btn-secondary" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)" }}>
              Saber más
            </button>
          </div>
        </div>
      </section>

      {/* 2. VALUES NARRATIVE */}
      <section className={styles.valuesSection}>
        <span className={styles.sectionLabel}>EL ESTÁNDAR SLOTTY</span>
        <h2 className={styles.sectionTitle}>Elevamos tu negocio al siguiente nivel.</h2>
        
        <div className={styles.valueGrid}>
          <div className={styles.valueCard}>
            <div className={styles.iconWrapper}>
              <IconFlow />
            </div>
            <h3>Libertad Total</h3>
            <p className="muted">
              Tus clientes se suman a la fila desde donde estén, eliminando el estrés de la espera física. 
              Fluidez absoluta para un servicio impecable.
            </p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.iconWrapper}>
              <IconGrowth />
            </div>
            <h3>Crecimiento Exponencial</h3>
            <p className="muted">
              Reservas automáticas, recordatorios inteligentes y optimización de agenda en tiempo real. 
              Crecé sin límites operativos.
            </p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.iconWrapper}>
              <IconPremium />
            </div>
            <h3>Prestigio Digital</h3>
            <p className="muted">
              Una interfaz que respira lujo y exclusividad. Proyectá la imagen de modernidad 
              que tu marca y tus clientes merecen.
            </p>
          </div>
        </div>
      </section>

      {/* 3. DIRECTORY VIP */}
      <section id="sedes" className={styles.directorySection}>
        <div style={{ marginBottom: "60px" }}>
          <span className={styles.sectionLabel}>DIRECTORIO EXCLUSIVO</span>
          <h2 className={styles.sectionTitle} style={{ marginBottom: "16px" }}>Nuestras Sedes Seleccionadas</h2>
          <p className="muted" style={{ fontSize: "1.2rem" }}>Descubrí donde la perfección se encuentra con el estilo.</p>
        </div>

        <div className={styles.vipGrid}>
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={`/${tenant.slug}`} className={styles.vipCard}>
              <div className={styles.vipLogoContainer}>
                {tenant.logo_url ? (
                  <Image 
                    src={tenant.logo_url} 
                    alt={tenant.name} 
                    fill 
                    style={{ objectFit: "cover" }} 
                  />
                ) : (
                  <div style={{ 
                    width: "100%", 
                    height: "100%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "2.5rem",
                    fontWeight: "900",
                    color: "var(--accent)",
                    fontFamily: "var(--font-display)"
                  }}>
                    {tenant.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className={styles.vipInfo}>
                <h3 className={styles.vipName}>{tenant.name}</h3>
                <div className={styles.vipStatus}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)" }} />
                  Disponible ahora
                </div>
              </div>
              <div className={styles.vipArrow}>→</div>
            </Link>
          ))}

          {tenants.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "80px", gridColumn: "1 / -1" }}>
              <p className="muted" style={{ fontSize: "1.2rem" }}>Próximamente nuevas sedes exclusivas.</p>
            </div>
          )}
        </div>
      </section>

      <footer style={{ padding: "100px 0 40px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="muted">© 2026 Slotty Platinum Edition. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
