"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./hero-scroll.module.css";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_image_url: string | null;
}

export function HeroScroll({ tenants = [] }: { tenants?: Tenant[] }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);
  const mosaicRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const touchStartY = useRef<number | null>(null);
  const isUnlockedRef = useRef(false);

  const randomPositions = useMemo(() => {
    return [
      { top: "5%", left: "5%", rotation: "-8deg", src: "/grid-1.png" },
      { top: "8%", left: "80%", rotation: "12deg", src: "/grid-2.png" },
      { top: "80%", left: "5%", rotation: "6deg", src: "/grid-3.png" },
      { top: "82%", left: "85%", rotation: "-10deg", src: "/grid-4.png" },
      { top: "45%", left: "2%", rotation: "-4deg", src: "/audience-beauty.png" },
      { top: "40%", left: "88%", rotation: "5deg", src: "/audience-barber.png" },
      { top: "5%", left: "45%", rotation: "3deg", src: "/audience-nails.png" },
      { top: "85%", left: "40%", rotation: "-6deg", src: "/audience-spa.png" }
    ];
  }, []);

  const [mainImage, setMainImage] = useState<string | null>(null);

  useEffect(() => {
    const allImages = randomPositions.map(pos => pos.src);
    setMainImage(allImages[Math.floor(Math.random() * allImages.length)]);
    setScrollLock(true);
  }, [randomPositions]);

  useEffect(() => {
    const isMobile = window.innerWidth <= 1024;
    const targetScale = isMobile ? 0.40 : 0.22;

    const updateVisuals = (currentScale: number) => {
      const media = mediaRef.current;
      const mosaic = mosaicRef.current;
      if (!media) return;

      const progress = (1 - currentScale) / (1 - targetScale);
      const currentWidthVw = currentScale * 100;
      
      // Rotación: 0deg al inicio (escala 1), -3deg al final (targetScale)
      const rotation = progress * -3;
      const opacity = 0.5 + (currentScale - targetScale) / (1 - targetScale) * 0.5;
      
      // Desenfoque dinámico: más difuso al principio (escala 1), nítido al final (targetScale)
      const maxBlur = 5; // Pixeles de desenfoque al inicio
      const currentBlur = (1 - progress) * maxBlur;

      media.style.width = `${currentWidthVw}vw`;
      media.style.height = `calc(100vh - (${progress} * (100vh - ${currentWidthVw * 9/16}vw)))`;
      media.style.transform = `translate(-50%, -50%) rotate(${!isUnlockedRef.current ? rotation : 0}deg)`;
      media.style.filter = `blur(${currentBlur}px)`; // Difuso dinámico
      
      // Esquinas redondeadas (24px para coincidir con el mosaico)
      const currentRadius = Math.min(24, progress * 120); 
      media.style.borderRadius = `${currentRadius}px`;
      media.style.opacity = (opacity * 0.85).toString(); // Máximo 0.85 para efecto translúcido

      if (mosaic) {
        const mosaicOpacity = currentScale <= 0.8 ? Math.min(1, (0.8 - currentScale) / 0.2) : 0;
        mosaic.style.opacity = isUnlockedRef.current ? "1" : mosaicOpacity.toString();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isUnlockedRef.current) {
        if (e.deltaY < 0 && window.scrollY <= 0) {
          isUnlockedRef.current = false;
          setIsUnlocked(false);
          setScrollLock(true);
          
          const al = randomPositions.map(pos => pos.src);
          setMainImage(al[Math.floor(Math.random() * al.length)]);
        } else {
          return;
        }
      }

      scaleRef.current = Math.max(targetScale, Math.min(1, scaleRef.current - e.deltaY / 1200));
      updateVisuals(scaleRef.current);

      if (scaleRef.current <= targetScale && !isUnlockedRef.current) {
        isUnlockedRef.current = true;
        setIsUnlocked(true);
        setScrollLock(false);
      }
      
      if (!isUnlockedRef.current) e.preventDefault();
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY.current - currentY;
      
      if (isUnlockedRef.current) {
        if (window.scrollY <= 0 && deltaY < 0) {
          isUnlockedRef.current = false;
          setIsUnlocked(false);
          setScrollLock(true);
          
          const al = randomPositions.map(pos => pos.src);
          setMainImage(al[Math.floor(Math.random() * al.length)]);
        } else {
          return;
        }
      }

      // SI ESTAMOS AL 100% Y TIRAMOS HACIA ABAJO -> PERMITIR RECARGAR (PULL TO REFRESH)
      if (scaleRef.current >= 1 && deltaY < 0) {
        setScrollLock(false); 
        return; // No prevenimos el default, el móvil refresca si quiere
      }

      // SI MOVEMOS HACIA ARRIBA (ACHICAR), VOLVEMOS A BLOQUEAR POR SEGURIDAD
      if (!isUnlockedRef.current && deltaY > 0) {
        setScrollLock(true);
      }

      scaleRef.current = Math.max(targetScale, Math.min(1, scaleRef.current - deltaY / 800));
      updateVisuals(scaleRef.current);
      
      touchStartY.current = currentY;

      if (scaleRef.current <= targetScale && !isUnlockedRef.current) {
        isUnlockedRef.current = true;
        setIsUnlocked(true);
        setScrollLock(false);
      }

      if (!isUnlockedRef.current) {
        if (e.cancelable) e.preventDefault();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    
    updateVisuals(scaleRef.current);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [randomPositions]);

  const setScrollLock = (locked: boolean) => {
    const mode = locked ? "hidden" : "auto";
    const overscroll = locked ? "none" : "auto";
    document.documentElement.style.overflow = mode;
    document.documentElement.style.overscrollBehaviorY = overscroll;
    document.body.style.overflow = mode;
    document.body.style.overscrollBehaviorY = overscroll;
    
    const root = document.querySelector('[class*="rootContainer"]');
    if (root instanceof HTMLElement) {
       root.style.overflow = locked ? "hidden" : "visible";
    }
  };

  return (
    <div className={styles.heroContainer}>
      <section 
        className={`${styles.heroWrapper} ${isUnlocked ? styles.unlockedHero : ""}`}
      >
        <div ref={mosaicRef} className={styles.mosaicGrid} style={{ opacity: 0 }}>
          {randomPositions.map((pos, index) => (
            <div 
              key={index}
              className={styles.gridItemStandalone}
              style={{ 
                top: pos.top, 
                left: pos.left, 
                transform: `rotate(${pos.rotation})` 
              }}
            >
              <Image 
                src={pos.src} 
                alt="Context Visual" 
                fill 
                sizes="40vw" 
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>

        <div 
          ref={mediaRef}
          className={styles.mediaContainer}
          style={{ 
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100vw",
            height: "100vh",
            opacity: 1
          }}
        >
          {mainImage && (
            <Image
              src={mainImage}
              alt="Hero Visual"
              fill
              className={styles.heroVideo}
              priority
              style={{ objectFit: "cover" }}
            />
          )}
        </div>

        <div className={styles.titles}>
          <h1 className={styles.bigTitle}>
            Convertí cada horario libre en una reserva
          </h1>
          <p className={styles.subHeadline}>
            Automatizá tu agenda, reducí ausencias y mantené tu barbería siempre activa.
          </p>
          <p className={styles.heroMicrocopy}>Incluye tu propia página de reservas lista para compartir</p>
          <Link href="#demo" className={styles.ctaButton}>
            Ver demo en 2 minutos
          </Link>
          <div className={styles.partnerLogosViewport}>
            <div className={styles.partnerLogosTrack}>
              <div className={styles.partnerLogos}>
                <span>Hecho para tu negocio</span>
                <span>•</span>
                <span>Agenda automática</span>
                <span>•</span>
                <span>Reservas 24/7</span>
                <span>•</span>
                <span>Menos ausencias</span>
                <span>•</span>
              </div>
              <div className={styles.partnerLogos} aria-hidden="true">
                <span>Hecho para tu negocio</span>
                <span>•</span>
                <span>Agenda automática</span>
                <span>•</span>
                <span>Reservas 24/7</span>
                <span>•</span>
                <span>Menos ausencias</span>
                <span>•</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
