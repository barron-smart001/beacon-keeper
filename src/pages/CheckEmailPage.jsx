import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, ExternalLink, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import RecordiumMark from "../components/ui/RecordiumMark";
import { supabase } from "../lib/supabase";

const RESEND_COOLDOWN_SECONDS = 60;

const progress = [
  { label: "Create account", state: "done" },
  { label: "Verify email", state: "current" },
  { label: "Set up workspace", state: "next" },
];

const nextUp = [
  "Plan before you trade",
  "Record what actually happened",
  "Review your decisions honestly",
];

const mailProviders = [
  { name: "Gmail", url: "https://mail.google.com", domains: ["gmail.com", "googlemail.com"] },
  {
    name: "Outlook",
    url: "https://outlook.live.com/mail",
    domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"],
  },
  { name: "Yahoo Mail", url: "https://mail.yahoo.com", domains: ["yahoo.com", "ymail.com"] },
  { name: "iCloud Mail", url: "https://www.icloud.com/mail", domains: ["icloud.com", "me.com"] },
  { name: "Proton Mail", url: "https://mail.proton.me", domains: ["proton.me", "protonmail.com"] },
];

function providerFor(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return mailProviders.find((provider) => provider.domains.includes(domain)) ?? null;
}

/** A small envelope that gently floats, with a soft pulse behind it. */
function EnvelopeArt() {
  const reduce = useReducedMotion();
  const float = reduce ? {} : { y: [0, -8, 0] };
  const pulse = reduce ? { opacity: 0.18 } : { scale: [1, 1.55], opacity: [0.35, 0] };

  return (
    <div className="relative mx-auto grid size-36 place-items-center sm:size-40" aria-hidden="true">
      <motion.span
        className="absolute inset-3 rounded-full border border-[var(--accent)]"
        animate={pulse}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.span
        className="absolute inset-3 rounded-full border border-[var(--accent)]"
        animate={pulse}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: 1.3 }}
      />
      <span className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.22),transparent_70%)]" />

      <motion.svg
        viewBox="0 0 160 124"
        className="relative w-28 sm:w-32"
        animate={float}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="36" y="14" width="88" height="62" rx="7" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.5" />
        <rect x="48" y="28" width="46" height="5" rx="2.5" fill="var(--accent)" opacity="0.9" />
        <rect x="48" y="40" width="64" height="4" rx="2" fill="var(--text-muted)" opacity="0.5" />
        <rect x="48" y="50" width="54" height="4" rx="2" fill="var(--text-muted)" opacity="0.35" />
        <path
          d="M14 46 L80 92 L146 46 V104 a12 12 0 0 1 -12 12 H26 a12 12 0 0 1 -12 -12 Z"
          fill="var(--surface-elevated)"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M14 46 L80 92 L146 46" fill="none" stroke="var(--accent-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="132" cy="30" r="13" fill="var(--accent)" />
        <path d="M126 30 l4.5 4.5 L139 26" fill="none" stroke="#17130d" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </div>
  );
}

/** Where the person is in sign-up. Same layout at every screen size. */
function Progress() {
  return (
    <ol className="flex items-start" aria-label="Sign-up progress">
      {progress.map((step, index) => (
        <li key={step.label} className="relative flex flex-1 flex-col items-center text-center">
          {index > 0 && (
            <span
              aria-hidden="true"
              className={`absolute right-1/2 top-[13px] h-px w-full ${
                step.state === "next" ? "bg-[var(--border)]" : "bg-[var(--accent)]"
              }`}
            />
          )}

          <span
            aria-current={step.state === "current" ? "step" : undefined}
            className={`relative z-10 grid size-[26px] place-items-center rounded-full border text-[11px] font-semibold ${
              step.state === "done"
                ? "border-[var(--accent)] bg-[var(--accent)] text-[#17130d]"
                : step.state === "current"
                  ? "border-[var(--accent)] bg-[var(--bg)] text-[var(--accent)] shadow-[0_0_0_4px_rgba(201,168,118,0.16)]"
                  : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)]"
            }`}
          >
            {step.state === "done" ? <Check size={14} strokeWidth={3} /> : index + 1}
          </span>

          <span
            className={`mt-2 px-1 text-[11px] leading-4 sm:text-xs ${
              step.state === "next" ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
            }`}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Circular countdown for the resend wait. */
function CountdownRing({ secondsLeft }) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const fraction = secondsLeft / RESEND_COOLDOWN_SECONDS;

  return (
    <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
      <circle cx="10" cy="10" r={radius} fill="none" stroke="var(--border)" strokeWidth="2" />
      <circle
        cx="10"
        cy="10"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

function CheckEmailPage() {
  const location = useLocation();
  const email = location.state?.email;

  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", text }

  // Resending is allowed again after a short wait.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Opened directly, with no sign-up behind it: nothing to show.
  if (!email) return <Navigate to="/sign-up" replace />;

  const provider = providerFor(email);

  async function resend() {
    if (isResending || secondsLeft > 0) return;

    setIsResending(true);
    setStatus(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/sign-in` },
    });

    setIsResending(false);

    if (error) {
      setStatus({
        type: "error",
        text: "We couldn't resend the email just now. Please wait a moment and try again.",
      });
      return;
    }

    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    setStatus({ type: "success", text: "Sent again. It can take a minute to arrive." });
  }

  return (
    <main className="grid min-h-screen bg-[var(--bg)] lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand side: large screens only, matching the sign-in page */}
      <section className="relative hidden overflow-hidden border-r border-[var(--border-soft)] bg-[var(--surface)] p-10 lg:flex lg:flex-col">
        <Link to="/" className="relative z-10 flex items-center gap-2.5 self-start font-semibold tracking-[-0.03em]">
          <RecordiumMark /> TradeFrame
        </Link>

        <div className="pointer-events-none absolute -bottom-48 -left-48 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.13),transparent_65%)]" />

        <div className="relative z-10 my-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Almost there
          </p>

          <h1 className="mt-5 text-5xl font-medium tracking-[-0.055em]">
            One tap away from your record.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[var(--text-secondary)]">
            Verifying your email keeps your trading journal private and yours. It takes a few seconds.
          </p>

          <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[#0d0e12] p-5">
            <p className="text-sm font-medium">Waiting for you inside</p>

            <div className="mt-5 space-y-3">
              {nextUp.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="grid size-5 place-items-center rounded-full bg-[rgba(201,168,118,0.14)] text-[var(--accent)]">
                    <Check size={12} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-[var(--text-muted)]">
          Your trading. Your money. Your discipline.
        </p>
      </section>

      {/* Content side: every screen size */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute left-1/2 top-0 size-[420px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.12),transparent_70%)] lg:hidden" />

        <div className="relative w-full max-w-md">
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2.5 font-semibold tracking-[-0.03em] lg:hidden"
          >
            <RecordiumMark /> TradeFrame
          </Link>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
            <Progress />

            <div className="mt-8">
              <EnvelopeArt />
            </div>

            <h2 className="mt-4 text-center text-[1.75rem] font-medium leading-tight tracking-[-0.045em] sm:text-3xl">
              Check your email
            </h2>

            <p className="mt-3 text-center text-sm leading-6 text-[var(--text-secondary)]">
              We sent a verification link to
            </p>

            <p className="mx-auto mt-2 flex max-w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
              <Mail size={15} className="shrink-0 text-[var(--accent)]" />
              <span className="min-w-0 break-all">{email}</span>
            </p>

            <p className="mt-4 text-center text-sm leading-6 text-[var(--text-secondary)]">
              Open it and tap the link to activate your account. Then come back and sign in.
            </p>

            <div className="mt-6 space-y-3">
              {provider && (
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)]"
                >
                  Open {provider.name} <ExternalLink size={15} />
                </a>
              )}

              <Link
                to="/sign-in"
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition ${
                  provider
                    ? "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                    : "bg-[var(--accent)] text-[#17130d] hover:bg-[var(--accent-light)]"
                }`}
              >
                I’ve verified, sign in <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-5 flex flex-col items-center gap-1 text-center">
              <button
                type="button"
                onClick={resend}
                disabled={isResending || secondsLeft > 0}
                className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full px-4 text-sm font-medium text-[var(--text-secondary)] transition enabled:hover:text-[var(--text-primary)] disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : secondsLeft > 0 ? (
                  <CountdownRing secondsLeft={secondsLeft} />
                ) : (
                  <Mail size={16} className="text-[var(--accent)]" />
                )}
                {isResending
                  ? "Sending…"
                  : secondsLeft > 0
                    ? `Resend email in ${secondsLeft}s`
                    : "Didn’t get it? Resend email"}
              </button>

              <div role="status" aria-live="polite" className="min-h-5">
                {status && (
                  <p
                    className={`flex items-center justify-center gap-2 text-xs ${
                      status.type === "error" ? "text-[var(--danger)]" : "text-emerald-300"
                    }`}
                  >
                    {status.type === "success" && <CheckCircle2 size={14} />}
                    {status.text}
                  </p>
                )}
              </div>
            </div>

            <p className="mt-4 border-t border-[var(--border-soft)] pt-4 text-center text-xs leading-5 text-[var(--text-muted)]">
              Can’t find it? Check your spam or promotions folder, or{" "}
              <Link
                to="/sign-up"
                className="text-[var(--text-secondary)] underline underline-offset-4 transition hover:text-[var(--text-primary)]"
              >
                use a different email
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CheckEmailPage;
