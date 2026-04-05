"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./content-explorer.module.css";

const EXPLORER_DATA = [
  {
    id: "01",
    title: "Gestión de Turnos y Reservas",
    description: "Recibe turnos en tu local, a través de tu sitio web o directamente desde redes sociales. Slotty centraliza tus reservas para que nunca pierdas una cita y tu agenda esté siempre ocupada.",
    image: "/Barberia.png"
  },
  {
    id: "02",
    title: "Gestión Operativa de Staff",
    description: "Toma el mando de los turnos, comisiones y el rendimiento de tu equipo en tiempo real. Sincroniza la disponibilidad de tus barberos automáticamente y evita los errores de agenda de forma definitiva.",
    image: "/grid-1.png"
  },
  {
    id: "03",
    title: "Inteligencia de Negocio y Crecimiento",
    description: "Analítica avanzada diseñada para aumentar tu rentabilidad. Detecta tendencias, identifica tus servicios con mayor margen y proyecta el crecimiento mensual de tu barbería con datos reales.",
    image: "/grid-4.png"
  }
];

export function ContentExplorer() {
  const [activeIndex, setActiveIndex] = useState(-1);

  // Fallback: mostrar imagen 0 si no hay interacción activa
  const displayImageIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <section className={styles.explorerSection}>
      <div className={styles.container}>
        
        {/* 1. TOP: Centered Header */}
        <header className={styles.headerCentered}>
          <span className={styles.tagline}>Ecosistema Slotty</span>
          <h2 className={styles.titleCentered}>Herramientas poderosas para negocios ambiciosos.</h2>
        </header>

        {/* 2. BOTTOM: Dual Column Layout */}
        <div className={styles.explorerWrapper}>
          
          {/* LEFT: Accordion Points */}
          <div className={styles.sidebarWrapper}>
            <div className={styles.accordionGroup}>
              {EXPLORER_DATA.map((item, idx) => (
                <div 
                  key={item.id} 
                  className={`${styles.accordionItem} ${activeIndex === idx ? styles.active : ""}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  onClick={() => setActiveIndex(activeIndex === idx ? -1 : idx)}
                >
                  <div className={styles.accordionHeader}>
                    <span className={styles.number}>{item.id}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <div className={styles.accordionContent}>
                    <p>{item.description}</p>
                    <Link href="#" className={styles.learnMore}>
                      Saber más 
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Media Reveal Content */}
          <div className={styles.mediaContainer}>
            <div className={styles.mediaSticky}>
              {EXPLORER_DATA.map((item, idx) => (
                <div 
                  key={item.id} 
                  className={`${styles.mediaWrapper} ${displayImageIndex === idx ? styles.active : ""}`}
                >
                  <div className={styles.imageFrame}>
                    <Image 
                      src={item.image} 
                      alt={item.title} 
                      fill 
                      style={{ objectFit: "cover" }}
                      priority={idx === 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function Link({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} className={className}>{children}</a>;
}
