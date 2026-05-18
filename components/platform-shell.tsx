import Link from "next/link";
import type { ReactNode } from "react";

import type { PlatformSessionUser } from "@/lib/platform-auth";

export function formatPlatformCurrency(value: string | number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function PlatformShell({
  session,
  title,
  description,
  error,
  notice,
  children
}: {
  session: PlatformSessionUser;
  title: string;
  description: string;
  error?: string;
  notice?: string;
  children: ReactNode;
}) {
  return (
    <main className="page admin-page" style={{ padding: "140px 24px 80px" }}>
      <section className="shell stack" style={{ gap: 28 }}>
        <header className="stack" style={{ gap: 16 }}>
          <div className="header-row" style={{ alignItems: "start" }}>
            <div className="stack" style={{ gap: 8, maxWidth: 780 }}>
              <span className="eyebrow">Administración global</span>
              <h1 style={{ fontSize: "2.3rem", lineHeight: 1.02 }}>{title}</h1>
              <p className="page-lead" style={{ maxWidth: 760, margin: 0 }}>
                {description}
              </p>
            </div>
            <div className="card stack" style={{ gap: 10, minWidth: 280, padding: 18 }}>
              <small className="muted">Usuario plataforma</small>
              <strong style={{ fontSize: "1.05rem" }}>{session.displayName}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="status-pill">{session.role}</span>
                <span className="status-pill">{session.email}</span>
              </div>
              <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Navegación plataforma">
                <Link className="btn-secondary" href="/platform">Dashboard</Link>
                <Link className="btn-secondary" href="/platform/tenants">Tenants</Link>
                <Link className="btn-secondary" href="/platform/users">Usuarios</Link>
                <Link className="btn-secondary" href="/platform/audit">Auditoría</Link>
              </nav>
              <form method="post" action="/api/platform/auth/logout">
                <button type="submit" className="btn-secondary" style={{ width: "100%" }}>Cerrar sesión</button>
              </form>
            </div>
          </div>

          {error ? <div className="notice error">{error}</div> : null}
          {notice ? <div className="notice">{notice}</div> : null}
        </header>

        {children}
      </section>
    </main>
  );
}
