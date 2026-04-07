"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./content-explorer.module.css";

const EXPLORER_DATA = [
  {
    id: "01",
    title: "Reservas centralizadas",
    description: "Turnos organizados en un solo lugar, sin cruces ni pérdida de información.",
    image: "/eco-reservas.png"
  },
  {
    id: "02",
    title: "Clientes y cobros integrados",
    description: "Historial, datos y pagos dentro del mismo flujo, sin depender de herramientas externas.",
    image: "/eco-pagos.png"
  },
  {
    id: "03",
    title: "Operación diaria ordenada",
    description: "Barberos, horarios y disponibilidad funcionando sin fricción.",
    image: "/eco-operacion.png"
  }
];

export function ContentExplorer() {
  return (
    <section className={styles.explorerSection}>
      <div className={styles.container}>
        
        {/* 1. TOP: Centered Header (Refined) */}
        <header className={styles.headerCentered}>
          <div className={styles.headerWrapper}>
            <span className={styles.tagline}>Ecosistema Slotty</span>
            <h2 className={styles.titleCentered}>Todo funciona mejor cuando está conectado</h2>
            <p className={styles.subtitleCentered}>
              Todo lo que pasa en tu barbería, en un solo lugar y funcionando en conjunto.
            </p>
            <p className={styles.reinforcementLine}>Sin herramientas separadas. Sin desorden.</p>
          </div>
        </header>

        {/* 2. BOTTOM: Hierarchical Pillars Layout */}
        <div className={styles.pillarsWrapper}>
          
          {/* PILLAR DESTACADO: Clientes y cobros integrados (Top Full Width) */}
          <div className={styles.featuredPillar}>
            <div className={styles.pillarIcon}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div className={styles.pillarInfo}>
              <h3>Clientes y cobros integrados</h3>
              <p>Historial, datos y pagos dentro del mismo flujo, sin depender de herramientas externas.</p>
            </div>
            <div className={styles.pillarVisual}>
               <Image 
                src="/eco-pagos.png" 
                alt="Pagos integrados" 
                fill 
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* GRILLA SECUNDARIA: Los otros 2 bloques (2 Columnas) */}
          <div className={styles.secondaryPillarsGrid}>
            <div className={styles.secondaryPillar}>
              <div className={styles.smallPillarIcon}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className={styles.secondaryInfo}>
                <h3>Reservas centralizadas</h3>
                <p>Turnos organizados en un solo lugar, sin cruces ni pérdida de información.</p>
              </div>
              <div className={styles.secondaryVisual}>
                <Image src="/eco-reservas.png" alt="Reservas" fill style={{ objectFit: 'cover' }} />
              </div>
            </div>

            <div className={styles.secondaryPillar}>
              <div className={styles.smallPillarIcon}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className={styles.secondaryInfo}>
                <h3>Operación diaria ordenada</h3>
                <p>Barberos, horarios y disponibilidad funcionando sin fricción.</p>
              </div>
              <div className={styles.secondaryVisual}>
                <Image src="/eco-operacion.png" alt="Operación staff" fill style={{ objectFit: 'cover' }} />
              </div>
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
