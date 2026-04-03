import { MobileDock } from "@/components/mobile-dock";
import { QuickBookingFlow } from "@/components/quick-booking-flow";
import { dateKeyInTimeZone, nowInTimeZone } from "@/lib/time";
import { requireTenantBySlug } from "@/lib/tenant";
import { listBarbersForService } from "@/repositories/barbers";
import { listPublicServices } from "@/repositories/services";
import { getTenantSettings } from "@/repositories/tenants";

export default async function ServicesPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ serviceId?: string; barberId?: string; start?: string; date?: string; error?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const tenant = await requireTenantBySlug(slug);
  const [services, tenantSettings] = await Promise.all([
    listPublicServices(tenant.tenantId),
    getTenantSettings(tenant.tenantId)
  ]);
  const barbersByServiceEntries = await Promise.all(
    services.map(async (service) => [service.id, await listBarbersForService(tenant.tenantId, service.id)] as const)
  );
  const todayDate = dateKeyInTimeZone(nowInTimeZone(tenant.timezone), tenant.timezone);
  const initialDate = search.date ?? (search.start ? search.start.slice(0, 10) : todayDate);

  return (
    <>
      <QuickBookingFlow
        slug={slug}
        tenantName={tenant.tenantName}
        timezone={tenant.timezone}
        services={services}
        barbersByService={Object.fromEntries(barbersByServiceEntries)}
        paymentSettings={tenantSettings ? {
          depositType: tenantSettings.deposit_type,
          depositValue: tenantSettings.deposit_value,
          allowPayAtStore: tenantSettings.allow_pay_at_store,
          allowBankTransfer: tenantSettings.allow_bank_transfer,
          allowMercadoPago: tenantSettings.mercado_pago_ready,
          transferAlias: tenantSettings.transfer_alias,
          transferCbu: tenantSettings.transfer_cbu,
          transferHolderName: tenantSettings.transfer_holder_name,
          transferBankName: tenantSettings.transfer_bank_name
        } : null}
        initialServiceId={search.serviceId}
        initialDate={initialDate}
        minDate={todayDate}
        initialBarberId={search.barberId}
        initialSlotStart={search.start}
        initialError={search.error}
      />
      <MobileDock tenantSlug={slug} active="services" />
    </>
  );
}
