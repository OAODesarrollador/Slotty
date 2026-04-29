import { query } from "@/lib/db";

export async function getTenantSettings(tenantId: string) {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    company_phone: string | null;
    company_email: string | null;
    address: string | null;
    instagram_url: string | null;
    timezone: string;
    booking_mode: string;
    requires_deposit: boolean;
    deposit_type: string;
    deposit_value: string;
    allow_pay_at_store: boolean;
    allow_bank_transfer: boolean;
    allow_mercado_pago: boolean;
    mercado_pago_ready: boolean;
    transfer_alias: string | null;
    transfer_cbu: string | null;
    transfer_holder_name: string | null;
    transfer_bank_name: string | null;
    mercado_pago_public_key: string | null;
    mercado_pago_access_token: string | null;
    logo_url: string | null;
    hero_image_url: string | null;
    primary_color: string;
  }>(
    `
      SELECT
        id, name, slug, company_phone, company_email, address, instagram_url, timezone, booking_mode, requires_deposit, deposit_type, deposit_value,
        allow_pay_at_store, allow_bank_transfer, allow_mercado_pago,
        (allow_mercado_pago = true AND mercado_pago_public_key IS NOT NULL AND mercado_pago_access_token IS NOT NULL) AS mercado_pago_ready,
        transfer_alias, transfer_cbu, transfer_holder_name, transfer_bank_name,
        mercado_pago_public_key, mercado_pago_access_token,
        logo_url, hero_image_url, primary_color
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `,
    [tenantId]
  );

  return result.rows[0] ?? null;
}

export async function getTenantBookingSettings(tenantId: string) {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    timezone: string;
    requires_deposit: boolean;
    deposit_type: string;
    deposit_value: string;
    allow_pay_at_store: boolean;
    allow_bank_transfer: boolean;
    allow_mercado_pago: boolean;
    transfer_alias: string | null;
    transfer_cbu: string | null;
    transfer_holder_name: string | null;
    transfer_bank_name: string | null;
    mercado_pago_public_key: string | null;
    mercado_pago_access_token: string | null;
  }>(
    `
      SELECT
        id, name, slug, timezone, requires_deposit, deposit_type, deposit_value,
        allow_pay_at_store, allow_bank_transfer, allow_mercado_pago,
        transfer_alias, transfer_cbu, transfer_holder_name, transfer_bank_name,
        mercado_pago_public_key, mercado_pago_access_token
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `,
    [tenantId]
  );

  return result.rows[0] ?? null;
}

export async function updateTenantAdminSettings(input: {
  tenantId: string;
  name: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  address?: string | null;
  instagramUrl?: string | null;
  timezone: string;
  requiresDeposit: boolean;
  depositType: string;
  depositValue: number;
  allowPayAtStore: boolean;
  allowBankTransfer: boolean;
  allowMercadoPago: boolean;
  updateSensitivePaymentFields?: boolean;
  transferAlias?: string | null;
  transferCbu?: string | null;
  transferHolderName?: string | null;
  transferBankName?: string | null;
  mercadoPagoPublicKey?: string | null;
  mercadoPagoAccessToken?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  primaryColor: string;
}) {
  await query(
    `
      UPDATE tenants
      SET name = $2,
          company_phone = $3,
          company_email = $4,
          address = $5,
          instagram_url = $6,
          timezone = $7,
          requires_deposit = $8,
          deposit_type = $9,
          deposit_value = $10,
          allow_pay_at_store = $11,
          allow_bank_transfer = $12,
          allow_mercado_pago = $13,
          transfer_alias = CASE WHEN $14 THEN $15 ELSE transfer_alias END,
          transfer_cbu = CASE WHEN $14 THEN $16 ELSE transfer_cbu END,
          transfer_holder_name = CASE WHEN $14 THEN $17 ELSE transfer_holder_name END,
          transfer_bank_name = CASE WHEN $14 THEN $18 ELSE transfer_bank_name END,
          mercado_pago_public_key = CASE WHEN $14 THEN $19 ELSE mercado_pago_public_key END,
          mercado_pago_access_token = CASE WHEN $14 THEN $20 ELSE mercado_pago_access_token END,
          logo_url = $21,
          hero_image_url = $22,
          primary_color = $23,
          updated_at = now()
      WHERE id = $1
    `,
    [
      input.tenantId,
      input.name,
      input.companyPhone ?? null,
      input.companyEmail ?? null,
      input.address ?? null,
      input.instagramUrl ?? null,
      input.timezone,
      input.requiresDeposit,
      input.depositType,
      input.depositValue,
      input.allowPayAtStore,
      input.allowBankTransfer,
      input.allowMercadoPago,
      input.updateSensitivePaymentFields === true,
      input.transferAlias ?? null,
      input.transferCbu ?? null,
      input.transferHolderName ?? null,
      input.transferBankName ?? null,
      input.mercadoPagoPublicKey ?? null,
      input.mercadoPagoAccessToken ?? null,
      input.logoUrl ?? null,
      input.heroImageUrl ?? null,
      input.primaryColor
    ]
  );
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
