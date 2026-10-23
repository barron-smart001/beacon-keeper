import {
  Bell,
  Check,
  ChevronRight,
  LogOut,
  Moon,
  PlugZap,
  ShieldCheck,
  Settings2,
  Sun,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Link, useNavigate } from "react-router-dom";

import GoalHistory from "../components/goal/GoalHistory";
import AppShell from "../components/app/AppShell";
import { ScrollReveal } from "../components/motion/ScrollReveal";

import { useAuth } from "../hooks/useAuth";

import { supabase } from "../lib/supabase";
import { getThemePreference, setThemePreference } from "../lib/theme";

const inputClass =
  "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

function SettingsPage() {
  const { user, signOut: signOutFromAuth } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    default_currency: "USD",
    trading_style: "",
  });

  const [notice, setNotice] = useState("");

  const [modal, setModal] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [theme, setTheme] = useState(getThemePreference);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const profileResult = await supabase
        .from("profiles")
        .select("default_currency, trading_style")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileResult.error) {
        setNotice(
          "We couldn't load all of your settings. Please refresh and try again."
        );
      }

      if (profileResult.data) {
        setProfile({
          default_currency:
            profileResult.data.default_currency || "USD",
          trading_style:
            profileResult.data.trading_style || "",
        });
      }

    }

    if (user?.id) {
      loadSettings();
    }

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function saveProfile(event) {
    event.preventDefault();

    setNotice("");

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        default_currency: profile.default_currency,
        trading_style: profile.trading_style || null,
      });

    if (error) {
      setNotice(
        "We couldn't save your preferences. Please try again."
      );
      return;
    }

    setNotice("Preferences saved.");
  }

  async function sendPasswordReset() {
    if (!user?.email || isWorking) return;

    setIsWorking(true);
    setNotice("");

    const redirectTo = `${window.location.origin}/sign-in`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      user.email,
      {
        redirectTo,
      }
    );

    setIsWorking(false);
    setModal(null);

    if (error) {
      setNotice(
        "We couldn't send the password reset email. Please try again."
      );
      return;
    }

    setNotice(
      "Password reset instructions have been sent to your email."
    );
  }

  async function signOut() {
    if (isWorking) return;

    setIsWorking(true);
    setNotice("");

    try {
      const { error } = await signOutFromAuth();

      if (error) {
        setNotice(
          "We couldn't sign you out. Please try again."
        );
        return;
      }

      navigate("/sign-in", { replace: true });
    } finally {
      setIsWorking(false);
      setModal(null);
    }
  }

  async function deleteAccount() {
    if (!user?.id || isWorking) return;

    setIsWorking(true);
    setNotice("");

    try {
      const { error: deleteError } = await supabase.rpc(
        "delete_recordium_user_data"
      );
      if (deleteError) throw deleteError;

      const { error: signOutError } = await signOutFromAuth();

      if (signOutError) {
        throw signOutError;
      }

      navigate("/sign-in", { replace: true });
    } catch (error) {
      console.error("Account deletion failed:", error);

      setIsWorking(false);
      setModal(null);

      setNotice(
        "We couldn't delete your account data. Please try again."
      );
    }
  }

  function closeModal() {
    if (isWorking) return;
    setModal(null);
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setThemePreference(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
        {/* Header */}
        <ScrollReveal as="div">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Workspace control
          </p>

          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
            Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Manage your TradeFrame profile, trading preferences,
            and application experience.
          </p>
        </ScrollReveal>

        {/* Notice */}
        {notice && (
          <div
            role="status"
            className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {notice}
            </p>

            <button
              type="button"
              onClick={() => setNotice("")}
              className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ACCOUNT */}
        <ScrollReveal as="section" className="mt-9">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Account
            </p>
          </div>

          <Link
            to="/app/profile"
            className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:bg-[var(--surface-elevated)] sm:p-6"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
              <UserRound size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-medium">Profile</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Update your personal details and profile photo.
              </p>
            </div>

            <ChevronRight size={18} className="shrink-0 text-[var(--text-muted)]" />
          </Link>
        </ScrollReveal>

        {/* TRADING */}
        <ScrollReveal as="section" className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Trading
            </p>
          </div>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                <Settings2 size={20} />
              </div>

              <div>
                <h2 className="text-base font-medium">
                  Trading preferences
                </h2>

                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  Set the defaults TradeFrame should use when
                  organizing your trading records.
                </p>
              </div>
            </div>

            <form
              className="mt-7 grid gap-5 sm:grid-cols-2"
              onSubmit={saveProfile}
            >
              <label className="text-sm font-medium">
                Default currency

                <select
                  value={profile.default_currency}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      default_currency: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="USD">USD</option>
                  <option value="NGN">NGN</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Trading style

                <select
                  value={profile.trading_style || ""}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      trading_style: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Not specified</option>
                  <option value="Forex">Forex</option>
                  <option value="Day trading">
                    Day trading
                  </option>
                  <option value="Scalping">Scalping</option>
                  <option value="Swing trading">
                    Swing trading
                  </option>
                  <option value="Position trading">
                    Position trading
                  </option>
                </select>
              </label>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"
                >
                  <Check size={16} />
                  Save preferences
                </button>
              </div>
            </form>
          </article>
        </ScrollReveal>

        <GoalHistory />

        {/* TRADING ACCOUNTS */}
        <ScrollReveal as="section" className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Trading accounts
            </p>
          </div>

          <Link
            to="/app/accounts"
            className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:bg-[var(--surface-elevated)] sm:p-6"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
              <WalletCards size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-medium">Manage your accounts</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Add, switch and delete trading accounts on the Accounts page.
              </p>
            </div>

            <ChevronRight size={18} className="shrink-0 text-[var(--text-muted)]" />
          </Link>
        </ScrollReveal>

        {/* BROKER CONNECTIONS */}
        <ScrollReveal as="section" className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Broker connections
            </p>
          </div>

          <Link
            to="/app/brokers"
            className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:bg-[var(--surface-elevated)] sm:p-6"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
              <PlugZap size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-medium">Manage broker connections</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Connect a broker and import trades on the Brokers page.
              </p>
            </div>

            <ChevronRight size={18} className="shrink-0 text-[var(--text-muted)]" />
          </Link>
        </ScrollReveal>

        {/* APPLICATION */}
        <ScrollReveal as="section" className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Application
            </p>
          </div>

          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {/* Appearance */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                  {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                </div>

                <div>
                  <h2 className="text-sm font-medium">
                    Appearance
                  </h2>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Choose a light or dark appearance for TradeFrame.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                aria-pressed={theme === "light"}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-soft)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                  <Bell size={18} />
                </div>

                <div>
                  <h2 className="text-sm font-medium">
                    Notifications
                  </h2>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Trading reminders and account updates.
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--text-muted)]">
                Coming soon
              </span>
            </div>

          </article>
        </ScrollReveal>

        {/* SECURITY */}
        <ScrollReveal as="section" className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Security
            </p>
          </div>

          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <button
              type="button"
              onClick={() => setModal("security")}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[var(--surface-elevated)] sm:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h2 className="text-sm font-medium">
                    Password & security
                  </h2>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Manage your password and authentication.
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-[var(--text-muted)]"
              />
            </button>
          </article>
        </ScrollReveal>

        {/* ACCOUNT ACTIONS */}
        <ScrollReveal as="section" className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Account actions
            </p>
          </div>

          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {/* Sign out */}
            <button
              type="button"
              onClick={() => setModal("signout")}
              className="flex w-full items-center justify-between gap-4 border-b border-[var(--border-soft)] p-5 text-left transition hover:bg-[var(--surface-elevated)] sm:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                  <LogOut size={18} />
                </div>

                <div>
                  <h2 className="text-sm font-medium">
                    Sign out
                  </h2>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Sign out of TradeFrame on this device.
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-[var(--text-muted)]"
              />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => setModal("delete")}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[var(--surface-elevated)] sm:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--danger)]">
                  <Trash2 size={18} />
                </div>

                <div>
                  <h2 className="text-sm font-medium text-[var(--danger)]">
                    Delete account
                  </h2>

                  <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
                    Permanently remove your TradeFrame data from
                    this application.
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-[var(--text-muted)]"
              />
            </button>
          </article>
        </ScrollReveal>
      </main>

      {/* CONFIRMATION MODAL */}
      {modal && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-2xl sm:p-7">
            {/* Sign out modal */}
            {modal === "signout" && (
              <>
                <div className="flex items-start justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isWorking}
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="mt-2">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                    Sign out?
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    You will be signed out of this device. Your trading
                    records will remain safely stored in your TradeFrame account.
                  </p>
                </div>

                <div className="mt-7 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isWorking}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface)] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={signOut}
                    disabled={isWorking}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#111318] transition hover:bg-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isWorking ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </>
            )}

            {/* Security modal */}
            {modal === "security" && (
              <>
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                      <ShieldCheck size={19} />
                    </div>

                    <h2 className="mt-5 text-xl font-medium">
                      Reset your password?
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      TradeFrame will send password reset
                      instructions to:
                    </p>

                    <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-primary)] [overflow-wrap:anywhere]">
                      {user?.email || "No email available"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isWorking}
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="mt-7 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isWorking}
                    className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={sendPasswordReset}
                    disabled={isWorking}
                    className="min-h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isWorking
                      ? "Sending..."
                      : "Send reset email"}
                  </button>
                </div>
              </>
            )}

            {/* Delete modal */}
            {modal === "delete" && (
              <>
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--danger)]">
                      <Trash2 size={19} />
                    </div>

                    <h2 className="mt-5 text-xl font-medium">
                      Delete your account?
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      This will permanently remove your TradeFrame
                      trading records, accounts, rules, goals, and
                      other application data.
                    </p>

                    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
                      This action cannot be undone.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isWorking}
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="mt-7 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isWorking}
                    className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={isWorking}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--danger)] px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />

                    {isWorking
                      ? "Deleting..."
                      : "Delete account"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

    </AppShell>
  );
}

export default SettingsPage;