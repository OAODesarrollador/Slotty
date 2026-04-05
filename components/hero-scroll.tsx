"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import styles from "./hero-scroll.module.css";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_image_url: string | null;
}

export function HeroScroll({ tenants = [] }: { tenants?: Tenant[] }) {
  const [scale, setScale] = useState(1);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const randomPositions = useMemo(() => {
    return [
      { top: "5%", left: "5%", rotation: "-8deg", src: "/grid-1.png" },    // Top-Left 1
      { top: "8%", left: "80%", rotation: "12deg", src: "/grid-2.png" },   // Top-Right 1
      { top: "80%", left: "5%", rotation: "6deg", src: "/grid-3.png" },    // Bottom-Left 1
      { top: "82%", left: "85%", rotation: "-10deg", src: "/grid-4.png" }, // Bottom-Right 1
      { top: "45%", left: "2%", rotation: "-4deg", src: "/audience-beauty.png" }, // Left Mid
      { top: "40%", left: "88%", rotation: "5deg", src: "/audience-barber.png" }, // Right Mid
      { top: "5%", left: "45%", rotation: "3deg", src: "/audience-nails.png" },  // Top Mid
      { top: "85%", left: "40%", rotation: "-6deg", src: "/audience-spa.png" }   // Bottom Mid
    ];
  }, []);

  const [mainImage, setMainImage] = useState<string | null>(null);

  // SELECCIÓN ALEATORIA DE PORTADA: Elegimos una de las 8 imágenes cada vez que alguien entra
  useEffect(() => {
    const allImages = randomPositions.map(pos => pos.src);
    const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
    setMainImage(randomImg);
  }, [randomPositions]);

  // BLOQUEO INICIAL: Asegurar que al cargar la página el scroll esté bloqueado si no se ha "desbloqueado" el Hero aún.
  useEffect(() => {
    if (!isUnlocked) {
      setScrollLock(true);
    }
    // No necesitamos cleanup aquí porque ya hay un cleanup en los otros efectos
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isUnlocked) {
        if (e.deltaY < 0 && window.scrollY <= 0) {
          setIsUnlocked(false);
          setScrollLock(true);
          
          // ACTUALIZACIÓN DINÁMICA: Cambiamos la portada al regresar al tope con el wheel
          const allImages = randomPositions.map(pos => pos.src);
          const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
          setMainImage(randomImg);
        } else {
          return;
        }
      }

      setScale((prev) => {
        const delta = e.deltaY;
        const newScale = Math.max(0.35, Math.min(1, prev - delta / 1200));
        
        if (newScale <= 0.35 && !isUnlocked) {
          setIsUnlocked(true);
          setScrollLock(false);
        }
        
        return newScale;
      });
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isUnlocked]);

  useEffect(() => {
    const handleGlobalScroll = () => {
      if (isUnlocked && window.scrollY <= 0) {
        setIsUnlocked(false);
        setScrollLock(true);
        setScale(0.35);

        // ACTUALIZACIÓN DINÁMICA: Cambiamos la portada al regresar al tope
        const allImages = randomPositions.map(pos => pos.src);
        const randomImg = allImages[Math.floor(Math.random() * allImages.length)];
        setMainImage(randomImg);
      }
    };

    window.addEventListener("scroll", handleGlobalScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleGlobalScroll);
  }, [isUnlocked]);

  const setScrollLock = (locked: boolean) => {
    const mode = locked ? "hidden" : "auto";
    const overflowValue = locked ? "hidden" : "visible";
    
    document.documentElement.style.overflow = mode;
    document.documentElement.style.height = locked ? "100vh" : "auto";
    document.body.style.overflow = mode;
    document.body.style.height = locked ? "100vh" : "auto";
    
    const root = document.querySelector('[class*="rootContainer"]');
    if (root instanceof HTMLElement) {
       root.style.overflow = overflowValue;
       root.style.height = locked ? "100vh" : "auto";
    }
  };

  const mosaicOpacity = scale <= 0.6 
    ? (scale > 0.45 ? (0.6 - scale) / 0.15 : 0.4 + (scale - 0.35) / 0.1 * 0.6) 
    : 0;

  const videoOpacity = 0.5 + (scale - 0.35) / 0.65 * 0.5;
  const videoRotation = (1 - (scale - 0.35) / 0.65) * -3;

  return (
    <div className={styles.heroContainer}>
      <section 
        className={`${styles.heroWrapper} ${isUnlocked ? styles.unlockedHero : ""}`}
      >
        {/* 1. Quad Images */}
        <div className={styles.mosaicGrid} style={{ opacity: mosaicOpacity }}>
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
                sizes="22vw" 
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>

        {/* 2. Main Center Video */}
        <div 
          className={styles.mediaContainer}
          style={{ 
            transform: `translate(-50%, -50%) scale(${scale}) rotate(${scale <= 1 ? videoRotation : 0}deg)`,
            borderRadius: `${(1 - (scale - 0.35) / 0.65) * 40}px`,
            opacity: videoOpacity,
            overflow: "hidden"
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

        {/* 3. Titles */}
        <div className={styles.titles}>
          <h1 className={styles.bigTitle}>
            <span className={styles.preText}>Impulsa todo tu negocio con</span> Slotty.
          </h1>
          <div className={styles.partnerLogos}>
            {[...tenants, ...tenants].map((t, idx) => (
              <span key={`${t.id}-${idx}`}>{t.name.toUpperCase()}</span>
            ))}
            {tenants.length < 3 && (
              <>
                <span>SLOTTY PARTNER</span>
                <span>VANGUARD CUTS</span>
                <span>ELITE GROOMING</span>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
