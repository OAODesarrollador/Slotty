"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";
import styles from "./content-explorer.module.css";

const EXPLORER_DATA = [
  {
    id: "01",
    title: "Reservas en un solo lugar",
    description: "Todos los turnos organizados dentro del mismo sistema, sin cruces, sin confusión y sin perder información entre canales.",
    image: "/eco-reservas.png"
  },
  {
    id: "02",
    title: "Clientes y pagos conectados",
    description: "Cada reserva queda asociada a sus datos y a su forma de cobro, para que el seguimiento sea más simple y más claro.",
    image: "/eco-pagos.png"
  },
  {
    id: "03",
    title: "Operación diaria más ordenada",
    description: "Horarios, disponibilidad y atención funcionando en conjunto para que la barbería trabaje con menos fricción.",
    image: "/eco-operacion.png"
  }
];

export function ContentExplorer() {
  const [openIndex, setOpenIndex] = useState(1); // "Clientes y cobros" abierto por defecto

  const SECTIONS: {
    title: string;
    description: string;
    image: string;
    icon: ReactNode;
    exampleLink?: string;
  }[] = [
    {
      title: "Reservas en un solo lugar",
      description: "Todos los turnos organizados dentro del mismo sistema, sin cruces, sin confusión y sin perder información entre canales.",
      image: "/eco-reservas.png",
      icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    },
    {
      title: "Clientes y pagos conectados",
      description: "Cada reserva queda asociada a sus datos y a su forma de cobro, para que el seguimiento sea más simple y más claro.",
      image: "/eco-pagos.png",
      icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    },
    {
      title: "Tu propia página de reservas",
      description: "Cada negocio tiene su espacio con un link propio para que los clientes reserven directamente, sin depender de terceros.",
      image: "/eco-operacion.png",
      icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l2.12-2.12a5 5 0 0 0-7.07-7.07L11.38 5.6"/><path d="M14 11a5 5 0 0 0-7.54-.54L4.34 12.58a5 5 0 1 0 7.07 7.07l1.17-1.17"/></svg>,
      exampleLink: "nombrenegocio.dibok.com"
    }
  ];

  return (
    <section id="benefits" className={styles.explorerSection}>
      <div className={styles.container}>
        
        {/* 1. HEADER UNIFICADO */}
        <header className={styles.headerCentered}>
          <span className={styles.tagline}>Ecosistema Dibok</span>
          <h2 className={styles.titleCentered}>Todo funciona mejor cuando tu negocio está conectado</h2>
          <p className={styles.subtitleCentered}>
            Reservas, clientes, cobros y operación diaria en un solo sistema. Menos desorden, menos tiempo perdido y más control sobre cada turno.
          </p>
          <p className={styles.reinforcementLine}>Sin herramientas separadas. Sin desorden.</p>
        </header>

        {/* 2. SISTEMA DE TARJETAS DINÁMICAS */}
        <div className={styles.dynamicSystemWrapper}>
          {SECTIONS.map((section, idx) => (
            <div 
              key={idx}
              className={`${styles.dynamicCard} ${openIndex === idx ? styles.isOpen : ""}`}
              onMouseEnter={() => setOpenIndex(idx)}
              onClick={() => setOpenIndex(idx)}
            >
              {/* Imagen de Fondo con Overlay */}
              <div className={styles.cardImageBack}>
                <Image 
                  src={section.image} 
                  alt={section.title} 
                  fill 
                  style={{ objectFit: 'cover' }}
                />
                <div className={styles.imageOverlay} />
              </div>

              <div className={styles.cardHeader}>
                <div className={styles.iconBox}>
                  {section.icon}
                </div>
                <h3>{section.title}</h3>
              </div>
              
              <div className={styles.cardContent}>
                <div className={styles.contentInner}>
                  <p>{section.description}</p>
                  {section.exampleLink ? (
                    <div className={styles.linkExample}>{section.exampleLink}</div>
                  ) : null}
                </div>
              </div>

              {/* Indicador visual de sistema conectado */}
              <div className={styles.cardConnector} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Link({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} className={className}>{children}</a>;
}
