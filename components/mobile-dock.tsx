"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileDockProps = {
  tenantSlug: string;
  active: "home" | "services" | "queue";
};

const items = [
  { key: "home", label: "Inicio", short: "Hm", href: "/" },
  { key: "services", label: "Servicios", short: "Sv", href: "/reservar" },
  { key: "queue", label: "Fila", short: "Q", href: "/fila" }
] as const;

export function MobileDock({ tenantSlug, active }: MobileDockProps) {
  const pathname = usePathname();
  const usesLegacyTenantPath = pathname === `/${tenantSlug}` || pathname?.startsWith(`/${tenantSlug}/`);
  const tenantHref = (path = "/") => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return usesLegacyTenantPath
      ? `/${tenantSlug}${normalizedPath === "/" ? "" : normalizedPath}`
      : normalizedPath;
  };

  return (
    <nav className="mobile-dock" aria-label="Navegacion inferior">
      {items.map((item) => (
        <Link
          key={item.key}
          href={tenantHref(item.href)}
          className={`dock-item ${active === item.key ? "is-active" : ""}`}
        >
          <span className="dock-icon">{item.short}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
