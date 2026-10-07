export const BILLING_PLANS = Object.freeze({
  monthly: Object.freeze({
    id: "monthly",
    name: "Monthly Pro",
    title: "Monthly",
    displayPrice: "₦5,000",
    durationLabel: "1 month",
    amount: 5000,
    durationMonths: 1,
  }),
  quarterly: Object.freeze({
    id: "quarterly",
    name: "3 Months Pro",
    title: "3 Months",
    displayPrice: "₦12,000",
    durationLabel: "3 months",
    amount: 12000,
    durationMonths: 3,
  }),
  yearly: Object.freeze({
    id: "yearly",
    name: "1 Year Pro",
    title: "1 Year",
    displayPrice: "₦36,000",
    durationLabel: "12 months",
    amount: 36000,
    durationMonths: 12,
  }),
});

export const BILLING_PLAN_ORDER = ["monthly", "quarterly", "yearly"];

export function getBillingPlan(planId) {
  if (typeof planId !== "string") {
    return null;
  }

  return Object.hasOwn(BILLING_PLANS, planId) ? BILLING_PLANS[planId] : null;
}
