import { redirect } from "next/navigation";

import { getPlatformSession } from "@/lib/platform-auth";

export default async function PlatformLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getPlatformSession();
  if (session) {
    redirect("/platform");
  }

  const search = await searchParams;
  const errorMessage = search.error === "rate_limited"
    ? "Demasiados intentos fallidos. Esperá unos minutos antes de volver a probar."
    : "Credenciales inválidas. Verificá tus datos.";

  return (
    <main className="page admin-login-page admin-login-page--compact">
      <section className="shell shadow-2xl admin-login-card">
        <section className="stack" style={{ gap: "26px" }}>
          <div style={{ textAlign: "center" }}>
            <span className="eyebrow" style={{ letterSpacing: "4px" }}>DIBOK PLATFORM</span>
            <h1 className="admin-login-title">Administración Global</h1>
            <p className="muted" style={{ marginTop: "8px" }}>Acceso interno de la plataforma.</p>
          </div>

          {search.error ? (
            <div className="notice error">
              {errorMessage}
            </div>
          ) : null}

          <form method="post" action="/api/platform/auth/login" className="stack" style={{ gap: "20px" }}>
            <label>
              Email
              <input name="email" type="email" placeholder="admin@dibok.com" required />
            </label>
            <label>
              Contraseña
              <input name="password" type="password" placeholder="••••••••" required />
            </label>
            <button className="btn" type="submit" style={{ width: "100%", height: "54px", fontSize: "1rem" }}>
              Acceder
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
