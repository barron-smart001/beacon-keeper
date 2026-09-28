import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const MERIDIAN_PRO_AMOUNT_IN_KOBO = 1800000;
const MERIDIAN_PRO_PLAN = "pro";
const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

function getServerError(message) {
  return {
    success: false,
    message,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json(
      getServerError("Method not allowed. Use POST.")
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(500).json(
      getServerError(
        "Missing Supabase server configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server."
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

  if (!SUPABASE_ANON_KEY) {
    return response.status(500).json(
      getServerError(
        "Missing Supabase client configuration. Set VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY on the server."
      )
    );
  }

  const authHeader = request.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : "";

  if (!bearerToken) {
    return response.status(401).json(
      getServerError("A valid authenticated Meridian session is required.")
    );
  }

  const body =
    typeof request.body === "string"
      ? JSON.parse(request.body || "{}")
      : request.body || {};

  const reference = body.reference;

  if (!reference) {
    return response.status(400).json(
      getServerError("Paystack transaction reference is required.")
    );
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await supabaseClient.auth.getUser(bearerToken);

  if (userError || !userData?.user) {
    return response.status(401).json(
      getServerError("Unable to verify the authenticated Meridian user.")
    );
  }

  const user = userData.user;
  const userId = user.id;
  const userEmail = user.email;

  if (!userId || !userEmail) {
    return response.status(400).json(
      getServerError("The authenticated Meridian user is missing required profile data.")
    );
  }

  try {
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const paystackPayload = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackPayload?.status || !paystackPayload?.data) {
      return response.status(400).json({
        success: false,
        message:
          paystackPayload?.message ||
          "Paystack verification failed. Please try again.",
      });
    }

    const transaction = paystackPayload.data;
    const metadata = transaction.metadata || {};

    const isSuccessful = transaction.status === "success";
    const isCorrectCurrency = transaction.currency === "NGN";
    const isCorrectAmount = Number(transaction.amount) === MERIDIAN_PRO_AMOUNT_IN_KOBO;
    const isMatchingUser =
      metadata.user_id === userId ||
      transaction.customer?.email === userEmail ||
      metadata.email === userEmail;

    if (!isSuccessful) {
      return response.status(400).json({
        success: false,
        message: "Paystack payment is not yet successful.",
      });
    }

    if (!isCorrectCurrency) {
      return response.status(400).json({
        success: false,
        message: "Paystack payment currency must be NGN.",
      });
    }

    if (!isCorrectAmount) {
      return response.status(400).json({
        success: false,
        message: "Paystack payment amount must be ₦18,000.",
      });
    }

    if (!isMatchingUser) {
      return response.status(403).json({
        success: false,
        message: "This Paystack payment does not match the authenticated Meridian user.",
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + MONTH_IN_MS);

    const { data: existingPayment, error: paymentLookupError } = await adminClient
      .from("payment_transactions")
      .select("id, user_id, status, reference, amount, currency, provider, paid_at")
      .eq("reference", reference)
      .maybeSingle();

    if (paymentLookupError && paymentLookupError.code !== "PGRST116") {
      console.error("Payment lookup failed:", paymentLookupError);
      return response.status(500).json({
        success: false,
        message: "Unable to check the payment record history.",
      });
    }

    if (existingPayment) {
      if (existingPayment.user_id !== userId) {
        return response.status(409).json({
          success: false,
          message: "This Paystack transaction reference is already linked to another Meridian account.",
        });
      }

      if (existingPayment.status === "success") {
        return response.status(200).json({
          success: true,
          message: "This Paystack payment was already processed successfully.",
          data: {
            payment_record: existingPayment,
            subscription_status: "active",
            subscription_plan: MERIDIAN_PRO_PLAN,
            subscription_started_at: startedAt.toISOString(),
            subscription_expires_at: expiresAt.toISOString(),
            already_processed: true,
          },
        });
      }

      return response.status(409).json({
        success: false,
        message: "This Paystack reference has already been seen and cannot be processed again.",
      });
    }

    const paymentAmount = Number(transaction.amount) / 100;

    const { error: paymentInsertError } = await adminClient
      .from("payment_transactions")
      .insert({
        user_id: userId,
        reference,
        amount: paymentAmount,
        currency: transaction.currency,
        status: "success",
        provider: "paystack",
        paid_at: transaction.paid_at ? new Date(transaction.paid_at).toISOString() : new Date().toISOString(),
      });

    if (paymentInsertError) {
      if (paymentInsertError.code === "23505") {
        return response.status(409).json({
          success: false,
          message: "This Paystack reference was already processed. Duplicate payment protection prevented a second activation.",
        });
      }

      console.error("Payment record creation failed:", paymentInsertError);
      return response.status(500).json({
        success: false,
        message: "Unable to store the Meridian payment record.",
      });
    }

    const { data: profileData, error: profileReadError } = await adminClient
      .from("profiles")
      .select("subscription_status, subscription_plan")
      .eq("id", userId)
      .single();

    if (profileReadError && profileReadError.code !== "PGRST116") {
      return response.status(500).json({
        success: false,
        message: "Unable to load the Meridian profile for activation.",
      });
    }

    const alreadyActive =
      profileData?.subscription_status === "active" &&
      profileData?.subscription_plan === MERIDIAN_PRO_PLAN;

    if (alreadyActive) {
      return response.status(200).json({
        success: true,
        message: "Meridian Pro is already active for this user.",
        data: {
          subscription_status: "active",
          subscription_plan: MERIDIAN_PRO_PLAN,
          subscription_started_at: startedAt.toISOString(),
          subscription_expires_at: expiresAt.toISOString(),
          already_active: true,
        },
      });
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        subscription_status: "active",
        subscription_plan: MERIDIAN_PRO_PLAN,
        subscription_started_at: startedAt.toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error("Profile subscription activation failed:", profileUpdateError);
      return response.status(500).json({
        success: false,
        message: "Unable to activate Meridian Pro for this account.",
      });
    }

    return response.status(200).json({
      success: true,
      message: "Payment successful. Welcome to Meridian Pro.",
      data: {
        subscription_status: "active",
        subscription_plan: MERIDIAN_PRO_PLAN,
        subscription_started_at: startedAt.toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Paystack verification error:", error);

    return response.status(500).json({
      success: false,
      message: "Unable to verify the Paystack transaction right now.",
    });
  }
}
