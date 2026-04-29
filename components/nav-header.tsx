"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavHeaderProps = {
  tenantName: string;
  tenantSlug: string;
};

export function NavHeader({ tenantName, tenantSlug }: NavHeaderProps) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith(`/${tenantSlug}/owner/dashboard`);

  const isActive = (path: string) => {
    if (path === `/${tenantSlug}`) return pathname === path;
    return pathname?.startsWith(path);
  };

  if (isAdminArea) {
    const adminLinks = [
      { href: `/${tenantSlug}/owner/dashboard`, label: "Inicio" },
      { href: `/${tenantSlug}/owner/dashboard/turnos`, label: "Turnos" },
      { href: `/${tenantSlug}/owner/dashboard/servicios`, label: "Servicios" },
      { href: `/${tenantSlug}/owner/dashboard/empresa`, label: "Empresa" },
      { href: `/${tenantSlug}/owner/dashboard/analisis`, label: "Analisis" }
    ];

    return (
      <header className="admin-main-header">
        <div className="admin-header-inner">
          <Link href={`/${tenantSlug}/owner/dashboard`} className="admin-nav-logo">
            <span className="eyebrow" style={{ letterSpacing: "0.16em" }}>Administracion</span>
            <strong className="admin-brand-name">{tenantName}</strong>
          </Link>

          <nav className="admin-nav-links">
            {adminLinks.map((link) => {
              const active = link.href === `/${tenantSlug}/owner/dashboard`
                ? pathname === link.href
                : pathname === link.href || pathname?.startsWith(`${link.href}/`);

              return (
                <Link key={link.href} href={link.href} className={`admin-nav-link ${active ? "active" : ""}`}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="admin-nav-actions">
            <form method="post" action="/api/auth/logout">
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <button type="submit" className="btn-ghost">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
    );
  }

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
