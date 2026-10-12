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

// Checks a Paystack transaction against a TradeFrame plan. Returns the payment
// details to record, or null when it is not a payable TradeFrame charge.
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

const PENDING_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_GIVE_UP_MS = 24 * 60 * 60 * 1000;

// Records a payment as pending when checkout starts, so it can later be
// confirmed by reference even if the callback and webhook never arrive.
export async function recordPendingPayment(adminClient, { userId, reference, plan }) {
  const { error } = await adminClient.from("payment_transactions").insert({
    user_id: userId,
    reference,
    amount: plan.amount / 100,
    currency: "NGN",
    status: "pending",
    provider: "paystack",
  });

  if (error) {
    throw error;
  }
}

// Checks the user's recent pending payments with Paystack. Payments that
// failed, or were abandoned over a day ago, are closed so they stop being
// re-checked.
async function findPendingPayments(adminClient, secretKey, userId) {
  const { data, error } = await adminClient
    .from("payment_transactions")
    .select("id, reference, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - PENDING_LOOKBACK_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const payments = [];
  for (const row of data) {
    try {
      const transaction = await fetchPaystackTransaction(secretKey, row.reference);
      const payment = getVerifiedPayment(transaction, userId);
      if (payment) {
        payments.push(payment);
        continue;
      }

      const isStale =
        Date.now() - new Date(row.created_at).getTime() > PENDING_GIVE_UP_MS;
      if (
        transaction?.status === "failed" ||
        (transaction?.status === "abandoned" && isStale)
      ) {
        await adminClient
          .from("payment_transactions")
          .update({ status: transaction.status })
          .eq("id", row.id)
          .eq("status", "pending");
      }
    } catch (error) {
      console.error("Unable to check pending payment:", row.reference, error);
    }
  }

  return payments;
}

// Lists the successful TradeFrame payments made under the user's email.
async function findCustomerPayments(secretKey, { userId, email }) {
  const customer = await paystackGet(
    secretKey,
    `/customer/${encodeURIComponent(email)}`
  );
  if (customer.response.status === 404 || !customer.payload?.data?.id) {
    return [];
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

  return transactions.payload.data
    .map((transaction) => getVerifiedPayment(transaction, userId))
    .filter(Boolean);
}

// Finds the user's successful TradeFrame payments that never reached the
// database (e.g. the callback or webhook failed) and records them. Pending
// references are always checked; pendingOnly skips the slower email lookup.
// Recording is idempotent, so already-processed payments are skipped, and
// one failing payment does not stop the others from being recorded.
export async function syncUserPayments(
  adminClient,
  secretKey,
  { userId, email, pendingOnly = false }
) {
  const found = await findPendingPayments(adminClient, secretKey, userId);
  let lookupError = null;

  if (!pendingOnly && email) {
    try {
      found.push(...(await findCustomerPayments(secretKey, { userId, email })));
    } catch (error) {
      lookupError = error;
    }
  }

  const payments = [
    ...new Map(found.map((payment) => [payment.reference, payment])).values(),
  ].sort((a, b) => a.paidAt.localeCompare(b.paidAt));

  let recorded = 0;
  let subscription = null;
  let recordError = null;
  for (const payment of payments) {
    try {
      const result = await recordSuccessfulPayment(adminClient, payment);
      if (!result.duplicate) {
        recorded += 1;
      }
      subscription = result;
    } catch (error) {
      console.error("Unable to record payment:", payment.reference, error);
      recordError ??= error;
    }
  }

  if (!subscription && (recordError || lookupError)) {
    throw recordError || lookupError;
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
