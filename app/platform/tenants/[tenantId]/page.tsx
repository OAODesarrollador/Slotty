import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformShell, formatPlatformCurrency } from "@/components/platform-shell";
import { requirePlatformSession } from "@/lib/platform-auth";
import { tenantPath } from "@/lib/tenant-domain";
import {
  getPlatformTenantDetail,
  getPlatformTenantMetrics,
  listPlatformTenantUsers,
  listPlatformTenantAuditLogs
} from "@/repositories/platform";

export default async function PlatformTenantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await requirePlatformSession();
  const { tenantId } = await params;
  const search = await searchParams;
  const tenant = await getPlatformTenantDetail(tenantId);

  if (!tenant) {
    notFound();
  }

  const [metrics, tenantUsers, auditLogs] = await Promise.all([
    getPlatformTenantMetrics(tenant.id),
    listPlatformTenantUsers(tenant.id),
    listPlatformTenantAuditLogs(tenant.id)
  ]);
  const canChangeTenantStatus = session.role === "platform_admin";
  const canSupportTenantUsers = session.role === "platform_admin" || session.role === "platform_support";

  return (
    <PlatformShell
      session={session}
      title={tenant.name}
      description="Detalle global read-only del tenant. No expone credenciales ni secretos de pago."
      error={search.error}
      notice={search.notice}
    >
      <section className="grid cols-4" style={{ gap: 16 }}>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Servicios</small>
          <strong style={{ fontSize: "2rem" }}>{metrics.services_count}</strong>
          <span className="status-pill">activos</span>
        </div>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Barberos</small>
          <strong style={{ fontSize: "2rem" }}>{metrics.barbers_count}</strong>
          <span className="status-pill">{metrics.users_count} usuarios</span>
        </div>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Turnos</small>
          <strong style={{ fontSize: "2rem" }}>{metrics.appointments_count}</strong>
          <span className="status-pill">{metrics.upcoming_appointments} futuros</span>
        </div>
        <div className="card stack" style={{ padding: 20, gap: 6 }}>
          <small className="muted">Cobrado aprobado</small>
          <strong style={{ fontSize: "2rem" }}>{formatPlatformCurrency(metrics.approved_revenue)}</strong>
          <span className="status-pill">{metrics.pending_payment_reviews} pagos pendientes</span>
        </div>
      </section>

      <section className="grid cols-2" style={{ gap: 18 }}>
        <div className="card stack" style={{ gap: 14, padding: 24 }}>
          <div>
            <span className="eyebrow">Identidad</span>
            <h2 style={{ fontSize: "1.5rem" }}>Datos del tenant</h2>
          </div>
          <div className="admin-table__service">
            <strong>Slug</strong>
            <small>{tenant.slug}</small>
          </div>
          <div className="admin-table__service">
            <strong>Estado</strong>
            <small>{tenant.is_active ? "Activo" : "Inactivo"} · {tenant.status}</small>
          </div>
          <div className="admin-table__service">
            <strong>Plan y billing</strong>
            <small>{tenant.plan} · {tenant.billing_status}</small>
          </div>
          <div className="admin-table__service">
            <strong>Contacto</strong>
            <small>{tenant.company_email || "Sin email"} · {tenant.company_phone || "Sin telefono"}</small>
          </div>
          <div className="admin-table__service">
            <strong>Dirección</strong>
            <small>{tenant.address || "Sin direccion"}</small>
          </div>
          <div className="admin-table__service">
            <strong>Zona horaria</strong>
            <small>{tenant.timezone}</small>
          </div>
        </div>

        <div className="card stack" style={{ gap: 14, padding: 24 }}>
          <div>
            <span className="eyebrow">Operación</span>
            <h2 style={{ fontSize: "1.5rem" }}>Salud de configuración</h2>
          </div>
          <div className="admin-table__service">
            <strong>Métodos de pago</strong>
            <small>
              {[
                tenant.allow_pay_at_store ? "local" : null,
                tenant.allow_bank_transfer ? "transferencia" : null,
                tenant.allow_mercado_pago ? "Mercado Pago" : null
              ].filter(Boolean).join(", ") || "Sin métodos habilitados"}
            </small>
          </div>
          <div className="admin-table__service">
            <strong>Mercado Pago</strong>
            <small>{tenant.mercado_pago_ready ? "Configurado" : "Incompleto o deshabilitado"}</small>
          </div>
          <div className="admin-table__service">
            <strong>Fila activa</strong>
            <small>{metrics.active_queue} clientes en estados operativos</small>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn-secondary" href={tenantPath(tenant.slug)}>Sitio público</Link>
            <Link className="btn-secondary" href={`/${tenant.slug}/owner/dashboard`}>Panel tenant</Link>
            <Link className="btn-secondary" href="/platform/tenants">Volver</Link>
          </div>
        </div>
      </section>

      <section className="card stack" style={{ gap: 18, padding: 24 }}>
        <div>
          <span className="eyebrow">Configuración SaaS</span>
          <h2 style={{ fontSize: "1.5rem" }}>Editar datos globales</h2>
        </div>
        {canChangeTenantStatus ? (
          <form method="post" action={`/api/platform/tenants/${tenant.id}/profile`} className="grid cols-2" style={{ gap: 14 }}>
            <label>Nombre<input name="name" defaultValue={tenant.name} required /></label>
            <label>Slug<input name="slug" defaultValue={tenant.slug} required /></label>
            <label>Email empresa<input name="companyEmail" type="email" defaultValue={tenant.company_email ?? ""} /></label>
            <label>Teléfono empresa<input name="companyPhone" defaultValue={tenant.company_phone ?? ""} /></label>
            <label>Dirección<input name="address" defaultValue={tenant.address ?? ""} /></label>
            <label>Zona horaria<input name="timezone" defaultValue={tenant.timezone} required /></label>
            <label>Estado
              <select name="status" defaultValue={tenant.status}>
                <option value="trial">Trial</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </label>
            <label>Plan
              <select name="plan" defaultValue={tenant.plan}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label>Billing
              <select name="billingStatus" defaultValue={tenant.billing_status}>
                <option value="ok">OK</option>
                <option value="pending">Pendiente</option>
                <option value="overdue">Vencido</option>
              </select>
            </label>
            <label>Fin de trial<input name="trialEndsAt" type="datetime-local" defaultValue={tenant.trial_ends_at ? tenant.trial_ends_at.slice(0, 16) : ""} /></label>
            <div><button type="submit" className="btn">Guardar configuración</button></div>
          </form>
        ) : (
          <div className="notice">Tu rol puede consultar estos datos, pero no editarlos.</div>
        )}
      </section>

      <section className="grid cols-2" style={{ gap: 18 }}>
        <div className="card stack" style={{ gap: 16, padding: 24 }}>
          <div>
            <span className="eyebrow">Control global</span>
            <h2 style={{ fontSize: "1.5rem" }}>Estado del tenant</h2>
          </div>
          <div className={`notice ${tenant.is_active ? "" : "error"}`}>
            {tenant.is_active
              ? "El tenant está activo y sus rutas públicas/owner resuelven normalmente."
              : "El tenant está inactivo: la resolución pública por slug devuelve no encontrado."}
          </div>
          {canChangeTenantStatus ? (
            <form method="post" action={`/api/platform/tenants/${tenant.id}/status`} className="stack" style={{ gap: 12 }}>
              <input type="hidden" name="isActive" value={tenant.is_active ? "false" : "true"} />
              <button type="submit" className={tenant.is_active ? "btn-secondary" : "btn"}>
                {tenant.is_active ? "Suspender tenant" : "Reactivar tenant"}
              </button>
              <small className="muted">
                Esta acción queda registrada en auditoría de plataforma.
              </small>
            </form>
          ) : (
            <div className="notice">
              Tu rol puede ver el estado, pero no modificarlo.
            </div>
          )}
        </div>

        <div className="card stack" style={{ gap: 16, padding: 24 }}>
          <div>
            <span className="eyebrow">Auditoría</span>
            <h2 style={{ fontSize: "1.5rem" }}>Últimas acciones</h2>
          </div>
          {auditLogs.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Todavía no hay acciones globales registradas para este tenant.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {auditLogs.map((log) => (
                <div key={log.id} className="admin-table__service" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <strong>{log.action}</strong>
                  <small>{log.actor_email} · {new Date(log.created_at).toLocaleString("es-AR")}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card stack" style={{ gap: 18, padding: 24 }}>
        <div className="header-row">
          <div>
            <span className="eyebrow">Soporte tenant</span>
            <h2 style={{ fontSize: "1.5rem" }}>Owners y staff</h2>
          </div>
          <span className="status-pill">{tenantUsers.length} usuarios</span>
        </div>

        {canSupportTenantUsers ? (
          <form method="post" action={`/api/platform/tenants/${tenant.id}/users`} className="grid cols-2" style={{ gap: 14 }}>
            <label>Nombre owner<input name="displayName" required /></label>
            <label>Email owner<input name="email" type="email" required /></label>
            <label>Contraseña<input name="password" type="password" required /></label>
            <label>Repetir contraseña<input name="passwordConfirm" type="password" required /></label>
            <div><button type="submit" className="btn-secondary">Crear owner</button></div>
          </form>
        ) : null}

        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Soporte</th>
              </tr>
            </thead>
            <tbody>
              {tenantUsers.map((user) => (
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
                    {canSupportTenantUsers ? (
                      <form method="post" action={`/api/platform/tenants/${tenant.id}/users/${user.id}/password`} className="grid cols-2" style={{ gap: 8, minWidth: 360 }}>
                        <input name="password" type="password" placeholder="Nueva contraseña" required />
                        <input name="passwordConfirm" type="password" placeholder="Repetir contraseña" required />
                        <input name="reason" placeholder="Motivo del reset" required />
                        <button className="btn-secondary" type="submit">Resetear</button>
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
