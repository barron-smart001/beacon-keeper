import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

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

function addMonths(date, months) {
  const result = new Date(date);

  result.setMonth(result.getMonth() + months);

  return result;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response
      .status(405)
      .json(getServerError("Method not allowed. Use POST."));
  }

  /*
   * ---------------------------------------------------------
   * SERVER CONFIGURATION
   * ---------------------------------------------------------
   */

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(500).json(
      getServerError(
        "Missing Supabase server configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server."
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

  if (!PAYSTACK_SECRET_KEY) {
    return response.status(500).json(
      getServerError(
        "Missing Paystack server configuration. Set PAYSTACK_SECRET_KEY on the server."
      )
    );
  }

  /*
   * ---------------------------------------------------------
   * AUTHENTICATION
   * ---------------------------------------------------------
   */

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
    /*
     * -------------------------------------------------------
     * REQUEST BODY
     * -------------------------------------------------------
     */

    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body || "{}")
        : request.body || {};

    const reference = body.reference;

    if (!reference) {
      return response.status(400).json(
        getServerError(
          "Paystack transaction reference is required."
        )
      );
    }

    /*
     * -------------------------------------------------------
     * VERIFY MERIDIAN USER
     * -------------------------------------------------------
     */

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
      console.error(
        "Supabase user verification failed:",
        userError
      );

      return response.status(401).json(
        getServerError(
          "Unable to verify the authenticated Meridian user."
        )
      );
    }

    const user = userData.user;

    const userId = user.id;
    const userEmail = user.email;

    if (!userId || !userEmail) {
      return response.status(400).json(
        getServerError(
          "The authenticated Meridian user is missing required profile data."
        )
      );
    }

    /*
     * -------------------------------------------------------
     * VERIFY PAYMENT WITH PAYSTACK
     * -------------------------------------------------------
     */

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          Accept: "application/json",
        },
      }
    );

    const paystackPayload = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackPayload?.status ||
      !paystackPayload?.data
    ) {
      console.error(
        "Paystack verification failed:",
        paystackPayload
      );

      return response.status(400).json({
        success: false,
        message:
          paystackPayload?.message ||
          "Paystack verification failed. Please try again.",
      });
    }

    const transaction = paystackPayload.data;

    /*
     * -------------------------------------------------------
     * PAYMENT DATA
     * -------------------------------------------------------
     */

    const metadata = transaction.metadata || {};

    const isSuccessful =
      transaction.status === "success";

    const isCorrectCurrency =
      transaction.currency === "NGN";

    /*
     * -------------------------------------------------------
     * STRICT USER MATCH
     *
     * We do NOT accept email-only matching.
     * The payment must contain the authenticated
     * Meridian user's ID.
     * -------------------------------------------------------
     */

    const isMatchingUser =
      metadata.user_id === userId;

    if (!isSuccessful) {
      return response.status(400).json({
        success: false,
        message:
          "Paystack payment is not yet successful.",
      });
    }

    if (!isCorrectCurrency) {
      return response.status(400).json({
        success: false,
        message:
          "Paystack payment currency must be NGN.",
      });
    }

    if (!isMatchingUser) {
      return response.status(403).json({
        success: false,
        message:
          "This Paystack payment does not belong to the authenticated Meridian user.",
      });
    }

    /*
     * -------------------------------------------------------
     * VERIFY PRODUCT
     * -------------------------------------------------------
     */

    if (metadata.product !== "meridian_pro") {
      return response.status(400).json({
        success: false,
        message:
          "This Paystack transaction is not a Meridian Pro payment.",
      });
    }

    /*
     * -------------------------------------------------------
     * VERIFY PLAN
     * -------------------------------------------------------
     */

    const planId = metadata.plan;

    const selectedPlan = PLANS[planId];

    if (!selectedPlan) {
      return response.status(400).json({
        success: false,
        message:
          "The Paystack payment contains an invalid Meridian subscription plan.",
      });
    }

    /*
     * -------------------------------------------------------
     * VERIFY AMOUNT
     * -------------------------------------------------------
     */

    const transactionAmount =
      Number(transaction.amount);

    if (transactionAmount !== selectedPlan.amount) {
      return response.status(400).json({
        success: false,
        message:
          `Paystack payment amount does not match the ${selectedPlan.name} Meridian plan.`,
      });
    }

    /*
     * -------------------------------------------------------
     * ADMIN SUPABASE CLIENT
     * -------------------------------------------------------
     */

    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * -------------------------------------------------------
     * CHECK FOR DUPLICATE PAYMENT
     * -------------------------------------------------------
     */

    const {
      data: existingPayment,
      error: paymentLookupError,
    } = await adminClient
      .from("payment_transactions")
      .select(
        "id, user_id, status, reference, amount, currency, provider, paid_at"
      )
      .eq("reference", reference)
      .maybeSingle();

    if (
      paymentLookupError &&
      paymentLookupError.code !== "PGRST116"
    ) {
      console.error(
        "Payment lookup failed:",
        paymentLookupError
      );

      return response.status(500).json({
        success: false,
        message:
          "Unable to check the payment record history.",
      });
    }

    /*
     * If payment already exists, do not create it again.
     */

    if (existingPayment) {
      if (existingPayment.user_id !== userId) {
        return response.status(409).json({
          success: false,
          message:
            "This Paystack transaction reference is already linked to another Meridian account.",
        });
      }

      if (existingPayment.status === "success") {
        const {
          data: currentProfile,
          error: currentProfileError,
        } = await adminClient
          .from("profiles")
          .select(
            "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
          )
          .eq("id", userId)
          .single();

        if (currentProfileError) {
          return response.status(500).json({
            success: false,
            message:
              "Payment was processed, but Meridian could not load the current subscription.",
          });
        }

        return response.status(200).json({
          success: true,

          message:
            "This Paystack payment was already processed successfully.",

          data: {
            payment_record: existingPayment,

            subscription_status:
              currentProfile.subscription_status,

            subscription_plan:
              currentProfile.subscription_plan,

            subscription_started_at:
              currentProfile.subscription_started_at,

            subscription_expires_at:
              currentProfile.subscription_expires_at,

            already_processed: true,
          },
        });
      }

      return response.status(409).json({
        success: false,
        message:
          "This Paystack reference has already been processed.",
      });
    }

    /*
     * -------------------------------------------------------
     * LOAD CURRENT PROFILE
     * -------------------------------------------------------
     */

    const {
      data: profileData,
      error: profileReadError,
    } = await adminClient
      .from("profiles")
      .select(
        "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
      )
      .eq("id", userId)
      .single();

    if (profileReadError) {
      console.error(
        "Profile lookup failed:",
        profileReadError
      );

      return response.status(500).json({
        success: false,
        message:
          "Unable to load the Meridian profile for activation.",
      });
    }

    /*
     * -------------------------------------------------------
     * CALCULATE SUBSCRIPTION PERIOD
     *
     * If the user still has an active future subscription,
     * extend from the existing expiry.
     *
     * Otherwise start from now.
     * -------------------------------------------------------
     */

    const now = new Date();

    const existingExpiry =
      profileData.subscription_expires_at
        ? new Date(
            profileData.subscription_expires_at
          )
        : null;

    const hasFutureSubscription =
      profileData.subscription_status === "active" &&
      profileData.subscription_plan === "pro" &&
      existingExpiry &&
      existingExpiry.getTime() > now.getTime();

    const subscriptionStart =
      hasFutureSubscription
        ? existingExpiry
        : now;

    const subscriptionExpires = addMonths(
      subscriptionStart,
      selectedPlan.durationMonths
    );

    /*
     * -------------------------------------------------------
     * INSERT PAYMENT RECORD
     * -------------------------------------------------------
     */

    const paymentAmount =
      transactionAmount / 100;

    const {
      error: paymentInsertError,
    } = await adminClient
      .from("payment_transactions")
      .insert({
        user_id: userId,
        reference,
        amount: paymentAmount,
        currency: transaction.currency,
        status: "success",
        provider: "paystack",

        paid_at: transaction.paid_at
          ? new Date(
              transaction.paid_at
            ).toISOString()
          : now.toISOString(),
      });

    if (paymentInsertError) {
      if (paymentInsertError.code === "23505") {
        return response.status(409).json({
          success: false,
          message:
            "This Paystack reference was already processed. Duplicate payment protection prevented a second activation.",
        });
      }

      console.error(
        "Payment record creation failed:",
        paymentInsertError
      );

      return response.status(500).json({
        success: false,
        message:
          "Unable to store the Meridian payment record.",
      });
    }

    /*
     * -------------------------------------------------------
     * ACTIVATE MERIDIAN PRO
     * -------------------------------------------------------
     */

    const {
      data: updatedProfile,
      error: profileUpdateError,
    } = await adminClient
      .from("profiles")
      .update({
        subscription_status: "active",
        subscription_plan: "pro",

        subscription_started_at:
          subscriptionStart.toISOString(),

        subscription_expires_at:
          subscriptionExpires.toISOString(),
      })
      .eq("id", userId)
      .select(
        "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
      )
      .single();

    if (profileUpdateError) {
      console.error(
        "Profile subscription activation failed:",
        profileUpdateError
      );

      return response.status(500).json({
        success: false,
        message:
          "Payment was recorded, but Meridian could not activate Pro access. Please contact support.",
      });
    }

    /*
     * -------------------------------------------------------
     * SUCCESS
     * -------------------------------------------------------
     */

    return response.status(200).json({
      success: true,

      message:
        "Payment successful. Welcome to Meridian Pro.",

      data: {
        plan: selectedPlan.id,

        plan_name: selectedPlan.name,

        amount: paymentAmount,

        duration_months:
          selectedPlan.durationMonths,

        subscription_status:
          updatedProfile.subscription_status,

        subscription_plan:
          updatedProfile.subscription_plan,

        subscription_started_at:
          updatedProfile.subscription_started_at,

        subscription_expires_at:
          updatedProfile.subscription_expires_at,
      },
    });
  } catch (error) {
    console.error(
      "Paystack verification error:",
      error
    );

    return response.status(500).json({
      success: false,
      message:
        "Unable to verify the Paystack transaction right now.",
    });
  }
}