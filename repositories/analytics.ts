import { query } from "@/lib/db";

export async function getTenantAnalyticsSummary(tenantId: string) {
  const [appointmentMetrics, paymentMetrics, queueMetrics] = await Promise.all([
    query<{
      total_appointments: string;
      today_appointments: string;
      completed_appointments: string;
      cancelled_appointments: string;
      no_show_appointments: string;
    }>(
      `
        SELECT
          COUNT(*)::text AS total_appointments,
          COUNT(*) FILTER (WHERE datetime_start >= date_trunc('day', now()) AND datetime_start < date_trunc('day', now()) + interval '1 day')::text AS today_appointments,
          COUNT(*) FILTER (WHERE status = 'completed')::text AS completed_appointments,
          COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled_appointments,
          COUNT(*) FILTER (WHERE status = 'no_show')::text AS no_show_appointments
        FROM appointments
        WHERE tenant_id = $1
      `,
      [tenantId]
    ),
    query<{
      total_revenue: string;
      paid_revenue: string;
      pending_revenue: string;
    }>(
      `
        SELECT
          COALESCE(SUM(total_amount), 0)::text AS total_revenue,
          COALESCE(SUM(amount_paid), 0)::text AS paid_revenue,
          COALESCE(SUM(amount_required_now - amount_paid) FILTER (WHERE status IN ('pending', 'pending_verification')), 0)::text AS pending_revenue
        FROM payments
        WHERE tenant_id = $1
      `,
      [tenantId]
    ),
    query<{
      waiting_queue: string;
      active_queue: string;
    }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'waiting')::text AS waiting_queue,
          COUNT(*) FILTER (WHERE status IN ('waiting', 'called', 'in_progress'))::text AS active_queue
        FROM queue_entries
        WHERE tenant_id = $1
      `,
      [tenantId]
    )
  ]);

  return {
    appointments: appointmentMetrics.rows[0],
    payments: paymentMetrics.rows[0],
    queue: queueMetrics.rows[0]
  };
}

export async function getAppointmentsByBarberSummary(tenantId: string) {
  const result = await query<{
    barber_id: string;
    barber_name: string;
    total_appointments: string;
    completed_appointments: string;
    generated_revenue: string;
  }>(
    `
      SELECT
        b.id AS barber_id,
        b.full_name AS barber_name,
        COUNT(a.id)::text AS total_appointments,
        COUNT(a.id) FILTER (WHERE a.status = 'completed')::text AS completed_appointments,
        COALESCE(SUM(p.amount_paid), 0)::text AS generated_revenue
      FROM barbers b
      LEFT JOIN appointments a
        ON a.barber_id = b.id
       AND a.tenant_id = b.tenant_id
      LEFT JOIN payments p
        ON p.appointment_id = a.id
       AND p.tenant_id = a.tenant_id
      WHERE b.tenant_id = $1
      GROUP BY b.id, b.full_name
      ORDER BY b.full_name ASC
    `,
    [tenantId]
  );

  return result.rows;
}
