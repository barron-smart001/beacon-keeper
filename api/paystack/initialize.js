import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { PLANS, PRODUCT } from "../../server/paystack.js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLIC_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;
const APP_URL = process.env.VITE_APP_URL || process.env.APP_URL;

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

  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY || !PAYSTACK_SECRET_KEY) {
    console.error("Paystack initialization is missing server configuration.");
    return errorResponse(
      response,
      500,
      "Payment initialization is not configured on the server."
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

  const plan =
    typeof body.plan === "string" && Object.hasOwn(PLANS, body.plan)
      ? PLANS[body.plan]
      : null;

  if (!plan) {
    return errorResponse(
      response,
      400,
      "Choose a valid plan: monthly, quarterly, or yearly."
    );
  }

  try {
    const callbackUrl = PAYSTACK_CALLBACK_URL
      ? new URL(PAYSTACK_CALLBACK_URL).toString()
      : APP_URL
        ? new URL("/app/billing", APP_URL).toString()
        : null;

    if (!callbackUrl) {
      return errorResponse(
        response,
        500,
        "Set PAYSTACK_CALLBACK_URL or APP_URL on the server to enable payment callbacks."
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(bearerToken);

    if (error || !data?.user) {
      return errorResponse(
        response,
        401,
        "Unable to verify the authenticated Recordium user."
      );
    }

    const { id: userId, email } = data.user;
    if (!userId || !email) {
      return errorResponse(
        response,
        400,
        "The authenticated user is missing required account details."
      );
    }

    const reference = `recordium_${plan.id}_${userId}_${Date.now()}_${randomUUID().replaceAll("-", "")}`;
    const paystackBody = {
      email,
      amount: plan.amount,
      currency: "NGN",
      reference,
      metadata: {
        product: PRODUCT,
        user_id: userId,
        email,
        plan: plan.id,
        plan_name: plan.name,
        duration_months: plan.durationMonths,
      },
    };

    paystackBody.callback_url = callbackUrl;

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(paystackBody),
      }
    );
    const payload = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !payload?.status ||
      !payload?.data?.authorization_url
    ) {
      console.error("Paystack initialization failed:", payload);
      return errorResponse(
        response,
        502,
        payload?.message || "Paystack could not start the payment."
      );
    }

    return response.status(200).json({
      success: true,
      data: {
        authorization_url: payload.data.authorization_url,
        reference: payload.data.reference || reference,
        plan: plan.id,
        amount: plan.amount,
        duration_months: plan.durationMonths,
      },
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return errorResponse(
      response,
      500,
      "Unable to initialize payment right now."
    );
  }
}
