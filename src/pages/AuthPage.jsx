import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import MeridianMark from "../components/ui/MeridianMark";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const fieldClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]";

function AuthPage({ mode }) {
  const isSignUp = mode === "sign-up";
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const title = isSignUp ? "Build a better trading record." : "Welcome back.";
  const submitLabel = isSignUp ? "Create your account" : "Sign in";
  const alternatePath = isSignUp ? "/sign-in" : "/sign-up";
  const alternateCopy = isSignUp ? "Already have an account?" : "New to Meridian?";
  const alternateAction = isSignUp ? "Sign in" : "Create an account";

  async function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors = {};
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const name = String(data.get("name") || "").trim();

    if (!email) nextErrors.email = "Enter your email address.";
    if (!password) nextErrors.password = "Enter your password.";
    if (isSignUp && password && password.length < 8) nextErrors.password = "Use at least 8 characters.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setMessage("");
    setIsSubmitting(true);
    const { data: authData, error } = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (isSignUp && !authData.session) {
      setMessage("Check your email to confirm your account, then sign in to continue.");
      return;
    }

    const destination = isSignUp ? "/onboarding" : location.state?.from?.pathname || "/app";
    navigate(destination, { replace: true });
  }

  if (!isLoading && user) return <Navigate to="/app" replace />;

  return (
    <main className="grid min-h-screen bg-[var(--bg)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border-soft)] bg-[var(--surface)] p-10 lg:flex lg:flex-col">
        <Link to="/" className="relative z-10 flex items-center gap-2.5 self-start font-semibold tracking-[-0.03em]"><MeridianMark /> Meridian</Link>
        <div className="pointer-events-none absolute -bottom-48 -left-48 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.13),transparent_65%)]" />
        <div className="relative z-10 my-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">A more intentional practice</p>
          <h1 className="mt-5 text-5xl font-medium tracking-[-0.055em]">The record behind your progress.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[var(--text-secondary)]">From the plan before a trade to the lesson after it, Meridian gives your decisions a home.</p>
          <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[#0d0e12] p-5">
            <p className="text-sm font-medium">Your process, in one place</p>
            <div className="mt-5 space-y-3">{["Plan before you trade", "Record what actually happened", "Review your decisions honestly"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><span className="grid size-5 place-items-center rounded-full bg-[rgba(201,168,118,0.14)] text-[var(--accent)]"><Check size={12} /></span>{item}</div>)}</div>
          </div>
        </div>
        <p className="relative z-10 text-xs text-[var(--text-muted)]">Your trading. Your money. Your discipline.</p>
      </section>

      <section className="flex min-h-screen items-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-12 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:hidden"><ArrowLeft size={16} /> Back to Meridian</Link>
          <div className="lg:hidden"><MeridianMark /><p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Meridian</p></div>
          <h2 className="mt-5 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{isSignUp ? "Start with the records and routines that matter to you." : "Sign in to continue your trading practice."}</p>
          <form className="mt-8" noValidate onSubmit={handleSubmit}>
            {isSignUp && <label className="mb-5 block text-sm font-medium">Full name<input name="name" autoComplete="name" className={fieldClass} placeholder="Your name" /></label>}
            <label className="block text-sm font-medium">Email address<input name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className={fieldClass} placeholder="you@example.com" />{errors.email && <span id="email-error" className="mt-2 block text-xs text-[var(--danger)]">{errors.email}</span>}</label>
            <label className="mt-5 block text-sm font-medium">Password<div className="relative"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} className={`${fieldClass} pr-12`} placeholder={isSignUp ? "At least 8 characters" : "Your password"} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <span id="password-error" className="mt-2 block text-xs text-[var(--danger)]">{errors.password}</span>}</label>
            {isSignUp && <label className="mt-5 flex gap-3 text-xs leading-5 text-[var(--text-secondary)]"><input type="checkbox" required className="mt-0.5 size-4 accent-[var(--accent)]" />I agree to receive important account and product updates.</label>}
            {message && <p role="status" className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">{message}</p>}
            <button type="submit" disabled={isSubmitting} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? "Please wait…" : submitLabel}<ArrowRight size={16} /></button>
          </form>
          <p className="mt-7 text-center text-sm text-[var(--text-secondary)]">{alternateCopy} <Link to={alternatePath} className="font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]">{alternateAction}</Link></p>
          <p className="mt-10 text-center text-xs leading-5 text-[var(--text-muted)]">Your account is secured by Supabase authentication.</p>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;
