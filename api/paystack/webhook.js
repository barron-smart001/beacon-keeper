import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  getPlanFromMetadata,
  recordSuccessfulPayment,
} from "../../server/paystack.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export const config = {
  api: { bodyParser: false },
};

function errorResponse(response, status, message) {
  return response.status(status).json({ success: false, message });
}

async function readRawBody(request) {
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

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
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

  let rawBody;
  try {
    rawBody = await readRawBody(request);
  } catch (error) {
    console.error("Unable to read Paystack webhook request body:", error);
    return errorResponse(response, 400, "Unable to read webhook payload.");
  }

  if (
    !hasValidSignature(
      rawBody,
      request.headers["x-paystack-signature"]
    )
  ) {
    return errorResponse(response, 401, "Invalid Paystack webhook signature.");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
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
    return response.status(200).json({
      success: true,
      message: "Failed payment acknowledged; existing access is unchanged.",
    });
  }

  if (
    event.event === "subscription.disable" ||
    event.event === "subscription.cancelled"
  ) {
    return response.status(200).json({
      success: true,
      message: "Cancellation acknowledged; paid access remains until expiry.",
    });
  }

  if (event.event !== "charge.success") {
    return response.status(200).json({
      success: true,
      message: "Webhook event acknowledged without changes.",
    });
  }

  const transaction = event.data;
  const metadata = transaction.metadata;
  const reference =
    typeof transaction.reference === "string"
      ? transaction.reference.trim()
      : "";
  const plan = getPlanFromMetadata(metadata);
  const amount = Number(transaction.amount);

  if (
    transaction.status !== "success" ||
    !reference ||
    !metadata?.user_id ||
    !plan ||
    transaction.currency !== "NGN" ||
    !Number.isSafeInteger(amount) ||
    amount !== plan.amount
  ) {
    return errorResponse(
      response,
      400,
      "Paystack payment details do not match a valid Meridian plan."
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

  try {
    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    const result = await recordSuccessfulPayment(adminClient, {
      userId: metadata.user_id,
      reference,
      amount,
      currency: transaction.currency,
      paidAt: paidAt.toISOString(),
      plan,
    });

    return response.status(200).json({
      success: true,
      message: result.duplicate
        ? "Duplicate Paystack event acknowledged; payment was already processed."
        : "Meridian Pro activated from verified Paystack payment.",
    });
  } catch (error) {
    console.error("Paystack webhook payment processing failed:", error);
    return errorResponse(
      response,
      error.code === "23505" ? 409 : 500,
      error.code === "23505"
        ? "This payment reference conflicts with another payment."
        : "Unable to process the verified Paystack payment."
    );
  }
}
