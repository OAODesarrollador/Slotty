import { AdminPageShell, getRoleBadgeStyle, getAdminPageData } from "../_shared";
import { AdminServiceCreatePanel } from "@/components/admin-service-create-panel";
import { AdminServicesTable } from "@/components/admin-services-table";

export default async function OwnerServicesPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ date?: string; error?: string; notice?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const data = await getAdminPageData(slug, search);

  return (
    <AdminPageShell
      tenantName={data.tenant.tenantName}
      session={data.session}
      eyebrow="Gestion de servicios"
      description="CRUD de servicios, promociones y formato comercial."
      error={data.error}
      notice={data.notice}
    >
      <section className="stack" style={{ gap: 20 }}>
        <article className="card stack" style={{ padding: 24, gap: 20 }}>
          <div className="header-row">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">Gestion de servicios</span>
              <h2 style={{ fontSize: "1.45rem" }}>Aqui puedes crear, editar y eliminar servicios y promociones</h2>
            </div>
            <span className="status-pill" style={getRoleBadgeStyle(true)}>
              {data.services.filter((service) => service.is_promotion && service.is_active).length} promociones activas
            </span>
          </div>

          <AdminServiceCreatePanel tenantSlug={slug} />

          <AdminServicesTable
            tenantSlug={slug}
            services={data.services.map((service) => ({
              id: service.id,
              name: service.name,
              description: service.description,
              durationMinutes: service.duration_minutes,
              price: service.price,
              isPromotion: service.is_promotion,
              sortOrder: service.sort_order,
              isActive: service.is_active
            }))}
          />
        </article>
      </section>
    </AdminPageShell>
  );
}
