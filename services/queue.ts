import { withTransaction } from "@/lib/db";
import { getServiceById } from "@/repositories/services";
import { getTenantSettings } from "@/repositories/tenants";
import { insertQueueEntry } from "@/repositories/queue";
import { findBestImmediateAssignment } from "@/services/availability";
import { createAppointmentWithClient } from "@/services/booking";

export async function createWalkInQueueEntry(input: {
  tenant: { tenantId: string; timezone: string };
  serviceId: string;
  customer: { fullName: string; phone: string; email?: string | null };
}) {
  const [best, service, tenantSettings] = await Promise.all([
    findBestImmediateAssignment(input.tenant, input.serviceId),
    getServiceById(input.tenant.tenantId, input.serviceId),
    getTenantSettings(input.tenant.tenantId)
  ]);

  if (!best || !service || !tenantSettings) {
    throw new Error("No hay barberos disponibles para este servicio.");
  }

  return withTransaction(async (client) => {
    const appointment = await createAppointmentWithClient(
      client,
      {
        tenantId: input.tenant.tenantId,
        barberId: best.barberId,
        serviceId: input.serviceId,
        datetimeStart: new Date(best.start),
        paymentMethod: "pay_at_store",
        customer: input.customer,
        source: "walk_in"
      },
      {
        service,
        tenant: tenantSettings
      }
    );

    const queueEntry = await insertQueueEntry(client, {
      tenantId: input.tenant.tenantId,
      customerId: appointment.customerId,
      serviceId: input.serviceId,
      estimatedStart: new Date(best.start),
      assignedBarberId: best.barberId,
      assignedAppointmentId: appointment.appointmentId
    });

    return {
      queueEntryId: queueEntry.id,
      appointmentId: appointment.appointmentId,
      assignedBarberId: best.barberId,
      estimatedStart: best.start
    };
  });
}
