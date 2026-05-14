import { NavHeader } from "@/components/nav-header";
import { TenantPublicFooter } from "@/components/tenant-public-footer";
import { requireTenantBySlug } from "@/lib/tenant";
import { getTenantSettings } from "@/repositories/tenants";

export const dynamic = "force-dynamic";

export default async function TenantLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode, 
  params: Promise<{ tenant: string }> 
}) {
  const { tenant: slug } = await params;
  const tenant = await requireTenantBySlug(slug);
  const tenantSettings = await getTenantSettings(tenant.tenantId);

  return (
    <>
      <NavHeader tenantName={tenant.tenantName} tenantSlug={slug} tenantLogoUrl={tenantSettings?.logo_url} />
      {children}
      <TenantPublicFooter
        tenantSlug={slug}
        tenantName={tenantSettings?.name ?? tenant.tenantName}
        logoUrl={tenantSettings?.logo_url}
        phone={tenantSettings?.company_phone}
        email={tenantSettings?.company_email}
        address={tenantSettings?.address}
        instagramUrl={tenantSettings?.instagram_url}
      />
    </>
  );
}
