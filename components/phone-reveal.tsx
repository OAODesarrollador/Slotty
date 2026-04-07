"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import styles from "./phone-reveal.module.css";

interface PhoneRevealProps {
  children: React.ReactNode;
}

export function PhoneReveal({ children }: PhoneRevealProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTouchY = useRef<number | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const handleWheel = (e: WheelEvent) => {
      const scrollable = scrollRef.current;
      if (!scrollable) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const atTop = scrollTop === 0;
      const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;
      const delta = e.deltaY;

      if ((atTop && delta < 0) || (atBottom && delta > 0)) {
        return; // Permitir que el scroll se propague si estamos en los límites
      }

      scrollable.scrollTop += delta;
      e.preventDefault();
    };

    const handleTouchStart = (e: TouchEvent) => {
      startTouchY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollable = scrollRef.current;
      if (!scrollable || startTouchY.current === null) return;

      const currentY = e.touches[0].clientY;
      const delta = startTouchY.current - currentY;
      const { scrollTop, scrollHeight, clientHeight } = scrollable;

      const atTop = scrollTop === 0;
      const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;

      if ((atTop && delta < 0) || (atBottom && delta > 0)) {
        startTouchY.current = currentY; 
        return; // El scroll lo maneja el navegador hacia afuera
      }

      scrollable.scrollTop += delta;
      startTouchY.current = currentY;
      
      if (e.cancelable) e.preventDefault(); // Detenemos el scroll afuera mientras deslizamos adentro
    };

    // Solo interceptamos el scroll si el evento ocurre DENTRO del frame del teléfono
    frame.addEventListener("wheel", handleWheel, { passive: false });
    frame.addEventListener("touchstart", handleTouchStart, { passive: true });
    frame.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      frame.removeEventListener("wheel", handleWheel);
      frame.removeEventListener("touchstart", handleTouchStart);
      frame.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <div ref={frameRef} className={styles.phoneContainer}>
      <div className={styles.phoneImageWrapper}>
        <Image 
          src="/iphone-frame.png" 
          alt="Phone Frame" 
          fill 
          priority
          className={styles.mockupImage}
        />
        <div className={styles.screenArea}>
          <div 
            ref={scrollRef}
            className={styles.scrollingContent}
          >
            <div className={styles.innerPadding}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
