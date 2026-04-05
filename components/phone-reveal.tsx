"use client";

import { useRef, useEffect } from "react";
import styles from "./phone-reveal.module.css";

interface PhoneRevealProps {
  children: React.ReactNode;
}

export function PhoneReveal({ children }: PhoneRevealProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const handleWheel = (e: WheelEvent) => {
      const scrollable = scrollRef.current;
      if (!scrollable) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const maxScroll = scrollHeight - clientHeight;

      const delta = e.deltaY;
      const oldScrollTop = scrollable.scrollTop;
      
      // Intentamos desplazar el contenido interno primero
      scrollable.scrollTop += delta;
      
      const newScrollTop = scrollable.scrollTop;

      // Si la posición de scroll del teléfono cambió, significa que consumimos el movimiento
      if (oldScrollTop !== newScrollTop) {
        e.preventDefault();
      } 
      // Si NO cambió (llegamos al límite), permitimos que el evento fluya 
      // y opcionalmente ayudamos al navegador a despertar el scroll de la página
      else {
        // No llamamos a e.preventDefault() para dejar que el navegador vea el evento
        // Pero para asegurar suavidad total en todos los navegadores, inyectamos un pequeño empuje
        if (delta !== 0) {
          window.scrollBy({ top: delta, behavior: 'auto' });
        }
      }
    };

    const section = frame.closest('section');
    if (section) {
      section.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (section) {
        section.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  return (
    <div ref={frameRef} className={styles.phoneFrame}>
      {/* 
        This scrollRef will have overflow: auto 
        but we'll hide the scrollbar and control it via wheel-jacking too if needed 
      */}
      <div 
        ref={scrollRef}
        className={styles.scrollingContent}
        style={{ 
          height: '100%', 
          overflowY: 'auto', 
          msOverflowStyle: 'none', 
          scrollbarWidth: 'none' 
        }}
      >
        <div className={styles.innerPadding}>
          {children}
        </div>
      </div>
    </div>
  );
}
