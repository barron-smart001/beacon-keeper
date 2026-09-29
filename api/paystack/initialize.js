import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_CALLBACK_URL =
  process.env.PAYSTACK_CALLBACK_URL ||
  process.env.VITE_APP_URL ||
  process.env.APP_URL;

function getServerError(message) {
  return {
    success: false,
    message,
  };
}

function getSafeErrorDetails(error, request) {
  let details =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  const sensitiveValues = [
    ...Object.values(process.env),
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    PAYSTACK_SECRET_KEY,
    request.headers.authorization,
  ]
    .filter((value) => typeof value === "string" && value.length > 0)
    .sort((first, second) => second.length - first.length);

  for (const value of new Set(sensitiveValues)) {
    details = details.split(value).join("[REDACTED]");
  }

  return details
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/(authorization\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response
      .status(405)
      .json(getServerError("Method not allowed. Use POST."));
  }

  // Check server configuration
  if (!SUPABASE_URL) {
    return response.status(500).json({
      ...getServerError("Missing SUPABASE_URL"),
      diagnostic: "Missing SUPABASE_URL",
    });
  }

  if (!SUPABASE_ANON_KEY) {
    return response.status(500).json({
      ...getServerError("Missing SUPABASE_ANON_KEY"),
      diagnostic: "Missing SUPABASE_ANON_KEY",
    });
  }

  if (!PAYSTACK_SECRET_KEY) {
    return response.status(500).json({
      ...getServerError("Missing PAYSTACK_SECRET_KEY"),
      diagnostic: "Missing PAYSTACK_SECRET_KEY",
    });
  }

  // Get authenticated user's access token
  const authHeader = request.headers.authorization || "";

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return response.status(401).json(
      getServerError(
        "A valid authenticated session is required to initialize checkout."
      )
    );
  }

  try {
    // Create Supabase server client
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Verify the user's Supabase session
    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("Supabase user verification failed.");

      return response.status(401).json(
        getServerError(
          "Unable to verify the current Meridian user session."
        )
      );
    }

    const { id: userId, email } = userData.user;

    if (!userId || !email) {
      return response.status(400).json(
        getServerError(
          "The authenticated Meridian user is missing required profile data."
        )
      );
    }

    // Meridian Pro price: ₦18,000
    // Paystack expects NGN amounts in kobo.
    const amountInKobo = 1800000;

    const reference = `meridian_pro_${userId}_${Date.now()}_${randomUUID().replace(
      /-/g,
      ""
    )}`;

    const paystackRequestBody = {
      email,
      amount: amountInKobo,
      currency: "NGN",
      reference,

      metadata: {
        user_id: userId,
        product: "meridian_pro",
        email,
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
      },
    });
  } catch (error) {
    console.error("Paystack initialization request failed.");

    return response.status(500).json({
      success: false,
      message: "Paystack initialization request failed",
      diagnostic: "Paystack initialization request failed",
      details: getSafeErrorDetails(error, request),
    });
  }
}