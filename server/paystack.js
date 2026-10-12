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

export async function fetchPaystackTransaction(secretKey, reference) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.status || !payload?.data) {
    const error = new Error(
      payload?.message || "Paystack could not verify this payment."
    );
    error.status = response.status;
    throw error;
  }

  return payload.data;
}

// Checks a Paystack transaction against a Meridian plan. Returns the payment
// details to record, or null when it is not a payable Meridian charge.
export function getVerifiedPayment(transaction, userId) {
  const metadata = transaction?.metadata;
  const plan = getPlanFromMetadata(metadata);
  const amount = Number(transaction?.amount);
  const paidAt = new Date(transaction?.paid_at || transaction?.created_at || "");

  if (
    transaction?.status !== "success" ||
    typeof transaction.reference !== "string" ||
    !transaction.reference ||
    metadata?.user_id !== userId ||
    !plan ||
    transaction.currency !== "NGN" ||
    !Number.isSafeInteger(amount) ||
    amount !== plan.amount ||
    Number.isNaN(paidAt.getTime())
  ) {
    return null;
  }

  return {
    userId,
    reference: transaction.reference,
    amount,
    currency: transaction.currency,
    paidAt: paidAt.toISOString(),
    plan,
  };
}

async function paystackGet(secretKey, path) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

// Finds the user's successful Meridian payments on Paystack and records any
// that never reached the database (e.g. the callback or webhook failed).
// Recording is idempotent, so already-processed payments are skipped.
export async function syncUserPayments(adminClient, secretKey, { userId, email }) {
  const customer = await paystackGet(
    secretKey,
    `/customer/${encodeURIComponent(email)}`
  );
  if (customer.response.status === 404 || !customer.payload?.data?.id) {
    return { recorded: 0, subscription: null };
  }

  const transactions = await paystackGet(
    secretKey,
    `/transaction?customer=${customer.payload.data.id}&status=success&perPage=100`
  );
  if (!transactions.response.ok || !Array.isArray(transactions.payload?.data)) {
    const error = new Error(
      transactions.payload?.message || "Paystack could not list payments."
    );
    error.status = transactions.response.status;
    throw error;
  }

  const payments = transactions.payload.data
    .map((transaction) => getVerifiedPayment(transaction, userId))
    .filter(Boolean)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt));

  let recorded = 0;
  let subscription = null;
  for (const payment of payments) {
    const result = await recordSuccessfulPayment(adminClient, payment);
    if (!result.duplicate) {
      recorded += 1;
    }
    subscription = result;
  }

  return { recorded, subscription };
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
