import { handleUpload } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

import { canManageCompany } from "@/lib/admin";
import { requireSessionForTenantRole } from "@/lib/auth";

const MAX_HERO_IMAGE_SIZE = 25 * 1024 * 1024;

function safeTenantSlug(tenantSlug: string) {
  return tenantSlug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const session = await requireSessionForTenantRole(tenantSlug, ["owner", "platform_admin"]);

  if (!canManageCompany(session.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const prefix = `tenants/${safeTenantSlug(tenantSlug)}/`;

        if (!pathname.startsWith(prefix)) {
          throw new Error("Ruta de imagen invalida.");
        }

        return {
          allowedContentTypes: ["image/*"],
          maximumSizeInBytes: MAX_HERO_IMAGE_SIZE
        };
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo preparar la subida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
