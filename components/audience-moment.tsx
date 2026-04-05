"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./audience-moment.module.css";

const AUDIENCE_DATA = [
  {
    id: "beauty",
    label: "SALÓN DE BELLEZA",
    title: "Eleva la experiencia de tus clientes.",
    description: "Desde la reserva online hasta el pago final, ofrece un servicio impecable que tus clientes querrán repetir.",
    image: "/audience-beauty.png",
  },
  {
    id: "barber",
    label: "BARBERÍAS",
    title: "Cortes con estilo, gestión sin esfuerzo.",
    description: "Optimiza tu agenda, gestiona comisiones y mantén a tus barberos enfocados en lo que mejor saben hacer.",
    image: "/audience-barber.png",
  },
  {
    id: "nails",
    label: "MANICURAS",
    title: "Detalles que marcan la diferencia.",
    description: "Controla tus insumos, fideliza a tus clientas y haz que tu negocio Brille con herramientas diseñadas para ti.",
    image: "/audience-nails.png",
  },
  {
    id: "spa",
    label: "SPA & WELLNESS",
    title: "Paz mental para ti y tus clientes.",
    description: "Automatiza recordatorios, ofrece paquetes de sesiones y gestiona tu centro de bienestar con total serenidad.",
    image: "/audience-spa.png",
  },
];

export function AudienceMoment() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section className={styles.audienceSection}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>
            DISEÑADO PARA TODOS LOS SECTORES.<br />
            <span>Haz que tu negocio siga creciendo.</span>
          </h2>
        </header>

        <div className={styles.cardsWrapper} onMouseLeave={() => setActiveId(null)}>
          {AUDIENCE_DATA.map((item) => (
            <div
              key={item.id}
              className={`${styles.card} ${activeId === item.id ? styles.active : ""}`}
              onMouseEnter={() => setActiveId(item.id)}
              onClick={() => setActiveId(item.id)}
            >
              <div className={styles.imageOverlay}>
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  style={{ objectFit: "cover" }}
                />
                <div className={styles.darken} />
              </div>

              <div className={styles.content}>
                <span className={styles.markerLabel}>{item.label}</span>
                
                <div className={styles.expandedOnly}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardDescription}>{item.description}</p>
                  <Link href="/admin/login" className={styles.learnMore}>
                    Empezar ahora
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <div className={styles.collapsedOnly}>
                  <span className={styles.verticalLabel}>{item.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
