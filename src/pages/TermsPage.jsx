import {
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import MeridianMark from "../components/ui/MeridianMark";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const CURRENT_TERMS_VERSION = "1.0";

function TermsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    if (!accepted || !user) return;

    setError("");
    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          terms_accepted: true,
          terms_version: CURRENT_TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      const destination = location.state?.from?.pathname || "/app";

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Terms acceptance error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your acceptance. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDecline() {
    supabase.auth.signOut();
    navigate("/sign-in", {
      replace: true,
      state: {
        message:
          "You must accept Meridian's Terms & Conditions to access the application.",
      },
    });
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/sign-in")}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]">
            <MeridianMark />
            Meridian
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-2xl pb-10 pt-16 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]">
            <FileText size={21} />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Before you continue
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">
            Terms & Conditions
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
            Please review the terms that govern your use of Meridian. You
            must accept them before accessing your trading workspace.
          </p>

          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Version {CURRENT_TERMS_VERSION}
          </p>
        </section>

        {/* Terms document */}
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-[rgba(201,168,118,0.10)] text-[var(--accent)]">
                <ShieldCheck size={17} />
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Meridian Terms of Use
                </p>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Please read carefully before accepting.
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto px-6 py-8 sm:px-8">
            <div className="space-y-8 text-sm leading-7 text-[var(--text-secondary)]">
              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  1. Acceptance of Terms
                </h2>

                <p className="mt-3">
                  By creating an account or accessing Meridian, you agree to
                  these Terms & Conditions. If you do not agree to these terms,
                  you may not use the Meridian application.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  2. About Meridian
                </h2>

                <p className="mt-3">
                  Meridian is a trading record-keeping and journaling
                  application designed to help users document trades, track
                  financial activity, manage trading rules, set goals, and
                  review their trading process.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  3. Trading & Financial Disclaimer
                </h2>

                <p className="mt-3">
                  Meridian is not a financial adviser, broker, investment
                  manager, or trading signal service. Information entered,
                  displayed, or calculated within Meridian is provided for
                  record-keeping and informational purposes only.
                </p>

                <p className="mt-3">
                  You are solely responsible for your trading decisions,
                  financial decisions, risk management, and the consequences
                  of those decisions.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  4. User Responsibilities
                </h2>

                <p className="mt-3">
                  You are responsible for maintaining accurate information
                  within your Meridian account and for keeping your login
                  credentials secure. You must not use Meridian for unlawful,
                  fraudulent, abusive, or unauthorized activities.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  5. Account & Data
                </h2>

                <p className="mt-3">
                  Your Meridian account is intended for your personal use.
                  You are responsible for the activity carried out through
                  your account. Meridian may store information necessary to
                  provide and improve the application's functionality.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  6. Availability
                </h2>

                <p className="mt-3">
                  Meridian may occasionally experience interruptions,
                  maintenance periods, technical issues, or changes to
                  functionality. We do not guarantee uninterrupted or
                  error-free availability of the service.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  7. Prohibited Use
                </h2>

                <p className="mt-3">
                  You may not attempt to compromise the security of Meridian,
                  access another user's account, interfere with the service,
                  reverse engineer protected functionality, or use the
                  application for malicious purposes.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  8. Changes to These Terms
                </h2>

                <p className="mt-3">
                  These Terms may be updated as Meridian evolves. When a new
                  version requires renewed acceptance, you may be asked to
                  review and accept the updated Terms before continuing to use
                  the application.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  9. Contact
                </h2>

                <p className="mt-3">
                  If you have questions about these Terms or Meridian,
                  contact the Meridian team through the official support
                  channel associated with the application.
                </p>
              </section>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <p className="text-xs leading-6 text-[var(--text-muted)]">
                  By continuing, you acknowledge that you have read,
                  understood, and agreed to these Terms & Conditions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Acceptance */}
        <section className="mx-auto max-w-2xl py-8">
          <label className="flex cursor-pointer gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
            />

            <span className="text-sm leading-6 text-[var(--text-secondary)]">
              I have read and agree to Meridian's Terms & Conditions.
            </span>
          </label>

          {error && (
            <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs leading-5 text-[var(--danger)]">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!accepted || isSubmitting}
            onClick={handleAccept}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Saving…" : "Accept & Continue"}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>

          <button
            type="button"
            onClick={handleDecline}
            className="mt-4 w-full text-center text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            I Don't Agree
          </button>

          <p className="mt-6 text-center text-[11px] leading-5 text-[var(--text-muted)]">
            You must accept these terms to access your Meridian workspace.
          </p>
        </section>
      </div>
    </main>
  );
}

export default TermsPage;