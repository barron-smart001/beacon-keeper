import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_CALLBACK_URL =
  process.env.PAYSTACK_CALLBACK_URL ||
  process.env.VITE_APP_URL ||
  process.env.APP_URL;

const PLANS = {
  monthly: {
    id: "monthly",
    name: "Monthly",
    amount: 500000,
    durationMonths: 1,
  },

  quarterly: {
    id: "quarterly",
    name: "3 Months",
    amount: 1200000,
    durationMonths: 3,
  },

  yearly: {
    id: "yearly",
    name: "1 Year",
    amount: 3600000,
    durationMonths: 12,
  },
};

function getServerError(message) {
  return {
    success: false,
    message,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response
      .status(405)
      .json(getServerError("Method not allowed. Use POST."));
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return response.status(500).json(
      getServerError(
        "Missing Supabase server configuration."
      )
    );
  }

  if (!PAYSTACK_SECRET_KEY) {
    return response.status(500).json(
      getServerError(
        "Missing Paystack server configuration. Set PAYSTACK_SECRET_KEY on the server."
      )
    );
  }

  const authHeader = request.headers.authorization || "";

  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!bearerToken) {
    return response.status(401).json(
      getServerError(
        "A valid authenticated Meridian session is required."
      )
    );
  }

  try {
    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body || "{}")
        : request.body || {};

    const planId = body.plan;

    const selectedPlan = PLANS[planId];

    if (!selectedPlan) {
      return response.status(400).json(
        getServerError(
          "Invalid Meridian subscription plan. Choose monthly, quarterly, or yearly."
        )
      );
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: userData,
      error: userError,
    } = await supabaseClient.auth.getUser(bearerToken);

    if (userError || !userData?.user) {
      console.error("Supabase user verification failed:", userError);

      return response.status(401).json(
        getServerError(
          "Unable to verify the authenticated Meridian user."
        )
      );
    }

    const user = userData.user;

    const userId = user.id;
    const email = user.email;

    if (!userId || !email) {
      return response.status(400).json(
        getServerError(
          "The authenticated Meridian user is missing required profile data."
        )
      );
    }

    const reference = `meridian_${selectedPlan.id}_${userId}_${Date.now()}_${randomUUID().replace(
      /-/g,
      ""
    )}`;

    const paystackRequestBody = {
      email,
      amount: selectedPlan.amount,
      currency: "NGN",
      reference,

      metadata: {
        user_id: userId,
        email,
        product: "meridian_pro",
        plan: selectedPlan.id,
        plan_name: selectedPlan.name,
        duration_months: selectedPlan.durationMonths,
      },
    };

    if (PAYSTACK_CALLBACK_URL) {
      paystackRequestBody.callback_url = PAYSTACK_CALLBACK_URL;
    }

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(paystackRequestBody),
      }
    );

    const paystackPayload = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackPayload?.status ||
      !paystackPayload?.data?.authorization_url
    ) {
      console.error(
        "Paystack initialization failed:",
        paystackPayload
      );

      return response.status(502).json({
        success: false,
        message:
          paystackPayload?.message ||
          "Paystack initialization failed. Please try again later.",
      });
    }

    return response.status(200).json({
      success: true,

      data: {
        authorization_url:
          paystackPayload.data.authorization_url,

        access_code:
          paystackPayload.data.access_code,

        reference:
          paystackPayload.data.reference || reference,

        plan: selectedPlan.id,

        amount: selectedPlan.amount,

        duration_months:
          selectedPlan.durationMonths,
      },
    });
  } catch (error) {
    console.error(
      "Paystack initialization error:",
      error
    );

    return response.status(500).json({
      success: false,
      message:
        "Unable to initialize Paystack payment right now.",
    });
  }
}