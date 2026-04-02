import { NavHeader } from "@/components/nav-header";
import { requireTenantBySlug } from "@/lib/tenant";

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

  return (
    <>
      <NavHeader tenantName={tenant.tenantName} tenantSlug={slug} />
      {children}
    </>
  );
}
