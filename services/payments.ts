import type { PaymentMethod } from "@/lib/types";

function getMinimumReservationAmount(
  totalAmount: number,
  tenant: {
    requires_deposit: boolean;
    deposit_type: string;
    deposit_value: string;
  }
) {
  if (!tenant.requires_deposit) {
    return totalAmount;
  }

  const depositType = tenant.deposit_type;
  const depositValue = Number(tenant.deposit_value);

  if (depositType === "fixed") {
    return Math.min(totalAmount, depositValue);
  }

  if (depositType === "percentage") {
    return Math.min(totalAmount, (totalAmount * depositValue) / 100);
  }

  if (depositType === "full") {
    return totalAmount;
  }

  return totalAmount;
}

export function computePaymentBreakdown(
  totalAmount: number,
  tenant: {
    requires_deposit: boolean;
    deposit_type: string;
    deposit_value: string;
  },
  options?: {
    paymentMethod?: PaymentMethod;
    payInFull?: boolean;
  }
) {
  const minimumAmountRequiredNow = options?.paymentMethod === "pay_at_store" ? 0 : getMinimumReservationAmount(totalAmount, tenant);
  const supportsFullPayment =
    options?.paymentMethod === "bank_transfer" || options?.paymentMethod === "mercado_pago";
  const amountRequiredNow =
    supportsFullPayment && options?.payInFull ? totalAmount : minimumAmountRequiredNow;

  return {
    totalAmount,
    minimumAmountRequiredNow,
    amountRequiredNow,
    amountPendingAtStore: Math.max(0, totalAmount - amountRequiredNow),
    supportsFullPayment
  };
}

