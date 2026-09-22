import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import MeridianMark from "../components/ui/MeridianMark";
import { supabase } from "../lib/supabase";

const fieldClass =
  "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]";

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkResetSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        setError(
          "This password reset link is invalid or has expired. Please request a new one."
        );
      }

      setCheckingSession(false);
    }

    checkResetSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!password) {
      setError("Enter your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    if (!confirmPassword) {
      setError("Confirm your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setIsSuccess(true);
      setMessage("Your password has been updated successfully.");

      await supabase.auth.signOut();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5">
        <div className="text-center">
          <MeridianMark />

          <p className="mt-5 text-sm text-[var(--text-secondary)]">
            Verifying your password reset link…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-[var(--bg)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border-soft)] bg-[var(--surface)] p-10 lg:flex lg:flex-col">
        <Link
          to="/"
          className="relative z-10 flex items-center gap-2.5 self-start font-semibold tracking-[-0.03em]"
        >
          <MeridianMark />
          Meridian
        </Link>

        <div className="pointer-events-none absolute -bottom-48 -left-48 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.13),transparent_65%)]" />

        <div className="relative z-10 my-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Secure access
          </p>

          <h1 className="mt-5 text-5xl font-medium tracking-[-0.055em]">
            Your account, back in your hands.
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[var(--text-secondary)]">
            Set a new password and get back to recording your trading
            decisions with Meridian.
          </p>

          <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[#0d0e12] p-5">
            <p className="text-sm font-medium">
              Keep your account secure
            </p>

            <div className="mt-5 space-y-3">
              {[
                "Use at least 8 characters",
                "Choose a password you have not used before",
                "Keep your password private",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"
                >
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

      <section className="flex min-h-screen items-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/sign-in"
            className="mb-12 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          <div className="mb-8">
            <MeridianMark />

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Meridian
            </p>
          </div>

          {isSuccess ? (
            <>
              <h2 className="text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
                Password updated.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Your password has been changed successfully. You can now
                sign in with your new password.
              </p>

              <button
                type="button"
                onClick={() => navigate("/sign-in")}
                className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)]"
              >
                Continue to sign in
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
                Create a new password.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Choose a new password for your Meridian account.
              </p>

              <form
                className="mt-8"
                noValidate
                onSubmit={handleSubmit}
              >
                <label className="block text-sm font-medium">
                  New password

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      className={`${fieldClass} pr-12`}
                      placeholder="At least 8 characters"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((visible) => !visible)
                      }
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <label className="mt-5 block text-sm font-medium">
                  Confirm new password

                  <div className="relative">
                    <input
                      type={
                        showConfirmPassword ? "text" : "password"
                      }
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      className={`${fieldClass} pr-12`}
                      placeholder="Enter your password again"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (visible) => !visible
                        )
                      }
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                {error && (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--danger)]"
                  >
                    {error}
                  </p>
                )}

                {message && (
                  <p
                    role="status"
                    className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || Boolean(error)}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting
                    ? "Updating password…"
                    : "Update password"}

                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}

          <p className="mt-10 text-center text-xs leading-5 text-[var(--text-muted)]">
            Your account is secured by Meridian.
          </p>
        </div>
      </section>
    </main>
  );
}

export default ResetPasswordPage
