import { query, withTransaction } from "@/lib/db";
import type { PlatformSessionUser } from "@/lib/platform-auth";
import type { PoolClient } from "pg";

export type TenantPlatformStatus = "trial" | "active" | "suspended" | "cancelled";
export type TenantPlatformPlan = "starter" | "pro" | "enterprise";
export type TenantBillingStatus = "ok" | "pending" | "overdue";

async function insertPlatformAuditLog(
  client: PoolClient,
  input: {
    actor: PlatformSessionUser;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await client.query(
    `
      INSERT INTO platform_audit_logs (
        actor_platform_user_id,
        actor_email,
        action,
        target_type,
        target_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      input.actor.userId,
      input.actor.email,
      input.action,
      input.targetType,
      input.targetId ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

export async function getPlatformDashboardSummary() {
  const result = await query<{
    total_tenants: string;
    active_tenants: string;
    inactive_tenants: string;
    trial_tenants: string;
    suspended_tenants: string;
    overdue_tenants: string;
    today_appointments: string;
    pending_payment_reviews: string;
    approved_revenue: string;
  }>(
    `
      SELECT
        (SELECT count(*) FROM tenants)::text AS total_tenants,
        (SELECT count(*) FROM tenants WHERE is_active = true)::text AS active_tenants,
        (SELECT count(*) FROM tenants WHERE is_active = false)::text AS inactive_tenants,
        (SELECT count(*) FROM tenants WHERE status = 'trial')::text AS trial_tenants,
        (SELECT count(*) FROM tenants WHERE status = 'suspended')::text AS suspended_tenants,
        (SELECT count(*) FROM tenants WHERE billing_status = 'overdue')::text AS overdue_tenants,
        (SELECT count(*) FROM appointments WHERE datetime_start::date = CURRENT_DATE)::text AS today_appointments,
        (SELECT count(*) FROM payments WHERE status IN ('pending', 'pending_verification'))::text AS pending_payment_reviews,
        COALESCE((SELECT sum(amount_paid) FROM payments WHERE status = 'approved'), 0)::text AS approved_revenue
    `
  );

  return result.rows[0];
}

export async function listPlatformTenants() {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    company_email: string | null;
    company_phone: string | null;
    is_active: boolean;
    status: TenantPlatformStatus;
    plan: TenantPlatformPlan;
    billing_status: TenantBillingStatus;
    created_at: string;
    services_count: string;
    barbers_count: string;
    users_count: string;
    appointments_count: string;
    approved_revenue: string;
    mercado_pago_ready: boolean;
  }>(
    `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.company_email,
        t.company_phone,
        t.is_active,
        t.status,
        t.plan,
        t.billing_status,
        t.created_at,
        COALESCE(s.services_count, 0)::text AS services_count,
        COALESCE(b.barbers_count, 0)::text AS barbers_count,
        COALESCE(u.users_count, 0)::text AS users_count,
        COALESCE(a.appointments_count, 0)::text AS appointments_count,
        COALESCE(p.approved_revenue, 0)::text AS approved_revenue,
        (
          t.allow_mercado_pago = true
          AND t.mercado_pago_public_key IS NOT NULL
          AND t.mercado_pago_access_token IS NOT NULL
        ) AS mercado_pago_ready
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, count(*) AS services_count
        FROM services
        WHERE is_active = true
        GROUP BY tenant_id
      ) s ON s.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, count(*) AS barbers_count
        FROM barbers
        WHERE is_active = true
        GROUP BY tenant_id
      ) b ON b.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, count(*) AS users_count
        FROM users
        WHERE is_active = true
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, count(*) AS appointments_count
        FROM appointments
        GROUP BY tenant_id
      ) a ON a.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, sum(amount_paid) AS approved_revenue
        FROM payments
        WHERE status = 'approved'
        GROUP BY tenant_id
      ) p ON p.tenant_id = t.id
      ORDER BY t.created_at DESC, t.name ASC
    `
  );

  return result.rows;
}

export async function getPlatformTenantDetail(tenantId: string) {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    company_email: string | null;
    company_phone: string | null;
    address: string | null;
    timezone: string;
    is_active: boolean;
    status: TenantPlatformStatus;
    plan: TenantPlatformPlan;
    billing_status: TenantBillingStatus;
    suspended_at: string | null;
    cancelled_at: string | null;
    trial_ends_at: string | null;
    allow_pay_at_store: boolean;
    allow_bank_transfer: boolean;
    allow_mercado_pago: boolean;
    mercado_pago_ready: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `
      SELECT
        id,
        name,
        slug,
        company_email,
        company_phone,
        address,
        timezone,
        is_active,
        status,
        plan,
        billing_status,
        suspended_at,
        cancelled_at,
        trial_ends_at,
        allow_pay_at_store,
        allow_bank_transfer,
        allow_mercado_pago,
        (
          allow_mercado_pago = true
          AND mercado_pago_public_key IS NOT NULL
          AND mercado_pago_access_token IS NOT NULL
        ) AS mercado_pago_ready,
        created_at,
        updated_at
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `,
    [tenantId]
  );

  return result.rows[0] ?? null;
}

export async function getPlatformTenantMetrics(tenantId: string) {
  const result = await query<{
    services_count: string;
    barbers_count: string;
    users_count: string;
    customers_count: string;
    appointments_count: string;
    upcoming_appointments: string;
    pending_payment_reviews: string;
    approved_revenue: string;
    active_queue: string;
  }>(
    `
      SELECT
        (SELECT count(*) FROM services WHERE tenant_id = $1 AND is_active = true)::text AS services_count,
        (SELECT count(*) FROM barbers WHERE tenant_id = $1 AND is_active = true)::text AS barbers_count,
        (SELECT count(*) FROM users WHERE tenant_id = $1 AND is_active = true)::text AS users_count,
        (SELECT count(*) FROM customers WHERE tenant_id = $1)::text AS customers_count,
        (SELECT count(*) FROM appointments WHERE tenant_id = $1)::text AS appointments_count,
        (SELECT count(*) FROM appointments WHERE tenant_id = $1 AND datetime_start >= now())::text AS upcoming_appointments,
        (SELECT count(*) FROM payments WHERE tenant_id = $1 AND status IN ('pending', 'pending_verification'))::text AS pending_payment_reviews,
        COALESCE((SELECT sum(amount_paid) FROM payments WHERE tenant_id = $1 AND status = 'approved'), 0)::text AS approved_revenue,
        (SELECT count(*) FROM queue_entries WHERE tenant_id = $1 AND status IN ('waiting', 'called', 'in_progress'))::text AS active_queue
    `,
    [tenantId]
  );

  return result.rows[0];
}

export async function updatePlatformTenantActiveState(input: {
  tenantId: string;
  isActive: boolean;
  actor: PlatformSessionUser;
}) {
  return withTransaction(async (client) => {
    const current = await client.query<{
      id: string;
      name: string;
      slug: string;
      is_active: boolean;
    }>(
      `
        SELECT id, name, slug, is_active
        FROM tenants
        WHERE id = $1
        FOR UPDATE
      `,
      [input.tenantId]
    );

    const tenant = current.rows[0];
    if (!tenant) {
      return null;
    }

    const updated = await client.query<{
      id: string;
      name: string;
      slug: string;
      is_active: boolean;
    }>(
      `
        UPDATE tenants
        SET is_active = $2,
            status = CASE WHEN $2 THEN 'active' ELSE 'suspended' END,
            suspended_at = CASE WHEN $2 THEN NULL ELSE now() END,
            updated_at = now()
        WHERE id = $1
        RETURNING id, name, slug, is_active
      `,
      [input.tenantId, input.isActive]
    );

    await insertPlatformAuditLog(client, {
      actor: input.actor,
      action: input.isActive ? "tenant.reactivated" : "tenant.suspended",
      targetType: "tenant",
      targetId: input.tenantId,
      metadata: {
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        previousIsActive: tenant.is_active,
        nextIsActive: input.isActive
      }
    });

    return updated.rows[0];
  });
}

export async function createPlatformTenant(input: {
  name: string;
  slug: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  address?: string | null;
  timezone: string;
  status: TenantPlatformStatus;
  plan: TenantPlatformPlan;
  billingStatus: TenantBillingStatus;
  ownerEmail: string;
  ownerDisplayName: string;
  ownerPasswordHash: string;
  actor: PlatformSessionUser;
}) {
  return withTransaction(async (client) => {
    const tenantResult = await client.query<{
      id: string;
      name: string;
      slug: string;
    }>(
      `
        INSERT INTO tenants (
          name,
          slug,
          company_email,
          company_phone,
          address,
          timezone,
          status,
          plan,
          billing_status,
          is_active,
          suspended_at,
          cancelled_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $7 <> 'suspended' AND $7 <> 'cancelled',
          CASE WHEN $7 = 'suspended' THEN now() ELSE NULL END,
          CASE WHEN $7 = 'cancelled' THEN now() ELSE NULL END
        )
        RETURNING id, name, slug
      `,
      [
        input.name,
        input.slug,
        input.companyEmail ?? null,
        input.companyPhone ?? null,
        input.address ?? null,
        input.timezone,
        input.status,
        input.plan,
        input.billingStatus
      ]
    );
    const tenant = tenantResult.rows[0];

    const ownerResult = await client.query<{ id: string }>(
      `
        INSERT INTO users (tenant_id, role, email, password_hash, display_name)
        VALUES ($1, 'owner', $2, $3, $4)
        RETURNING id
      `,
      [tenant.id, input.ownerEmail, input.ownerPasswordHash, input.ownerDisplayName]
    );

    await insertPlatformAuditLog(client, {
      actor: input.actor,
      action: "tenant.created",
      targetType: "tenant",
      targetId: tenant.id,
      metadata: {
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        ownerUserId: ownerResult.rows[0].id,
        ownerEmail: input.ownerEmail,
        status: input.status,
        plan: input.plan,
        billingStatus: input.billingStatus
      }
    });

    return tenant;
  });
}

export async function updatePlatformTenantProfile(input: {
  tenantId: string;
  name: string;
  slug: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  address?: string | null;
  timezone: string;
  status: TenantPlatformStatus;
  plan: TenantPlatformPlan;
  billingStatus: TenantBillingStatus;
  trialEndsAt?: string | null;
  actor: PlatformSessionUser;
}) {
  return withTransaction(async (client) => {
    const current = await client.query<{
      id: string;
      name: string;
      slug: string;
      status: TenantPlatformStatus;
      plan: TenantPlatformPlan;
      billing_status: TenantBillingStatus;
      is_active: boolean;
    }>(
      `
        SELECT id, name, slug, status, plan, billing_status, is_active
        FROM tenants
        WHERE id = $1
        FOR UPDATE
      `,
      [input.tenantId]
    );

    const tenant = current.rows[0];
    if (!tenant) {
      return null;
    }

    const updated = await client.query<{
      id: string;
      name: string;
      slug: string;
      is_active: boolean;
      status: TenantPlatformStatus;
      plan: TenantPlatformPlan;
      billing_status: TenantBillingStatus;
    }>(
      `
        UPDATE tenants
        SET name = $2,
            slug = $3,
            company_email = $4,
            company_phone = $5,
            address = $6,
            timezone = $7,
            status = $8,
            plan = $9,
            billing_status = $10,
            trial_ends_at = $11,
            is_active = $8 <> 'suspended' AND $8 <> 'cancelled',
            suspended_at = CASE WHEN $8 = 'suspended' AND status <> 'suspended' THEN now() WHEN $8 <> 'suspended' THEN NULL ELSE suspended_at END,
            cancelled_at = CASE WHEN $8 = 'cancelled' AND status <> 'cancelled' THEN now() WHEN $8 <> 'cancelled' THEN NULL ELSE cancelled_at END,
            updated_at = now()
        WHERE id = $1
        RETURNING id, name, slug, is_active, status, plan, billing_status
      `,
      [
        input.tenantId,
        input.name,
        input.slug,
        input.companyEmail ?? null,
        input.companyPhone ?? null,
        input.address ?? null,
        input.timezone,
        input.status,
        input.plan,
        input.billingStatus,
        input.trialEndsAt || null
      ]
    );

    await insertPlatformAuditLog(client, {
      actor: input.actor,
      action: "tenant.settings_updated",
      targetType: "tenant",
      targetId: input.tenantId,
      metadata: {
        previous: {
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          plan: tenant.plan,
          billingStatus: tenant.billing_status,
          isActive: tenant.is_active
        },
        next: {
          name: input.name,
          slug: input.slug,
          status: input.status,
          plan: input.plan,
          billingStatus: input.billingStatus
        }
      }
    });

    return updated.rows[0];
  });
}

export async function listPlatformTenantUsers(tenantId: string) {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
    role: "owner" | "staff" | "barber" | "platform_admin";
    is_active: boolean;
    created_at: string;
  }>(
    `
      SELECT id, email, display_name, role, is_active, created_at
      FROM users
      WHERE tenant_id = $1
        AND role IN ('owner', 'staff')
      ORDER BY role ASC, is_active DESC, display_name ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function createPlatformTenantOwner(input: {
  tenantId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  actor: PlatformSessionUser;
}) {
  return withTransaction(async (client) => {
    const tenantResult = await client.query<{ id: string; name: string; slug: string }>(
      "SELECT id, name, slug FROM tenants WHERE id = $1",
      [input.tenantId]
    );
    const tenant = tenantResult.rows[0];
    if (!tenant) {
      return null;
    }

    const userResult = await client.query<{ id: string; email: string }>(
      `
        INSERT INTO users (tenant_id, role, email, password_hash, display_name)
        VALUES ($1, 'owner', $2, $3, $4)
        RETURNING id, email
      `,
      [input.tenantId, input.email, input.passwordHash, input.displayName]
    );

    await insertPlatformAuditLog(client, {
      actor: input.actor,
      action: "tenant.owner_created",
      targetType: "tenant",
      targetId: input.tenantId,
      metadata: {
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        ownerUserId: userResult.rows[0].id,
        ownerEmail: userResult.rows[0].email
      }
    });

    return userResult.rows[0];
  });
}

export async function resetPlatformTenantUserPassword(input: {
  tenantId: string;
  userId: string;
  passwordHash: string;
  reason: string;
  actor: PlatformSessionUser;
}) {
  return withTransaction(async (client) => {
    const userResult = await client.query<{
      id: string;
      email: string;
      role: string;
    }>(
      `
        UPDATE users
        SET password_hash = $3,
            must_change_password = true,
            password_reset_required_at = now(),
            temporary_password_expires_at = now() + interval '24 hours',
            updated_at = now()
        WHERE tenant_id = $1
          AND id = $2
          AND role IN ('owner', 'staff')
        RETURNING id, email, role
      `,
      [input.tenantId, input.userId, input.passwordHash]
    );

    const user = userResult.rows[0];
    if (!user) {
      return null;
    }

    await insertPlatformAuditLog(client, {
      actor: input.actor,
      action: "tenant.user_password_reset",
      targetType: "tenant",
      targetId: input.tenantId,
      metadata: {
        tenantUserId: user.id,
        tenantUserEmail: user.email,
        tenantUserRole: user.role,
        reason: input.reason,
        temporaryPasswordExpiresInHours: 24
      }
    });

    return user;
  });
}

export async function listPlatformTenantAuditLogs(tenantId: string) {
  const result = await query<{
    id: string;
    actor_email: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>(
    `
      SELECT id, actor_email, action, metadata, created_at
      FROM platform_audit_logs
      WHERE target_type = 'tenant'
        AND target_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [tenantId]
  );

  return result.rows;
}

export async function listPlatformAuditLogs() {
  const result = await query<{
    id: string;
    actor_email: string;
    action: string;
    target_type: string;
    target_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>(
    `
      SELECT id, actor_email, action, target_type, target_id, metadata, created_at
      FROM platform_audit_logs
      ORDER BY created_at DESC
      LIMIT 200
    `
  );

  return result.rows;
}
