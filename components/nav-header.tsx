"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavHeaderProps = {
  tenantName: string;
  tenantSlug: string;
};

export function NavHeader({ tenantName, tenantSlug }: NavHeaderProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === `/${tenantSlug}`) return pathname === path;
    return pathname?.startsWith(path);
  };

  return (
    <header className="main-header">
      <div className="header-inner">
        <Link href={`/${tenantSlug}`} className="nav-logo">
          <span className="brand-name">
            {tenantName}
          </span>
        </Link>

        <nav className="nav-links">
          <Link href={`/${tenantSlug}`} className={`nav-link ${pathname === `/${tenantSlug}` ? "active" : ""}`}>
            Inicio
          </Link>
          <Link href={`/${tenantSlug}/reservar`} className={`nav-link ${isActive(`/${tenantSlug}/reservar`) ? "active" : ""}`}>
            Servicios
          </Link>
          <Link href={`/${tenantSlug}/fila`} className={`nav-link ${isActive(`/${tenantSlug}/fila`) ? "active" : ""}`}>
            Fila Virtual
          </Link>
        </nav>

        <div className="nav-actions">
          <Link href={`/${tenantSlug}/reservar`} className="btn">
            Reservar Ahora
          </Link>
        </div>
      </div>
    </header>
  );
}
