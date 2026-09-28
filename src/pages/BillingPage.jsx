import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import AppShell from "../components/app/AppShell";
import { useAuth } from "../hooks/useAuth";
import useSubscription from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";

const faqs = [
  {
    question: "What is Meridian Pro?",
    answer:
      "Meridian Pro is the only paid plan and unlocks the full analytics, financial tracking, and advanced trading insights in Meridian.",
  },
  {
    question: "What happens when I subscribe?",
    answer:
      "Your Meridian Pro access is activated after the payment flow is successfully completed and confirmed.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes. Subscription management will be available in billing settings once the payment integration is ready.",
  },
  {
    question: "Will my trading data remain intact?",
    answer:
      "Yes. Your records remain tied to your Meridian account regardless of subscription status.",
  },
];

const proFeatures = [
  "Advanced trading analytics",
  "Advanced performance insights",
  "Detailed trading statistics",
  "Enhanced financial tracking",
  "Advanced goals and discipline tracking",
  "Priority access to new features",
];

function PricingCard({
  title,
  price,
  label,
  features,
  ctaText,
  onClick,
  disabled = false,
  featured = false,
  delay = 0,
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      whileHover={!disabled ? { y: -6, scale: 1.01 } : undefined}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[26px] border p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] transition-all duration-300 sm:p-6 ${
        featured
          ? "border-[var(--accent)]/60 bg-[var(--surface)] shadow-[0_24px_64px_rgba(0,0,0,0.12)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80"
      }`}
    >
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: delay + 0.1 }}
          whileHover={{ y: -1, scale: 1.01 }}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-[var(--accent)]/35 bg-[var(--surface-elevated)]/90 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] shadow-[0_0_0_1px_rgba(230,176,74,0.12)] sm:right-4 sm:top-4 sm:gap-2 sm:px-3 sm:text-[10px]"
        >
          <motion.span
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <Sparkles size={11} className="shrink-0" />
          </motion.span>
          <span className="leading-none">Recommended</span>
        </motion.div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-[var(--text-primary)]">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
            {price}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-[var(--text-secondary)]">{label}</p>

      <ul className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--accent)]">
              <Check size={12} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <motion.button
          type="button"
          whileHover={!disabled ? { scale: 1.015 } : undefined}
          whileTap={!disabled ? { scale: 0.99 } : undefined}
          onClick={onClick}
          disabled={disabled}
          className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
            disabled
              ? "cursor-not-allowed border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-muted)]"
              : featured
                ? "bg-[var(--accent)] text-[#17130d] hover:bg-[var(--accent-light)]"
                : "border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
          }`}
        >
          {ctaText}
          {!disabled && <ArrowRight size={15} />}
        </motion.button>
      </div>
    </motion.article>
  );
}

function BillingHistory() {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Billing history</p>
      </div>

      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex min-h-[180px] items-center justify-center text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
              <CreditCard size={18} />
            </div>
            <p className="text-base font-medium text-[var(--text-primary)]">Your payment history will appear here once you make your first payment.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BillingFAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="mt-10">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">FAQ</p>
      </div>

      <div className="space-y-3">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)]"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.question}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="grid size-8 place-items-center rounded-full border border-[var(--border)] text-[var(--text-secondary)]"
                >
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="border-t border-[var(--border-soft)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)] sm:px-5">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function BillingPage() {
  const { user } = useAuth();
  const { subscription, isSubscribed, isLoading } = useSubscription();
  const [isInitializingCheckout, setIsInitializingCheckout] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [notice, setNotice] = useState("");

  async function verifyPaystackReference(reference) {
    if (!reference) return;

    setIsVerifyingPayment(true);
    setNotice("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Your Meridian session is no longer active. Please sign in again.");
      }

      const response = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reference }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || "The payment could not be verified."
        );
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("reference");
      window.history.replaceState({}, "", url.toString());

      setNotice("Payment successful. Welcome to Meridian Pro.");
      window.location.reload();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The payment could not be verified."
      );
    } finally {
      setIsVerifyingPayment(false);
    }
  }

  async function handleUpgrade() {
    if (isSubscribed || isInitializingCheckout) return;

    setIsInitializingCheckout(true);
    setNotice("");

    try {
      if (!user) {
        throw new Error("Please sign in before starting checkout.");
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
        throw new Error("Your Meridian session is no longer active. Please sign in again.");
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success || !payload?.data?.authorization_url) {
        throw new Error(
          payload?.message || "We couldn't start checkout. Please try again."
        );
      }

      window.location.href = payload.data.authorization_url;
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "We couldn't start checkout. Please try again."
      );
    } finally {
      setIsInitializingCheckout(false);
    }
  }

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");

    if (reference) {
      verifyPaystackReference(reference);
    }
  }, []);

  const planName = isSubscribed ? "Meridian Pro" : "No active plan";
  const statusText = isSubscribed ? "Active" : "Not subscribed";
  const billingText = isLoading
    ? "Checking subscription..."
    : isSubscribed
      ? subscription.expiresAt
        ? `Expires ${new Date(subscription.expiresAt).toLocaleDateString("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}`
        : "Subscription active"
      : "No active plan";

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] px-5 py-8 sm:px-8 sm:py-10"
        >
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-[var(--accent)]/10 blur-3xl"
          />

          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="pointer-events-none absolute -left-14 bottom-0 h-44 w-44 rounded-full bg-[var(--surface-elevated)] blur-3xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <ShieldCheck size={12} />
              Premium access
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.12 }}
              className="mt-5 max-w-xl text-3xl font-medium tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl"
            >
              Upgrade your trading experience.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.18 }}
              className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base"
            >
              Meridian Pro gives you the tools to trade with more clarity, focus, and control.
            </motion.p>
          </div>
        </motion.section>

        {notice && (
          <section className="mt-6">
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              {notice}
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Current plan</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Plan</p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-xl font-medium text-[var(--text-primary)]">{planName}</p>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {statusText}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Billing & payments</p>
                <p className="mt-2">{billingText}</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Choose your plan</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-1">
            <PricingCard
              title="Meridian Pro"
              price="₦18,000 / month"
              label="The complete Meridian experience for serious traders"
              features={proFeatures}
              ctaText={
                isInitializingCheckout
                  ? "Starting checkout..."
                  : isSubscribed
                    ? "Current plan"
                    : "Subscribe to Meridian Pro"
              }
              onClick={handleUpgrade}
              disabled={isSubscribed || isInitializingCheckout}
              featured
              delay={0.15}
            />
          </div>
        </section>

        <BillingHistory />

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Payment information</p>
          </div>

          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Your payment details will be securely managed through our payment provider.
            </p>
          </div>
        </section>

        <BillingFAQ />
      </main>
    </AppShell>
  );
}

export default BillingPage;
