import { query } from "@/lib/db";

export async function getTenantSettings(tenantId: string) {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    timezone: string;
    booking_mode: string;
    deposit_type: string;
    deposit_value: string;
    allow_pay_at_store: boolean;
    allow_bank_transfer: boolean;
    allow_mercado_pago: boolean;
    transfer_alias: string | null;
    transfer_cbu: string | null;
    transfer_holder_name: string | null;
    transfer_bank_name: string | null;
    logo_url: string | null;
    hero_image_url: string | null;
    primary_color: string;
  }>(
    `
      SELECT
        id, name, slug, timezone, booking_mode, deposit_type, deposit_value,
        allow_pay_at_store, allow_bank_transfer, allow_mercado_pago,
        transfer_alias, transfer_cbu, transfer_holder_name, transfer_bank_name,
        logo_url, hero_image_url, primary_color
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `,
    [tenantId]
  );

  return result.rows[0] ?? null;
}

export async function getTenants() {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    hero_image_url: string | null;
  }>(
    `
      SELECT id, name, slug, logo_url, hero_image_url
      FROM tenants
      WHERE is_active = true
      ORDER BY name ASC
    `
  );

  return result.rows;
}
