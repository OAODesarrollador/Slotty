import Link from "next/link";

type MobileDockProps = {
  tenantSlug: string;
  active: "home" | "services" | "queue";
};

const items = [
  { key: "home", label: "Inicio", short: "Hm", href: (tenant: string) => `/${tenant}` },
  { key: "services", label: "Servicios", short: "Sv", href: (tenant: string) => `/${tenant}/reservar` },
  { key: "queue", label: "Fila", short: "Q", href: (tenant: string) => `/${tenant}/fila` }
] as const;

export function MobileDock({ tenantSlug, active }: MobileDockProps) {
  return (
    <nav className="mobile-dock" aria-label="Navegacion inferior">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href(tenantSlug)}
          className={`dock-item ${active === item.key ? "is-active" : ""}`}
        >
          <span className="dock-icon">{item.short}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
