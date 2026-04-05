"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function RootHeader() {
  const pathname = usePathname();

  return (
    <header className="main-header">
      <div className="header-inner">
        <Link href="/" className="nav-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="logo-square" style={{ width: "22px", height: "22px", borderRadius: "1px" }} />
          <span className="brand-name" style={{ letterSpacing: "0.05em", fontWeight: 700, fontFamily: "var(--font-serif)" }}>
            Slotty
          </span>
        </Link>

        <nav className="nav-links">
          <Link href="#soluciones" className="nav-link">Soluciones</Link>
          <Link href="#ecosistema" className="nav-link">Ecosistema</Link>
          <Link href="#sedes" className="nav-link">Sedes</Link>
        </nav>

      </div>
    </header>
  );
}
