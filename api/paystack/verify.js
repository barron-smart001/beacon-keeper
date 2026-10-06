import { createClient } from "@supabase/supabase-js";
import {
  getPlanFromMetadata,
  recordSuccessfulPayment,
} from "../../server/paystack.js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLIC_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function errorResponse(response, status, message) {
  return response.status(status).json({ success: false, message });
}

function parseRequestBody(body) {
  if (typeof body === "string") {
    return JSON.parse(body || "{}");
  }

  return body && typeof body === "object" ? body : {};
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return errorResponse(response, 405, "Method not allowed. Use POST.");
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLIC_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !PAYSTACK_SECRET_KEY
  ) {
    console.error("Paystack verification is missing server configuration.");
    return errorResponse(
      response,
      500,
      "Payment verification is not configured on the server."
    );
  }

  const authHeader = request.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!bearerToken) {
    return errorResponse(
      response,
      401,
      "A valid authenticated Recordium session is required."
    );
  }

  let body;
  try {
    body = parseRequestBody(request.body);
  } catch {
    return errorResponse(response, 400, "The request body is not valid JSON.");
  }

  const reference =
    typeof body.reference === "string" ? body.reference.trim() : "";

  if (!reference || reference.length > 200) {
    return errorResponse(
      response,
      400,
      "A valid Paystack transaction reference is required."
    );
  }

  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } =
      await authClient.auth.getUser(bearerToken);

    if (userError || !userData?.user?.id) {
      return errorResponse(
        response,
        401,
        "Unable to verify the authenticated Recordium user."
      );
    }

    const userId = userData.user.id;
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          Accept: "application/json",
        },
      }
    );
    const payload = await paystackResponse.json();

    if (!paystackResponse.ok || !payload?.status || !payload?.data) {
      console.error("Paystack transaction verification failed:", payload);
      return errorResponse(
        response,
        400,
        payload?.message || "Paystack could not verify this payment."
      );
    }

    const transaction = payload.data;
    if (
      transaction.reference !== reference ||
      transaction.status !== "success"
    ) {
      return errorResponse(
        response,
        400,
        "Paystack has not confirmed a successful payment for this reference."
      );
    }

    if (transaction.currency !== "NGN") {
      return errorResponse(response, 400, "Payment currency must be NGN.");
    }

    const metadata = transaction.metadata;
    if (metadata?.user_id !== userId) {
      return errorResponse(
        response,
        403,
        "This Paystack payment does not belong to the authenticated user."
      );
    }

    const plan = getPlanFromMetadata(metadata);
    if (!plan) {
      return errorResponse(
        response,
        400,
        "Paystack metadata does not identify a valid Recordium plan."
      );
    }

    const amount = Number(transaction.amount);
    if (!Number.isSafeInteger(amount) || amount !== plan.amount) {
      return errorResponse(
        response,
        400,
        "The verified payment amount does not match the selected plan."
      );
    }

    const paidAt = new Date(
      transaction.paid_at || transaction.created_at || ""
    );
    if (Number.isNaN(paidAt.getTime())) {
      return errorResponse(
        response,
        400,
        "Paystack did not provide a valid payment timestamp."
      );
    }

    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    let result;
    try {
      result = await recordSuccessfulPayment(adminClient, {
        userId,
        reference,
        amount,
        currency: transaction.currency,
        paidAt: paidAt.toISOString(),
        plan,
      });
    } catch (error) {
      console.error("Failed to record verified payment:", error);
      return errorResponse(
        response,
        error.code === "23505" ? 409 : 500,
        error.code === "23505"
          ? "This payment reference conflicts with another payment."
          : "Paystack verified the payment, but Recordium could not activate the subscription."
      );
    }

    return response.status(200).json({
      success: true,
      message: result.duplicate
        ? "This payment was already processed."
        : "Payment verified and Recordium Pro activated.",
      data: {
        reference,
        plan: plan.id,
        plan_name: plan.name,
        amount,
        duration_months: plan.durationMonths,
        ...result,
      },
    });
  } catch (error) {
    console.error("Paystack verification error:", error);
    return errorResponse(
      response,
      500,
      "Unable to verify payment right now."
    );
  }
}
