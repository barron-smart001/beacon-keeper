import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const MERIDIAN_PRO_PLAN = "pro";
const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

function getServerError(message) {
  return {
    success: false,
    message,
  };
}

function getRawBody(request) {
  if (typeof request.body === "string") {
    return request.body;
  }

  if (Buffer.isBuffer(request.body)) {
    return request.body.toString("utf8");
  }

  if (request.body instanceof Uint8Array) {
    return Buffer.from(request.body).toString("utf8");
  }

  if (request.body && typeof request.body === "object") {
    return JSON.stringify(request.body);
  }

  return "";
}

function getNextExpiry(existingExpiryIso, now) {
  const nowValue = now instanceof Date ? now : new Date(now);

  if (existingExpiryIso) {
    const existingExpiry = new Date(existingExpiryIso);

    if (!Number.isNaN(existingExpiry.getTime()) && existingExpiry.getTime() > nowValue.getTime()) {
      return new Date(existingExpiry.getTime() + MONTH_IN_MS);
    }
  }

  return new Date(nowValue.getTime() + MONTH_IN_MS);
}

async function loadProfile(adminClient, userId) {
  const { data, error } = await adminClient
    .from("profiles")
    .select(
      "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

async function reconcileProfileActivation(adminClient, userId, activationTime) {
  const profile = await loadProfile(adminClient, userId);

  const paymentDate = activationTime instanceof Date ? activationTime : new Date(activationTime);
  const existingExpiry = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
  const isAlreadyActivePro =
    profile?.subscription_status === "active" &&
    profile?.subscription_plan === MERIDIAN_PRO_PLAN;

  let nextStartedAt = paymentDate;
  let nextExpiresAt = new Date(paymentDate.getTime() + MONTH_IN_MS);

  if (isAlreadyActivePro && existingExpiry && existingExpiry.getTime() > paymentDate.getTime()) {
    nextStartedAt = profile?.subscription_started_at
      ? new Date(profile.subscription_started_at)
      : paymentDate;
    nextExpiresAt = new Date(existingExpiry.getTime() + MONTH_IN_MS);
  }

  const { data: updatedProfile, error: updateError } = await adminClient
    .from("profiles")
    .update({
      subscription_status: "active",
      subscription_plan: MERIDIAN_PRO_PLAN,
      subscription_started_at: nextStartedAt.toISOString(),
      subscription_expires_at: nextExpiresAt.toISOString(),
    })
    .eq("id", userId)
    .select(
      "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
    )
    .single();

  if (updateError) {
    throw updateError;
  }

  return updatedProfile;
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
        "Missing Paystack webhook configuration. Set PAYSTACK_SECRET_KEY on the server."
      )
    );
  }

  const rawBody = getRawBody(request);
  const signature = request.headers["x-paystack-signature"] || request.headers["X-Paystack-Signature"];

  if (!signature) {
    return response.status(401).json(
      getServerError("Missing Paystack webhook signature.")
    );
  }

  const expectedSignature = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  try {
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const providedBuffer = Buffer.from(String(signature), "utf8");

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return response.status(401).json(
        getServerError("Invalid Paystack webhook signature.")
      );
    }
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return response.status(401).json(
      getServerError("Invalid Paystack webhook signature.")
    );
  }

  let event;

  try {
    event = JSON.parse(rawBody || "{}");
  } catch (error) {
    return response.status(400).json(
      getServerError("Malformed Paystack webhook payload.")
    );
  }

  const eventName = event?.event;
  const transaction = event?.data;

  if (!eventName || !transaction) {
    return response.status(400).json(
      getServerError("Incomplete Paystack webhook payload received.")
    );
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const reference = transaction.reference;
  const amountInKobo = Number(transaction.amount || 0);
  const currency = String(transaction.currency || "").toUpperCase();
  const metadata = transaction.metadata || {};
  const userId = metadata.user_id || null;
  const paymentDate = transaction.paid_at
    ? new Date(transaction.paid_at)
    : transaction.created_at
      ? new Date(transaction.created_at)
      : new Date();
  const paidAt = Number.isNaN(paymentDate.getTime()) ? new Date().toISOString() : paymentDate.toISOString();

  if (eventName === "charge.success") {
    if (!reference) {
      return response.status(400).json(
        getServerError("Paystack webhook is missing a transaction reference.")
      );
    }

    if (!userId) {
      return response.status(400).json(
        getServerError("Paystack webhook payload is missing the Meridian user association.")
      );
    }

    if (metadata.product !== "meridian_pro") {
      return response.status(400).json({
        success: false,
        message: "Paystack payment is not for the Meridian Pro product.",
      });
    }

    if (currency !== "NGN") {
      return response.status(200).json({
        success: true,
        message: "Ignoring Paystack webhook for unsupported currency.",
      });
    }

    if (amountInKobo !== 1800000) {
      return response.status(200).json({
        success: true,
        message: "Ignoring Paystack webhook for unsupported Meridian Pro amount.",
      });
    }

    const { data: existingPayment, error: paymentLookupError } = await adminClient
      .from("payment_transactions")
      .select("id, reference, status, user_id")
      .eq("reference", reference)
      .maybeSingle();

    if (paymentLookupError && paymentLookupError.code !== "PGRST116") {
      console.error("Webhook payment lookup failed:", paymentLookupError);
      return response.status(500).json(
        getServerError("Unable to check the payment record history.")
      );
    }

    if (existingPayment) {
      if (existingPayment.user_id !== userId) {
        return response.status(409).json({
          success: false,
          message: "This Paystack reference belongs to another Meridian user.",
        });
      }

      const profile = await loadProfile(adminClient, userId);
      const isAlreadyActivePro =
        profile?.subscription_status === "active" &&
        profile?.subscription_plan === MERIDIAN_PRO_PLAN;

      if (existingPayment.status === "success") {
        if (isAlreadyActivePro) {
          return response.status(200).json({
            success: true,
            message: "Duplicate Paystack webhook received; subscription already active.",
            data: {
              reference,
              duplicate: true,
              subscription_status: profile.subscription_status,
              subscription_plan: profile.subscription_plan,
              subscription_started_at: profile.subscription_started_at,
              subscription_expires_at: profile.subscription_expires_at,
            },
          });
        }

        try {
          const reconciledProfile = await reconcileProfileActivation(adminClient, userId, paymentDate);

          return response.status(200).json({
            success: true,
            message: "Successful payment reference already existed; subscription state reconciled.",
            data: {
              reference,
              duplicate: true,
              ...reconciledProfile,
            },
          });
        } catch (profileError) {
          console.error("Webhook duplicate reconciliation failed:", profileError);
          return response.status(500).json(
            getServerError("Unable to reconcile an existing successful payment with the user profile.")
          );
        }
      }

      return response.status(409).json({
        success: false,
        message: "This Paystack reference has already been seen and cannot be processed again.",
      });
    }

    const { error: paymentInsertError } = await adminClient
      .from("payment_transactions")
      .insert({
        user_id: userId,
        reference,
        amount: amountInKobo / 100,
        currency,
        status: "success",
        provider: "paystack",
        paid_at: new Date(paidAt).toISOString(),
      });

    if (paymentInsertError) {
      if (paymentInsertError.code === "23505") {
        const { data: duplicatePayment, error: duplicateLookupError } = await adminClient
          .from("payment_transactions")
          .select("id, reference, status, user_id")
          .eq("reference", reference)
          .maybeSingle();

        if (duplicateLookupError && duplicateLookupError.code !== "PGRST116") {
          console.error("Duplicate payment lookup failed:", duplicateLookupError);
          return response.status(500).json(
            getServerError("Unable to reconcile the duplicate payment reference.")
          );
        }

        if (!duplicatePayment) {
          return response.status(409).json({
            success: false,
            message: "Payment reference conflict detected. Please retry verification.",
          });
        }

        if (duplicatePayment.user_id !== userId) {
          return response.status(409).json({
            success: false,
            message: "This Paystack reference belongs to another Meridian user.",
          });
        }

        try {
          const profile = await loadProfile(adminClient, userId);
          const isAlreadyActivePro =
            profile?.subscription_status === "active" &&
            profile?.subscription_plan === MERIDIAN_PRO_PLAN;

          if (isAlreadyActivePro) {
            return response.status(200).json({
              success: true,
              message: "Successful payment reference was already recorded; subscription already active.",
              data: {
                reference,
                duplicate: true,
                subscription_status: profile.subscription_status,
                subscription_plan: profile.subscription_plan,
                subscription_started_at: profile.subscription_started_at,
                subscription_expires_at: profile.subscription_expires_at,
              },
            });
          }

          const reconciledProfile = await reconcileProfileActivation(adminClient, userId, paymentDate);

          return response.status(200).json({
            success: true,
            message: "Successful payment reference was already recorded; subscription state was reconciled.",
            data: {
              reference,
              duplicate: true,
              ...reconciledProfile,
            },
          });
        } catch (reconcileError) {
          console.error("Duplicate payment reconciliation failed:", reconcileError);
          return response.status(500).json(
            getServerError("Unable to reconcile the duplicate payment with the profile.")
          );
        }
      }

      console.error("Webhook payment insert failed:", paymentInsertError);
      return response.status(500).json(
        getServerError("Unable to record the successful Paystack payment.")
      );
    }

    try {
      const reconciledProfile = await reconcileProfileActivation(adminClient, userId, paymentDate);

      return response.status(200).json({
        success: true,
        message: "Meridian Pro payment processed and subscription updated.",
        data: {
          reference,
          ...reconciledProfile,
        },
      });
    } catch (profileError) {
      console.error("Webhook subscription activation failed:", profileError);
      return response.status(500).json(
        getServerError("Unable to activate Meridian Pro after a successful payment.")
      );
    }
  }

  if (eventName === "charge.failed" || eventName === "invoice.payment_failed") {
    if (!reference) {
      return response.status(400).json(
        getServerError("Paystack failed payment event is missing a transaction reference.")
      );
    }

    if (!userId) {
      return response.status(200).json({
        success: true,
        message: "Failed payment event received without a valid Meridian user association; no payment record created.",
        data: { reference, status: "failed" },
      });
    }

    const { data: existingPayment } = await adminClient
      .from("payment_transactions")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (!existingPayment) {
      const { error: createFailedPaymentError } = await adminClient
        .from("payment_transactions")
        .insert({
          user_id: userId,
          reference,
          amount: amountInKobo / 100,
          currency,
          status: "failed",
          provider: "paystack",
          paid_at: null,
        });

      if (createFailedPaymentError) {
        console.error("Failed payment record creation failed:", createFailedPaymentError);
      }
    }

    return response.status(200).json({
      success: true,
      message: "Failed payment event received and ignored without removing active access.",
      data: { reference, status: "failed" },
    });
  }

  if (eventName === "subscription.disable" || eventName === "subscription.cancelled") {
    return response.status(200).json({
      success: true,
      message: "Cancellation received. Existing paid access remains until expiry; no data was deleted.",
    });
  }

  return response.status(200).json({
    success: true,
    message: "Webhook event acknowledged without an action change.",
    data: { event: eventName },
  });
}
