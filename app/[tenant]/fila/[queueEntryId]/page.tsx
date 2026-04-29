import Link from "next/link";

import { MobileDock } from "@/components/mobile-dock";
import { QueueStatusPanel } from "@/components/queue-status-panel";
import { requireTenantBySlug } from "@/lib/tenant";
import { getQueueEntryDetail } from "@/repositories/queue";

export default async function QueueDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string; queueEntryId: string }>;
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const { tenant: slug, queueEntryId } = await params;
  const search = await searchParams;
  const tenant = await requireTenantBySlug(slug);
  const queueEntry = await getQueueEntryDetail(tenant.tenantId, queueEntryId);

  if (!queueEntry) {
    return (
      <>
        <main className="page">
          <section className="shell-center">
            <article className="card stack">
              <span className="eyebrow">Fila</span>
              <h1 style={{ fontSize: "2rem" }}>No encontramos esa entrada</h1>
              <Link className="btn" href={`/${slug}/fila`}>
                Volver a la fila
              </Link>
            </article>
          </section>
        </main>
        <MobileDock tenantSlug={slug} active="queue" />
      </>
    );
  }

  return (
    <>
      <main className="page">
        <section className="shell-center">
          <QueueStatusPanel
            tenantSlug={slug}
            queueEntryId={queueEntryId}
            timezone={tenant.timezone}
            initialEntry={{
              ...queueEntry,
              peopleAhead: queueEntry.status === "waiting" ? Math.max((queueEntry.position ?? 1) - 1, 0) : 0
            }}
            initialError={search.error}
            cancelled={search.cancelled === "1"}
          />
        </section>
      </main>
      <MobileDock tenantSlug={slug} active="queue" />
    </>
  );
}
