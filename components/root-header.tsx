"use client";

import Image from "next/image";
import Link from "next/link";

export function RootHeader() {
  return (
    <header className="main-header">
      <div className="header-inner">
        <Link href="/" className="nav-logo" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              width: "30px",
              height: "30px",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden"
            }}
          >
            <Image
              src="/LogoSlottySolo.png"
              alt=""
              width={30}
              height={30}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              priority
            />
          </span>
          <span className="brand-name" style={{ letterSpacing: "0.02em", fontWeight: 700 }}>
            Slotty
          </span>
        </Link>

        <nav className="nav-links">
          <Link href="#solutions" className="nav-link">Problemas</Link>
          <Link href="#benefits" className="nav-link">Beneficios</Link>
          <Link href="#demo" className="nav-link">Demo</Link>
        </nav>

        <div className="nav-actions">
          <Link href="#start" className="btn">
            Solicitar Acceso
          </Link>
        </div>
      </div>
    </header>
  );
}
