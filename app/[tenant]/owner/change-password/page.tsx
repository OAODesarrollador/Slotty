import { redirect } from "next/navigation";

import { requireSessionForTenant } from "@/lib/auth";

export default async function OwnerChangePasswordPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const session = await requireSessionForTenant(slug);

  if (!session.mustChangePassword) {
    redirect(`/${slug}/owner/dashboard`);
  }

  return (
    <main className="page admin-login-page admin-login-page--compact">
      <section className="shell shadow-2xl admin-login-card">
        <section className="stack" style={{ gap: "26px" }}>
          <div style={{ textAlign: "center" }}>
            <span className="eyebrow" style={{ letterSpacing: "4px" }}>DIBOK ADMIN</span>
            <h1 className="admin-login-title">Cambiá tu contraseña</h1>
            <p className="muted" style={{ marginTop: "8px" }}>
              Tu acceso fue restablecido por soporte. Definí una contraseña nueva para continuar.
            </p>
          </div>

          {search.error ? <div className="notice error">{search.error}</div> : null}
          {search.notice ? <div className="notice">{search.notice}</div> : null}

          <form method="post" action="/api/auth/change-password" className="stack" style={{ gap: "20px" }}>
            <label>
              Nueva contraseña
              <input name="password" type="password" required autoComplete="new-password" />
            </label>
            <label>
              Repetir nueva contraseña
              <input name="passwordConfirm" type="password" required autoComplete="new-password" />
            </label>
            <button className="btn" type="submit" style={{ width: "100%", height: "54px", fontSize: "1rem" }}>
              Guardar contraseña
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
