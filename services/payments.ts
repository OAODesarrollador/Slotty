export function computePaymentBreakdown(
  totalAmount: number,
  tenant: {
    deposit_type: string;
    deposit_value: string;
  }
) {
  const depositType = tenant.deposit_type;
  const depositValue = Number(tenant.deposit_value);

  let amountRequiredNow = 0;

  if (depositType === "fixed") {
    amountRequiredNow = Math.min(totalAmount, depositValue);
  } else if (depositType === "percentage") {
    amountRequiredNow = Math.min(totalAmount, (totalAmount * depositValue) / 100);
  } else if (depositType === "full") {
    amountRequiredNow = totalAmount;
  }

  return {
    totalAmount,
    amountRequiredNow,
    amountPendingAtStore: Math.max(0, totalAmount - amountRequiredNow)
  };
}
