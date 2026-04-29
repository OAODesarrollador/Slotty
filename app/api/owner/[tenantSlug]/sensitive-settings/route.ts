import { NextRequest } from "next/server";

import { canManageCompany } from "@/lib/admin";
import { requireSessionForTenantRole, verifyPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { getTenantSettings } from "@/repositories/tenants";
import { getTenantUserPasswordHash } from "@/repositories/users";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const session = await requireSessionForTenantRole(tenantSlug, ["owner", "platform_admin"]);

  if (!canManageCompany(session.role)) {
    return fail("No tenes permisos para ver datos sensibles.", 403);
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return fail("Ingresá la contraseña de administrador.", 400);
  }

  const user = await getTenantUserPasswordHash(tenant.tenantId, session.userId);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return fail("La contraseña de administrador no es correcta.", 401);
  }

  const settings = await getTenantSettings(tenant.tenantId);
  if (!settings) {
    return fail("No se encontró la configuración de la empresa.", 404);
  }

  return ok({
    transferAlias: settings.transfer_alias ?? "",
    transferCbu: settings.transfer_cbu ?? "",
    transferHolderName: settings.transfer_holder_name ?? "",
    transferBankName: settings.transfer_bank_name ?? "",
    mercadoPagoPublicKey: settings.mercado_pago_public_key ?? "",
    mercadoPagoAccessToken: settings.mercado_pago_access_token ?? ""
  });
}
