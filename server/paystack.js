export const PRODUCT = "meridian_pro";

export const PLANS = Object.freeze({
  monthly: Object.freeze({
    id: "monthly",
    name: "Monthly",
    amount: 500000,
    durationMonths: 1,
  }),
  quarterly: Object.freeze({
    id: "quarterly",
    name: "3 Months",
    amount: 1200000,
    durationMonths: 3,
  }),
  yearly: Object.freeze({
    id: "yearly",
    name: "1 Year",
    amount: 3600000,
    durationMonths: 12,
  }),
});

export function getPlanFromMetadata(metadata) {
  if (!metadata || metadata.product !== PRODUCT) {
    return null;
  }

  const plan =
    typeof metadata.plan === "string" &&
    Object.hasOwn(PLANS, metadata.plan)
      ? PLANS[metadata.plan]
      : null;
  const durationMonths = Number(metadata.duration_months);

  if (!plan || durationMonths !== plan.durationMonths) {
    return null;
  }

  return plan;
}

export async function recordSuccessfulPayment(
  adminClient,
  { userId, reference, amount, currency, paidAt, plan }
) {
  const { data, error } = await adminClient.rpc(
    "activate_meridian_subscription",
    {
      p_user_id: userId,
      p_reference: reference,
      p_amount_kobo: amount,
      p_currency: currency,
      p_paid_at: paidAt,
      p_plan_id: plan.id,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}
