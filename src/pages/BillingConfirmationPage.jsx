import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import AppShell from "../components/app/AppShell";
import { useAuth } from "../hooks/useAuth";
import useSubscription from "../hooks/useSubscription";
import { getBillingPlan } from "../lib/billingPlans";
import { supabase } from "../lib/supabase";

function BillingConfirmationPage() {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedPlanId = searchParams.get("plan");
  const selectedPlan = selectedPlanId ? getBillingPlan(selectedPlanId) : null;
  const isInvalidPlan = Boolean(selectedPlanId) && !selectedPlan;

  async function handleConfirm() {
    if (!selectedPlan || isPreparingPayment) {
      return;
    }

    setIsPreparingPayment(true);
    setErrorMessage("");

    try {
      if (!user) {
        throw new Error("Please sign in before continuing to payment.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Your Recordium session is no longer active. Please sign in again.");
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: selectedPlan.id }),
      });

      const responseText = await response.text();
      if (!responseText) {
        if (import.meta.env.DEV) {
          console.error("Paystack initialize response:", {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
          });
        }
        throw new Error("The payment server returned an empty response.");
      }

      let payload = null;

      try {
        payload = JSON.parse(responseText);
      } catch {
        if (import.meta.env.DEV) {
          console.error("Paystack initialize response:", {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
          });
        }
        throw new Error("The payment server returned an invalid response.");
      }

      if (!response.ok || payload?.success !== true) {
        if (import.meta.env.DEV) {
          console.error("Paystack initialize response:", {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
          });
        }
        throw new Error(
          payload?.message || "Unable to start payment. Please try again."
        );
      }

      if (
        typeof payload?.data?.authorization_url !== "string" ||
        !payload.data.authorization_url
      ) {
        throw new Error(
          "Unable to start payment. Please try again."
        );
      }

      window.location.href = payload.data.authorization_url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start payment. Please try again."
      );
      setIsPreparingPayment(false);
    }
  }

  const planSummaryText = selectedPlan
    ? `${selectedPlan.name} · ${selectedPlan.displayPrice}`
    : "Select a valid plan";

  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
        >
          <div className="border-b border-[var(--border-soft)] bg-[var(--surface-elevated)]/60 px-5 py-4 sm:px-7">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <ShieldCheck size={12} />
                Secure checkout
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                <Lock size={11} />
                Paystack
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.18fr_0.82fr]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Review</p>
                {isSubscribed && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                    Active plan
                  </span>
                )}
              </div>

              {isInvalidPlan ? (
                <div className="mt-6 rounded-[20px] border border-red-500/40 bg-red-500/5 p-4 text-sm text-[var(--text-primary)]">
                  <p className="font-medium text-red-300">This plan is unavailable.</p>
                  <p className="mt-2 text-[var(--text-secondary)]">
                    Please choose a valid subscription plan from the billing page.
                  </p>
                </div>
              ) : (
                <>
                  <h1 className="mt-6 text-3xl font-medium tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                    Confirm Your Subscription
                  </h1>

                  <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">Plan</p>
                        <p className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[var(--text-primary)] sm:text-[2rem]">
                          {selectedPlan?.name || planSummaryText}
                        </p>
                      </div>
                      <div className="rounded-full border border-[var(--border)] bg-[var(--bg)] p-2 text-[var(--accent)]">
                        <CheckCircle2 size={18} />
                      </div>
                    </div>

                    <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] pb-3">
                        <span>Duration</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {selectedPlan?.durationLabel || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] pb-3">
                        <span>Amount</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {selectedPlan?.displayPrice || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Payment method</span>
                        <span className="font-medium text-[var(--text-primary)]">Paystack</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-sm leading-6 text-[var(--text-secondary)]">
                    Review your plan before continuing to secure payment.
                  </p>

                  <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    <div className="mt-0.5 rounded-full bg-[var(--surface-elevated)] p-1.5 text-[var(--accent)]">
                      <Lock size={14} />
                    </div>
                    <p>
                      You&apos;ll be redirected to Paystack to securely complete your payment.
                    </p>
                  </div>
                </>
              )}

              {errorMessage && (
                <div className="mt-5 rounded-[18px] border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/app/billing")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-elevated)]"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                {!isInvalidPlan && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPreparingPayment}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPreparingPayment ? "Preparing secure payment..." : "Confirm & Continue"}
                  </button>
                )}
              </div>
            </div>

            <aside className="border-t border-[var(--border-soft)] bg-[var(--bg)] p-5 sm:p-7 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <CreditCard size={16} className="text-[var(--accent)]" />
                Order summary
              </div>

              <div className="mt-6 space-y-5">
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Selected plan</p>
                  <p className="mt-3 text-xl font-medium text-[var(--text-primary)]">
                    {selectedPlan?.name || "Not selected"}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                    {selectedPlan?.displayPrice || "—"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {selectedPlan?.durationLabel || "Choose a valid plan"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
                  <p className="font-medium text-[var(--text-primary)]">What you’ll get</p>
                  <ul className="mt-4 space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 text-[var(--accent)]" />
                      <span>Full Recordium Pro access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 text-[var(--accent)]" />
                      <span>Advanced trading insights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 text-[var(--accent)]" />
                      <span>Secure payment through Paystack</span>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </motion.section>
      </main>
    </AppShell>
  );
}

export default BillingConfirmationPage;
