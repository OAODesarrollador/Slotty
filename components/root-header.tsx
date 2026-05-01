"use client";

import Image from "next/image";
import Link from "next/link";

export function RootHeader() {
  return (
    <header className="main-header">
      <div className="header-inner">
        <Link href="/" className="nav-logo" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            className="brand-mark"
            aria-hidden="true"
            style={{
              display: "inline-flex",
              width: "118px",
              height: "42px",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden"
            }}
          >
            <Image
              className="brand-mark-logo brand-mark-logo-dark"
              src="/LogoBlancoTextoDibok.svg"
              alt=""
              width={131}
              height={48}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              priority
            />
            <Image
              className="brand-mark-logo brand-mark-logo-light"
              src="/LogoNegroTextoDibok.svg"
              alt=""
              width={131}
              height={48}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              priority
            />
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
