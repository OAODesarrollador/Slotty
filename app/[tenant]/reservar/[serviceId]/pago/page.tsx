import { notFound } from "next/navigation";

import { requireTenantBySlug } from "@/lib/tenant";
import { listBarbersForService } from "@/repositories/barbers";
import { getServiceById } from "@/repositories/services";
import { getTenantSettings } from "@/repositories/tenants";
import { computePaymentBreakdown } from "@/services/payments";
import { PaymentForm } from "@/components/payment-form";

export default async function PaymentPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string; serviceId: string }>;
  searchParams: Promise<{ barberId?: string; start?: string; error?: string }>;
}) {
  const { tenant: slug, serviceId } = await params;
  const search = await searchParams;
  const tenant = await requireTenantBySlug(slug);
  const [service, settings, barbers] = await Promise.all([
    getServiceById(tenant.tenantId, serviceId),
    getTenantSettings(tenant.tenantId),
    listBarbersForService(tenant.tenantId, serviceId)
  ]);

  if (!service || !settings || !search.barberId || !search.start) {
    notFound();
  }

  const barber = barbers.find((item) => item.id === search.barberId);
  if (!barber) {
    notFound();
  }

  const breakdown = computePaymentBreakdown(Number(service.price), settings);

  return (
    <main className="page">
      <PaymentForm
        slug={slug}
        serviceId={serviceId}
        barberId={search.barberId}
        start={search.start}
        serviceName={service.name}
        barberName={barber.full_name}
        tenantName={tenant.tenantName}
        timezone={tenant.timezone}
        allowPayAtStore={settings.allow_pay_at_store}
        allowBankTransfer={settings.allow_bank_transfer}
        allowMercadoPago={settings.allow_mercado_pago}
        breakdown={breakdown}
        initialError={search.error}
      />
    </main>
  );
}
