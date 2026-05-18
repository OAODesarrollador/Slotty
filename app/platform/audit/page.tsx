import Link from "next/link";

import { PlatformShell } from "@/components/platform-shell";
import { requirePlatformSession } from "@/lib/platform-auth";
import { listPlatformAuditLogs } from "@/repositories/platform";

export default async function PlatformAuditPage() {
  const session = await requirePlatformSession();
  const logs = await listPlatformAuditLogs();

  return (
    <PlatformShell
      session={session}
      title="Auditoría"
      description="Registro global de acciones sensibles ejecutadas desde la plataforma."
    >
      <section className="card stack" style={{ gap: 18, padding: 24 }}>
        <div>
          <span className="eyebrow">Últimas 200 acciones</span>
          <h2 style={{ fontSize: "1.5rem" }}>Eventos globales</h2>
        </div>
        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Acción</th>
                <th>Destino</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString("es-AR")}</td>
                  <td>{log.actor_email}</td>
                  <td>{log.action}</td>
                  <td>
                    {log.target_type === "tenant" && log.target_id
                      ? <Link href={`/platform/tenants/${log.target_id}`}>tenant</Link>
                      : log.target_type}
                  </td>
                  <td><small>{JSON.stringify(log.metadata)}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PlatformShell>
  );
}
