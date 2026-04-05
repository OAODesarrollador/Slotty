"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./parallax-booking.module.css";
import { QuickBookingFlow } from "./quick-booking-flow";

export function ParallaxBooking({ today }: { today: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate offset only when section is in or near viewport
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setOffsetY((window.pageYOffset - containerRef.current.offsetTop) * 0.4);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={containerRef} className={styles.parallaxSection}>
      {/* BACKGROUND IMAGE WITH MOVEMENT */}
      <div 
        className={styles.parallaxBg} 
        style={{ 
          backgroundImage: 'url("/parallax-booking.png")',
          transform: `translateY(${offsetY}px) scale(1.2)`
        }} 
      />
      
      {/* OVERLAY DARKNESS */}
      <div className={styles.overlay} />

      {/* CONTENT GRID */}
      <div className={styles.container}>
        <div className={styles.textSide}>
          <span className={styles.eyebrow}>RESERVA RÁPIDA</span>
          <h2 className={styles.title}>Agenda tu cita en segundos.</h2>
          <p className={styles.description}>
            Elige tu servicio y reserva tu lugar sin registros lentos. 
            Calidad profesional a solo un clic de distancia.
          </p>
        </div>
        
        <div className={styles.bookingSide}>
          <div className={styles.bookingCard}>
              <QuickBookingFlow 
                slug="root"
                tenantName="Slotty"
                timezone="UTC"
                minDate={today}
                initialDate={today}
                services={[]}
                barbersByService={{}}
                paymentSettings={null}
              />
          </div>
        </div>
      </div>
    </section>
  );
}
