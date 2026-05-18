import { PlatformShell } from "@/components/platform-shell";
import { requirePlatformSession } from "@/lib/platform-auth";
import { listPlatformUsers } from "@/repositories/platform-users";

export default async function PlatformUsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await requirePlatformSession();
  const search = await searchParams;
  const users = await listPlatformUsers();
  const canEdit = session.role === "platform_admin";

  return (
    <PlatformShell
      session={session}
      title="Usuarios plataforma"
      description="Gestión de accesos internos globales, separada de usuarios owner/staff de tenants."
      error={search.error}
      notice={search.notice}
    >
      {canEdit ? (
        <section className="card stack" style={{ gap: 18, padding: 24 }}>
          <div>
            <span className="eyebrow">Nuevo usuario</span>
            <h2 style={{ fontSize: "1.5rem" }}>Crear acceso interno</h2>
          </div>
          <form method="post" action="/api/platform/users" className="grid cols-2" style={{ gap: 14 }}>
            <label>Nombre<input name="displayName" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Rol
              <select name="role" defaultValue="platform_readonly">
                <option value="platform_admin">Admin</option>
                <option value="platform_support">Soporte</option>
                <option value="platform_readonly">Solo lectura</option>
              </select>
            </label>
            <span />
            <label>Contraseña<input name="password" type="password" required /></label>
            <label>Repetir contraseña<input name="passwordConfirm" type="password" required /></label>
            <div><button className="btn" type="submit">Crear usuario</button></div>
          </form>
        </section>
      ) : null}

      <section className="card stack" style={{ gap: 18, padding: 24 }}>
        <div>
          <span className="eyebrow">Equipo interno</span>
          <h2 style={{ fontSize: "1.5rem" }}>Usuarios</h2>
        </div>
        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-table__service">
                      <strong>{user.display_name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`admin-table__badge ${user.is_active ? "is-active" : "is-inactive"}`}>
                      {user.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    {canEdit ? (
                      <form method="post" action={`/api/platform/users/${user.id}`} className="grid cols-2" style={{ gap: 8, minWidth: 420 }}>
                        <input type="hidden" name="email" value={user.email} />
                        <input type="hidden" name="displayName" value={user.display_name} />
                        <select name="role" defaultValue={user.role}>
                          <option value="platform_admin">Admin</option>
                          <option value="platform_support">Soporte</option>
                          <option value="platform_readonly">Solo lectura</option>
                        </select>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" name="isActive" defaultChecked={user.is_active} />
                          <span>Activo</span>
                        </label>
                        <input name="password" type="password" placeholder="Nueva contraseña opcional" />
                        <input name="passwordConfirm" type="password" placeholder="Repetir nueva contraseña" />
                        <button className="btn-secondary" type="submit">Guardar</button>
                      </form>
                    ) : "Solo lectura"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PlatformShell>
  );
}
