"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavHeaderProps = {
  tenantName: string;
  tenantSlug: string;
};

export function NavHeader({ tenantName, tenantSlug }: NavHeaderProps) {
  const pathname = usePathname();
  const usesLegacyTenantPath = pathname === `/${tenantSlug}` || pathname?.startsWith(`/${tenantSlug}/`);
  const tenantHref = (path = "/") => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return usesLegacyTenantPath
      ? `/${tenantSlug}${normalizedPath === "/" ? "" : normalizedPath}`
      : normalizedPath;
  };
  const isAdminArea = pathname?.startsWith(tenantHref("/owner/dashboard"));

  const isActive = (path: string) => {
    const href = tenantHref(path);
    if (href === tenantHref("/")) return pathname === href;
    return pathname?.startsWith(href);
  };

  if (isAdminArea) {
    const adminLinks = [
      { href: tenantHref("/owner/dashboard"), label: "Inicio" },
      { href: tenantHref("/owner/dashboard/turnos"), label: "Turnos" },
      { href: tenantHref("/owner/dashboard/servicios"), label: "Servicios" },
      { href: tenantHref("/owner/dashboard/empresa"), label: "Empresa" },
      { href: tenantHref("/owner/dashboard/analisis"), label: "Analisis" }
    ];

    return (
      <header className="admin-main-header">
        <div className="admin-header-inner">
          <Link href={tenantHref("/owner/dashboard")} className="admin-nav-logo">
            <span className="eyebrow" style={{ letterSpacing: "0.16em" }}>Administracion</span>
            <strong className="admin-brand-name">{tenantName}</strong>
          </Link>

          <nav className="admin-nav-links">
            {adminLinks.map((link) => {
              const active = link.href === tenantHref("/owner/dashboard")
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
        <Link href={tenantHref("/")} className="nav-logo">
          <span className="brand-name">
            {tenantName}
          </span>
        </Link>

        <nav className="nav-links">
          <Link href={tenantHref("/")} className={`nav-link ${pathname === tenantHref("/") ? "active" : ""}`}>
            Inicio
          </Link>
          <Link href={tenantHref("/reservar")} className={`nav-link ${isActive("/reservar") ? "active" : ""}`}>
            Servicios
          </Link>
          <Link href={tenantHref("/fila")} className={`nav-link ${isActive("/fila") ? "active" : ""}`}>
            Fila Virtual
          </Link>
        </nav>

        <div className="nav-actions">
          <Link href={tenantHref("/reservar")} className="btn">
            Reservar Ahora
          </Link>
        </div>
      </div>
    </header>
  );
}
