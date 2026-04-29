import Link from "next/link";

export default async function OwnerLoginPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const errorMessage = search.error === "rate_limited"
    ? "Demasiados intentos fallidos. Esperá unos minutos antes de volver a probar."
    : "Credenciales inválidas. Por favor, verificá tus datos.";

  return (
    <main className="page admin-login-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <section className="shell shadow-2xl" style={{ maxWidth: "480px", width: "100%", padding: "40px" }}>
        <section className="stack" style={{ gap: "32px" }}>
          <div style={{ textAlign: "center" }}>
            <span className="eyebrow" style={{ letterSpacing: "4px" }}>SLOTTY ADMIN</span>
            <h1 style={{ fontSize: "2rem", marginTop: "12px" }}>Centro de Operaciones</h1>
            <p className="muted" style={{ marginTop: "8px" }}>Ingresá como Administrador o Recepcionista para gestionar tu sede.</p>
          </div>

          {search.error && (
            <div className="card" style={{ 
              background: "rgba(255, 127, 127, 0.05)", 
              border: "1px solid rgba(255, 127, 127, 0.2)", 
              borderRadius: "16px", 
              padding: "16px", 
              display: "flex", 
              gap: "12px", 
              alignItems: "center",
              animation: "shake 0.4s ease"
            }}>
              <div style={{ color: "var(--danger)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <small style={{ color: "var(--danger)", fontWeight: 700 }}>{errorMessage}</small>
            </div>
          )}

          <form method="post" action="/api/auth/login" className="stack" style={{ gap: "24px" }}>
            <input type="hidden" name="tenantSlug" value={slug} />
            <div className="stack" style={{ gap: "20px" }}>
              <label>
                Email de Gestión
                <input 
                  name="email" 
                  type="email" 
                  placeholder="ejemplo@slotty.com" 
                  required 
                  defaultValue={slug === "slotty-platinum" ? "owner@slotty-platinum.test" : (slug === "gentleman-lab" ? "owner@gentleman-lab.test" : "owner@barberia-x.test")}
                />
              </label>
              <label>
                Contraseña
                <input 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  defaultValue="admin1234"
                />
              </label>
            </div>
            
            <button className="btn" type="submit" style={{ width: "100%", height: "60px", fontSize: "1.1rem" }}>
              Acceder al Panel
            </button>
          </form>

          <footer style={{ textAlign: "center", borderTop: "1px solid var(--line)", paddingTop: "24px" }}>
            <Link href={`/${slug}`} className="btn-secondary" style={{ background: "transparent", fontStyle: "italic", fontSize: "0.9rem" }}>
              ← Volver a la vista pública
            </Link>
          </footer>
        </section>
      </section>
    </main>
  );
}
