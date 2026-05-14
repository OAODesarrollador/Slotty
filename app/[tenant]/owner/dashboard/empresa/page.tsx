import Link from "next/link";
import { AdminCompanySettingsForm } from "@/components/admin-company-settings-form";
import { BarberPhotoInput } from "@/components/barber-photo-input";
import { AdminBarberCreatePanel, AdminCompanyBarbersTable, AdminCompanyUsersTable } from "@/components/admin-company-tables";
import { AdminCreateTogglePanel } from "@/components/admin-create-toggle-panel";
import { AdminSensitiveCompanyFields } from "@/components/admin-sensitive-company-fields";
import { AdminUserCreatePanel } from "@/components/admin-user-create-panel";
import { AdminPageShell, WEEKDAY_LABELS, getAdminPageData } from "../_shared";

const COMPANY_TABS = [
  { key: "datos", label: "Datos de la empresa", description: "Configuracion y cobros" },
  { key: "barberos", label: "Barberos", description: "Perfiles, servicios y horarios" },
  { key: "usuarios", label: "Usuarios", description: "Accesos internos" }
] as const;

const SYSTEM_LOGO_URL = "/LogoNegroDibok.svg";

type CompanyTab = (typeof COMPANY_TABS)[number]["key"];

function getCompanyTab(value?: string): CompanyTab {
  return COMPANY_TABS.some((tab) => tab.key === value) ? (value as CompanyTab) : "datos";
}

export default async function OwnerCompanyPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ date?: string; error?: string; notice?: string; tab?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const activeTab = getCompanyTab(search.tab);
  const data = await getAdminPageData(slug, search);
  const activeServices = data.services.filter((service) => service.is_active);

  return (
    <AdminPageShell
      tenantName={data.tenant.tenantName}
      session={data.session}
      eyebrow="Datos de la empresa"
      description="Empresa, barberos, horarios, medios de cobro y usuarios."
      error={data.error}
      notice={data.notice}
    >
      <section className="stack" style={{ gap: 20 }}>
        <div className="admin-tabs" aria-label="Secciones de administracion de empresa">
          {COMPANY_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/${slug}/owner/dashboard/empresa?tab=${tab.key}`}
              className={`admin-tab ${activeTab === tab.key ? "is-active" : ""}`}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              <strong>{tab.label}</strong>
              <small>{tab.description}</small>
            </Link>
          ))}
        </div>

        {activeTab === "datos" ? (
          <article className="card stack" style={{ padding: 24, gap: 18 }}>
            <div className="header-row">
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow">Empresa</span>
                <h2 style={{ fontSize: "1.45rem" }}>Configuracion general y cobros</h2>
              </div>
            </div>

            {data.tenantSettings ? (
              <AdminCompanySettingsForm tenantSlug={slug} action={`/api/owner/${slug}/admin`}>
                <input type="hidden" name="intent" value="company-update" />
                <input type="hidden" name="section" value="company" />
                <div className="grid cols-2" style={{ gap: 12 }}>
                  <label>Nombre<input name="name" defaultValue={data.tenantSettings.name} disabled={!data.isAdmin} /></label>
                  <label>Timezone<input name="timezone" defaultValue={data.tenantSettings.timezone} disabled={!data.isAdmin} /></label>
                  <label>Telefono<input name="companyPhone" defaultValue={data.tenantSettings.company_phone ?? ""} disabled={!data.isAdmin} /></label>
                  <label>Email<input name="companyEmail" defaultValue={data.tenantSettings.company_email ?? ""} disabled={!data.isAdmin} /></label>
                  <label>Direccion<input name="address" defaultValue={data.tenantSettings.address ?? ""} disabled={!data.isAdmin} /></label>
                  <label>Instagram<input name="instagramUrl" defaultValue={data.tenantSettings.instagram_url ?? ""} disabled={!data.isAdmin} /></label>

                  <label>Tipo de adelanto<input name="depositType" defaultValue={data.tenantSettings.deposit_type} disabled={!data.isAdmin} /></label>
                  <label>Monto de adelanto<input name="depositValue" type="number" step="0.01" defaultValue={data.tenantSettings.deposit_value} disabled={!data.isAdmin} /></label>
                </div>
                <input type="hidden" name="logoUrl" defaultValue={data.tenantSettings.logo_url ?? ""} />
                <input type="hidden" name="heroImageUrl" defaultValue={data.tenantSettings.hero_image_url ?? ""} />
                <div className="admin-company-media-grid">
                  <BarberPhotoInput
                    name="logoImageFile"
                    currentPhotoUrl={data.tenantSettings.logo_url ?? SYSTEM_LOGO_URL}
                    variant="logo"
                    label="Logo de la empresa"
                    previewAlt={`Logo de ${data.tenantSettings.name}`}
                    disabled={!data.isAdmin}
                  />
                  <BarberPhotoInput
                    name="heroImageFile"
                    currentPhotoUrl={data.tenantSettings.hero_image_url}
                    variant="cover"
                    label="Foto de fondo de la pagina principal"
                    previewAlt={`Foto de fondo de ${data.tenantSettings.name}`}
                    disabled={!data.isAdmin}
                  />
                </div>
                <div className="admin-company-payment-options">
                  <label><input type="checkbox" name="requiresDeposit" defaultChecked={data.tenantSettings.requires_deposit} disabled={!data.isAdmin} /><span>Cobra adelanto</span></label>
                  <label><input type="checkbox" name="allowPayAtStore" defaultChecked={data.tenantSettings.allow_pay_at_store} disabled={!data.isAdmin} /><span>Pagar en local</span></label>
                  <label><input type="checkbox" name="allowBankTransfer" defaultChecked={data.tenantSettings.allow_bank_transfer} disabled={!data.isAdmin} /><span>Transferencia</span></label>
                  <label><input type="checkbox" name="allowMercadoPago" defaultChecked={data.tenantSettings.allow_mercado_pago} disabled={!data.isAdmin} /><span>Mercado Pago</span></label>
                </div>
                <AdminSensitiveCompanyFields tenantSlug={slug} disabled={!data.isAdmin} />
                {data.isAdmin ? <div><button className="btn" type="submit">Guardar empresa</button></div> : null}
              </AdminCompanySettingsForm>
            ) : null}
          </article>
        ) : null}

        {activeTab === "barberos" ? (
          <article className="card stack" style={{ padding: 24, gap: 18 }}>
            <div className="header-row">
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow">Barberos</span>
                <h2 style={{ fontSize: "1.45rem" }}>Gestion de barberos con foto, servicios y horarios</h2>
              </div>
              <span className="status-pill">{data.barbers.length} perfiles</span>
            </div>

            {data.isAdmin ? (
              <AdminCreateTogglePanel closedLabel="Crear barbero" openLabel="Ocultar formulario">
                <AdminBarberCreatePanel
                  tenantSlug={slug}
                  services={activeServices.map((service) => ({ id: service.id, name: service.name }))}
                  weekdayLabels={[...WEEKDAY_LABELS]}
                />
              </AdminCreateTogglePanel>
            ) : null}

            <AdminCompanyBarbersTable
              tenantSlug={slug}
              canEdit={data.isAdmin}
              weekdayLabels={[...WEEKDAY_LABELS]}
              services={activeServices.map((service) => ({ id: service.id, name: service.name }))}
              users={data.users.map((user) => ({ id: user.id, displayName: user.display_name }))}
              barbers={data.barbers.map((barber) => ({
                id: barber.id,
                fullName: barber.full_name,
                bio: barber.bio,
                photoUrl: barber.photo_url,
                rating: barber.rating,
                userId: barber.user_id,
                isActive: barber.is_active,
                serviceIds: data.serviceIdsByBarber.get(barber.id) ?? [],
                workingHours: (data.workingHoursByBarber.get(barber.id) ?? []).map((row) => ({
                  dayOfWeek: row.day_of_week,
                  startTime: row.start_time,
                  endTime: row.end_time
                }))
              }))}
            />
          </article>
        ) : null}

        {activeTab === "usuarios" ? (
          <article className="card stack" style={{ padding: 24, gap: 18 }}>
            <div className="header-row">
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow">Usuarios</span>
                <h2 style={{ fontSize: "1.45rem" }}>Administrador y Recepcionista</h2>
              </div>
              <span className="status-pill">{data.users.length} usuarios</span>
            </div>

            {!data.canEditUsers ? <div className="notice">Solo el Administrador puede editar usuarios.</div> : null}

            {data.canEditUsers ? <AdminUserCreatePanel tenantSlug={slug} /> : null}

            <AdminCompanyUsersTable
              tenantSlug={slug}
              canEdit={data.canEditUsers}
              users={data.users.map((user) => ({
                id: user.id,
                displayName: user.display_name,
                email: user.email,
                role: user.role,
                isActive: user.is_active
              }))}
            />
          </article>
        ) : null}
      </section>
    </AdminPageShell>
  );
}
