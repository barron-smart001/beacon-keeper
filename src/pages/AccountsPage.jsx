import { ArrowRight, Check, CheckCircle2, Layers, Loader2, Plus, Trash2, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import AppShell from "../components/app/AppShell";
import { ScrollReveal } from "../components/motion/ScrollReveal";
import UpgradeModal from "../components/subscription/UpgradeModal";
import { ALL_ACCOUNTS } from "../context/AccountProvider";
import { useAccounts } from "../hooks/useAccounts";
import { useAuth } from "../hooks/useAuth";
import useSubscription from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";

const CURRENCIES = ["USD", "NGN"];

const emptyStats = () => ({ trades: 0, open: 0, closed: 0, wins: 0, pnl: 0 });

function formatPnl(value, currency) {
  const options = { maximumFractionDigits: 2, signDisplay: "always" };
  try {
    return new Intl.NumberFormat(undefined, currency ? { ...options, style: "currency", currency } : options).format(value);
  } catch {
    return new Intl.NumberFormat(undefined, options).format(value);
  }
}

function Stat({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p
        title={value}
        className={`mt-1 truncate font-mono text-sm font-semibold ${
          tone === "good" ? "text-[var(--success)]" : tone === "bad" ? "text-[var(--danger)]" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AccountsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { accounts, activeAccountId, setActiveAccountId, refresh, isLoading: accountsLoading } = useAccounts();
  const { isSubscribed, isLoading: subscriptionLoading } = useSubscription();

  const [stats, setStats] = useState({ byAccount: new Map(), unassigned: emptyStats() });
  const [statsLoading, setStatsLoading] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState(null); // { type, text }
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Per-account numbers come from the trades themselves.
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    async function load() {
      setStatsLoading(true);
      const [tradesResult, profileResult] = await Promise.all([
        supabase.from("trades").select("account_id, status, pnl").eq("user_id", user.id),
        supabase.from("profiles").select("default_currency").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const byAccount = new Map();
      const unassigned = emptyStats();
      for (const trade of tradesResult.data ?? []) {
        const target = trade.account_id
          ? byAccount.get(trade.account_id) ?? byAccount.set(trade.account_id, emptyStats()).get(trade.account_id)
          : unassigned;
        target.trades += 1;
        if (trade.status === "completed" && trade.pnl !== null && trade.pnl !== undefined) {
          const pnl = Number(trade.pnl);
          target.closed += 1;
          target.pnl += pnl;
          if (pnl > 0) target.wins += 1;
        } else if (trade.status === "active") {
          target.open += 1;
        }
      }

      setStats({ byAccount, unassigned });
      if (profileResult.data?.default_currency && CURRENCIES.includes(profileResult.data.default_currency)) {
        setDefaultCurrency(profileResult.data.default_currency);
        setCurrency(profileResult.data.default_currency);
      }
      setStatsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, accounts.length]);

  // Totals for the combined "All accounts" card.
  const totals = useMemo(() => {
    const all = emptyStats();
    const add = (s) => {
      all.trades += s.trades;
      all.open += s.open;
      all.closed += s.closed;
      all.wins += s.wins;
      all.pnl += s.pnl;
    };
    stats.byAccount.forEach(add);
    add(stats.unassigned);
    const currencies = new Set(accounts.map((account) => account.currency));
    return { ...all, currency: currencies.size === 1 ? [...currencies][0] : null, mixed: currencies.size > 1 };
  }, [stats, accounts]);

  function switchTo(id, { thenOpenTrades = false } = {}) {
    setActiveAccountId(id);
    if (thenOpenTrades) navigate("/app/trades");
  }

  async function addAccount(event) {
    event.preventDefault();
    if (subscriptionLoading || isAdding) return;

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setNotice({ type: "error", text: "Give the account a name first." });
      return;
    }

    setIsAdding(true);
    setNotice(null);

    const { error } = await supabase.from("accounts").insert({ user_id: user.id, name: trimmed, currency });

    setIsAdding(false);

    if (error) {
      console.error("Account creation failed:", error);
      setNotice({ type: "error", text: "We couldn't add that account. Please try again." });
      return;
    }

    setName("");
    setNotice({ type: "success", text: `“${trimmed}” was added.` });
    await refresh();
  }

  function requestDelete(account) {
    if (subscriptionLoading) return;
    if (!isSubscribed) {
      setShowUpgradeModal(true);
      return;
    }
    setAccountToDelete(account);
  }

  async function confirmDelete() {
    if (!accountToDelete || isDeleting) return;

    setIsDeleting(true);
    setNotice(null);

    const { error } = await supabase.from("accounts").delete().eq("id", accountToDelete.id).eq("user_id", user.id);

    setIsDeleting(false);

    if (error) {
      console.error("Account deletion failed:", error);
      setNotice({ type: "error", text: "We couldn't delete that account. Please try again." });
      return;
    }

    const removed = accountToDelete.name;
    setAccountToDelete(null);
    setNotice({ type: "success", text: `“${removed}” was deleted. Its records are kept as Unassigned.` });
    await refresh();
  }

  const hasAccounts = accounts.length > 0;
  const allActive = activeAccountId === ALL_ACCOUNTS;
  const winRate = (s) => (s.closed ? `${Math.round((s.wins / s.closed) * 100)}%` : "—");
  const pnlTone = (v, closed) => (!closed ? undefined : v > 0 ? "good" : v < 0 ? "bad" : undefined);

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <ScrollReveal as="div" className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Your trading accounts</p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Accounts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Keep live, demo and other accounts separate. Switch to one and Trades, Money, the Dashboard and the Calendar
              show only that account.
            </p>
          </div>
        </ScrollReveal>

        {notice && (
          <div
            role="status"
            className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              notice.type === "error"
                ? "border-[var(--danger)]/30 bg-[var(--danger)]/5 text-[var(--text-secondary)]"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {notice.type === "success" && <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
            <p className="flex-1">{notice.text}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )}

        {/* The accounts */}
        <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3" aria-label="Your accounts">
          {hasAccounts && (
            <article
              className={`flex min-w-0 flex-col rounded-2xl border p-5 ${
                allActive ? "border-[var(--accent)] bg-[rgba(201,168,118,0.06)]" : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                  <Layers size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-medium">All accounts</h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">Everything together</p>
                </div>
                {allActive && (
                  <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#17130d]">
                    Active
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--border-soft)] pt-4">
                <Stat label="Trades" value={statsLoading ? "…" : String(totals.trades)} />
                <Stat
                  label="Net P/L"
                  value={statsLoading ? "…" : totals.mixed ? "Mixed" : totals.closed ? formatPnl(totals.pnl, totals.currency) : "—"}
                  tone={totals.mixed ? undefined : pnlTone(totals.pnl, totals.closed)}
                />
                <Stat label="Win rate" value={statsLoading ? "…" : winRate(totals)} />
              </div>

              <button
                type="button"
                onClick={() => switchTo(ALL_ACCOUNTS)}
                disabled={allActive}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)] disabled:cursor-default disabled:bg-[var(--surface-elevated)] disabled:text-[var(--text-secondary)]"
              >
                {allActive ? (
                  <>
                    <Check size={16} /> Viewing all accounts
                  </>
                ) : (
                  "Switch to all accounts"
                )}
              </button>
            </article>
          )}

          {accounts.map((account) => {
            const s = stats.byAccount.get(account.id) ?? emptyStats();
            const active = activeAccountId === account.id;

            return (
              <article
                key={account.id}
                className={`flex min-w-0 flex-col rounded-2xl border p-5 ${
                  active ? "border-[var(--accent)] bg-[rgba(201,168,118,0.06)]" : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                    <WalletCards size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-medium [overflow-wrap:anywhere]">{account.name}</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">Trading account · {account.currency}</p>
                  </div>
                  {active && (
                    <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#17130d]">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--border-soft)] pt-4">
                  <Stat label="Trades" value={statsLoading ? "…" : String(s.trades)} />
                  <Stat
                    label="Net P/L"
                    value={statsLoading ? "…" : s.closed ? formatPnl(s.pnl, account.currency) : "—"}
                    tone={pnlTone(s.pnl, s.closed)}
                  />
                  <Stat label="Win rate" value={statsLoading ? "…" : winRate(s)} />
                </div>

                <button
                  type="button"
                  onClick={() => switchTo(account.id)}
                  disabled={active}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)] disabled:cursor-default disabled:bg-[var(--surface-elevated)] disabled:text-[var(--text-secondary)]"
                >
                  {active ? (
                    <>
                      <Check size={16} /> Viewing this account
                    </>
                  ) : (
                    "Switch to this account"
                  )}
                </button>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => switchTo(account.id, { thenOpenTrades: true })}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-light)]"
                  >
                    Open its trades <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(account)}
                    aria-label={`Delete ${account.name}`}
                    className="grid size-10 place-items-center rounded-full text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}

          {!hasAccounts && !accountsLoading && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center sm:col-span-2 xl:col-span-3">
              <WalletCards className="mx-auto text-[var(--accent)]" size={26} />
              <h2 className="mt-4 text-base font-medium">Add your first account</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                An account is a place to keep related trades, like your live account or a demo. Add one below, then switch between
                them any time from here or the top bar.
              </p>
            </div>
          )}
        </section>

        {stats.unassigned.trades > 0 && hasAccounts && (
          <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
            {stats.unassigned.trades} trade{stats.unassigned.trades === 1 ? " isn’t" : "s aren’t"} assigned to an account, so
            {stats.unassigned.trades === 1 ? " it appears" : " they appear"} only under All accounts.
          </p>
        )}

        {/* Add an account */}
        <ScrollReveal
          as="section"
          className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          aria-label="Add an account"
        >
          <h2 className="text-base font-medium">Add an account</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">For example “Exness Standard” or “Demo”.</p>

          <form onSubmit={addAccount} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="account-name">
              Account name
            </label>
            <input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder="Account name"
              className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />

            <label className="sr-only" htmlFor="account-currency">
              Currency
            </label>
            <select
              id="account-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:w-28"
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isAdding}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] disabled:opacity-60"
            >
              {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add account
            </button>
          </form>
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">Default currency for new accounts: {defaultCurrency}.</p>
        </ScrollReveal>
      </main>

      {accountToDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[#111318] p-5 shadow-2xl sm:rounded-2xl sm:p-6">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--danger)]">
                    <Trash2 size={19} />
                  </div>
                  <h2 id="delete-account-title" className="mt-5 text-xl font-medium [overflow-wrap:anywhere]">
                    Delete “{accountToDelete.name}”?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    The account will be removed. Its trades and money records are not deleted; they stay in your journal as Unassigned
                    and appear under All accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  disabled={isDeleting}
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  disabled={isDeleting}
                  className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--danger)] px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {isDeleting ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </AppShell>
  );
}

export default AccountsPage;
