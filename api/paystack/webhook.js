import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  fetchPaystackTransaction,
  getPlanFromMetadata,
  recordSuccessfulPayment,
} from "../../server/paystack.js";
import { env } from "../../server/env.js";

const SUPABASE_URL =
  env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const PAYSTACK_SECRET_KEY = env("PAYSTACK_SECRET_KEY");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const config = {
  api: { bodyParser: false },
};

function errorResponse(response, status, message) {
  return response.status(status).json({ success: false, message });
}

function acknowledge(response, message) {
  return response.status(200).json({ success: true, message });
}

function toText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }

  return null;
}

// Returns the request body and whether it is byte-for-byte what Paystack
// signed. The stream is read before touching request.body, because some
// runtimes parse the body lazily on first access and consume the stream.
async function readRawBody(request) {
  const rawBody = toText(request.rawBody);
  if (rawBody !== null) {
    return { text: rawBody, exact: true };
  }

  if (request.readable && !request.readableEnded) {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length > 0) {
      return { text: Buffer.concat(chunks).toString("utf8"), exact: true };
    }
  }

  const bodyText = toText(request.body);
  if (bodyText !== null) {
    return { text: bodyText, exact: true };
  }

  if (request.body && typeof request.body === "object") {
    return { text: JSON.stringify(request.body), exact: false };
  }

  return { text: "", exact: true };
}

function hasValidSignature(rawBody, signature) {
  if (typeof signature !== "string" || !/^[a-f\d]{128}$/i.test(signature)) {
    return false;
  }

  const expected = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest();
  const provided = Buffer.from(signature, "hex");

  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(expected, provided)
  );
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return errorResponse(response, 405, "Method not allowed. Use POST.");
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !PAYSTACK_SECRET_KEY
  ) {
    console.error("Paystack webhook is missing server configuration.");
    return errorResponse(
      response,
      500,
      "Payment webhook is not configured on the server."
    );
  }

  let body;
  try {
    body = await readRawBody(request);
  } catch (error) {
    console.error("Unable to read Paystack webhook request body:", error);
    return errorResponse(response, 400, "Unable to read webhook payload.");
  }

  const signatureIsValid = hasValidSignature(
    body.text,
    request.headers["x-paystack-signature"]
  );

  // With the exact bytes available, an invalid signature is a forged request.
  // If the runtime only exposed a re-serialized body, the signature cannot be
  // checked reliably; the payment is still confirmed with Paystack below.
  if (!signatureIsValid) {
    if (body.exact) {
      return errorResponse(response, 401, "Invalid Paystack webhook signature.");
    }

    console.warn(
      "Paystack webhook raw body unavailable; relying on Paystack API verification."
    );
  }

  let event;
  try {
    event = JSON.parse(body.text);
  } catch {
    return errorResponse(response, 400, "Malformed Paystack webhook payload.");
  }

  if (!event || typeof event.event !== "string" || !event.data) {
    return errorResponse(
      response,
      400,
      "Incomplete Paystack webhook payload received."
    );
  }

  if (
    event.event === "charge.failed" ||
    event.event === "invoice.payment_failed"
  ) {
    return acknowledge(
      response,
      "Failed payment acknowledged; existing access is unchanged."
    );
  }

  if (
    event.event === "subscription.disable" ||
    event.event === "subscription.cancelled"
  ) {
    return acknowledge(
      response,
      "Cancellation acknowledged; paid access remains until expiry."
    );
  }

  if (event.event !== "charge.success") {
    return acknowledge(response, "Webhook event acknowledged without changes.");
  }

  const reference =
    typeof event.data.reference === "string"
      ? event.data.reference.trim()
      : "";

  if (!reference || reference.length > 200) {
    return acknowledge(
      response,
      "Charge without a usable reference ignored."
    );
  }

  // Trust Paystack's API, not the webhook payload, for the payment details.
  let transaction;
  try {
    transaction = await fetchPaystackTransaction(
      PAYSTACK_SECRET_KEY,
      reference
    );
  } catch (error) {
    console.error("Paystack webhook transaction lookup failed:", error);
    // Non-2xx makes Paystack retry the webhook later.
    return errorResponse(
      response,
      502,
      "Unable to confirm the payment with Paystack."
    );
  }

  const metadata = transaction.metadata;
  const plan = getPlanFromMetadata(metadata);
  const amount = Number(transaction.amount);
  const userId = metadata?.user_id;

  if (
    transaction.reference !== reference ||
    transaction.status !== "success" ||
    !plan ||
    typeof userId !== "string" ||
    !UUID_PATTERN.test(userId) ||
    transaction.currency !== "NGN" ||
    !Number.isSafeInteger(amount) ||
    amount !== plan.amount
  ) {
    // Not a TradeFrame subscription charge (or not payable); acknowledge so
    // Paystack stops retrying an event that will never succeed.
    console.warn("Ignoring Paystack charge that is not a valid TradeFrame plan:", {
      reference,
    });
    return acknowledge(
      response,
      "Charge is not a valid TradeFrame subscription payment; ignored."
    );
  }

  const paidAt = new Date(
    transaction.paid_at || transaction.created_at || ""
  );
  if (Number.isNaN(paidAt.getTime())) {
    console.warn("Ignoring Paystack charge without a valid timestamp:", {
      reference,
    });
    return acknowledge(
      response,
      "Charge without a valid payment timestamp ignored."
    );
  }

  try {
    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    const result = await recordSuccessfulPayment(adminClient, {
      userId,
      reference,
      amount,
      currency: transaction.currency,
      paidAt: paidAt.toISOString(),
      plan,
    });

    return acknowledge(
      response,
      result.duplicate
        ? "Duplicate Paystack event acknowledged; payment was already processed."
        : "TradeFrame Pro activated from verified Paystack payment."
    );
  } catch (error) {
    console.error("Paystack webhook payment processing failed:", error);

    // A conflicting reference will never succeed on retry.
    if (error.code === "23505") {
      return acknowledge(
        response,
        "Payment reference conflicts with another payment; ignored."
      );
    }

    return errorResponse(
      response,
      500,
      "Unable to process the verified Paystack payment."
    );
  }
}
