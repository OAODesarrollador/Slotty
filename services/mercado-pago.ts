import { addMinutes } from "@/lib/time";

function getAppUrl() {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("Falta configurar APP_URL.");
  }

  return appUrl.replace(/\/$/, "");
}

function canUseMercadoPagoAutoReturn(appUrl: string) {
  try {
    const { hostname } = new URL(appUrl);
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

export async function createMercadoPagoPreference(input: {
  accessToken: string;
  tenantSlug: string;
  tenantName: string;
  appointmentId: string;
  payerName: string;
  payerPhone: string;
  title: string;
  amountToCharge: number;
}) {
  if (!input.accessToken) {
    throw new Error("Mercado Pago no esta configurado para este tenant.");
  }

  const appUrl = getAppUrl();
  const shouldEnableAutoReturn = canUseMercadoPagoAutoReturn(appUrl);
  const expirationDateTo = addMinutes(new Date(), 15).toISOString();

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      external_reference: input.appointmentId,
      statement_descriptor: "SLOTTY",
      expires: true,
      expiration_date_to: expirationDateTo,
      items: [
        {
          id: input.appointmentId,
          title: input.title,
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number(input.amountToCharge.toFixed(2))
        }
      ],
      payer: {
        name: input.payerName,
        phone: {
          number: input.payerPhone
        }
      },
      back_urls: {
        success: `${appUrl}/${input.tenantSlug}/mi-turno/${input.appointmentId}`,
        pending: `${appUrl}/${input.tenantSlug}/mi-turno/${input.appointmentId}`,
        failure: `${appUrl}/${input.tenantSlug}/reservar?error=${encodeURIComponent("No se pudo iniciar Mercado Pago.")}`
      },
      ...(shouldEnableAutoReturn ? { auto_return: "approved" } : {}),
      metadata: {
        tenantSlug: input.tenantSlug,
        tenantName: input.tenantName,
        appointmentId: input.appointmentId
      }
    })
  });

  const body = await response.json();

  if (!response.ok || !body?.id || !body?.init_point) {
    throw new Error("No se pudo crear la preferencia de Mercado Pago.");
  }

  return {
    preferenceId: String(body.id),
    checkoutUrl: String(body.init_point)
  };
}


