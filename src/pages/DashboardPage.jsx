import { ArrowRight, BookOpenCheck, CirclePlus, ClipboardCheck, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/app/AppShell";
import { RevealItem, ScrollReveal, StaggerGroup } from "../components/motion/ScrollReveal";
import { ALL_ACCOUNTS } from "../context/AccountProvider";
import { useAccounts } from "../hooks/useAccounts";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

function DashboardPage() {
  const { user } = useAuth();
  const { activeAccountId } = useAccounts();
  const [currency, setCurrency] = useState(null);
  const [data, setData] = useState({ trades: [], money: [], rules: [], goals: [], error: false });
  useEffect(() => { let mounted = true; async function loadDashboard() { const scope = activeAccountId === ALL_ACCOUNTS ? {} : { account_id: activeAccountId }; const [trades, money, rules, goals] = await Promise.all([supabase.from("trades").select("status, pnl, instrument, created_at").eq("user_id", user.id).match(scope).order("created_at", { ascending: false }).limit(5), supabase.from("money_transactions").select("type, amount").eq("user_id", user.id).match(scope), supabase.from("trading_rules").select("id").eq("user_id", user.id), supabase.from("goals").select("id, title, status").eq("user_id", user.id).eq("status", "active").limit(3)]); if (!mounted) return; setData({ trades: trades.data ?? [], money: money.data ?? [], rules: rules.data ?? [], goals: goals.data ?? [], error: Boolean(trades.error || money.error || rules.error || goals.error) }); } if (user?.id) { loadDashboard(); supabase.from("profiles").select("default_currency").eq("id", user.id).single().then(({ data: profile }) => { if (mounted && profile?.default_currency) setCurrency(profile.default_currency); }); } return () => { mounted = false; }; }, [user?.id, activeAccountId]);
  const summary = useMemo(() => { const income = data.money.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0); const expense = data.money.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0); const completed = data.trades.filter((item) => item.status === "completed"); return { income, expense, pnl: completed.reduce((total, item) => total + Number(item.pnl || 0), 0), active: data.trades.filter((item) => item.status === "active").length }; }, [data]);
  function number(value, signed = true) { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, signDisplay: signed ? "always" : "never", ...(currency ? { style: "currency", currency } : {}) }).format(value); }
  function amountOrEmpty(value, hasRecords, signed = true) { return hasRecords ? number(value, signed) : "No records yet"; }
  const summaries = [["Money in", amountOrEmpty(summary.income, data.money.length > 0, false)], ["Money out", amountOrEmpty(summary.expense, data.money.length > 0, false)], ["Trading P/L", amountOrEmpty(summary.pnl, data.trades.some((trade) => trade.status === "completed"))], ["Active trades", data.trades.length ? String(summary.active) : "No records yet"]];
  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <ScrollReveal
          as="div"
          className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Daily command center
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
              Your practice, in view.
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              A calm view of your records, goals, and process.
            </p>
          </div>
          <Link
            to="/app/trades"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"
          >
            <CirclePlus size={17} /> Record a trade
          </Link>
        </ScrollReveal>

        {data.error && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]"
          >
            Some summary records are unavailable until the database schema is
            applied.
          </p>
        )}

        <StaggerGroup
          as="section"
          className="mt-9 grid grid-cols-2 gap-3 xl:grid-cols-4"
          aria-label="Financial summary"
        >
          {summaries.map(([label, value]) => (
            <RevealItem
              as="article"
              key={label}
              className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
            >
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <p className="mt-4 [overflow-wrap:anywhere] font-mono text-sm text-[var(--text-secondary)] sm:mt-6">
                {value}
              </p>
            </RevealItem>
          ))}
        </StaggerGroup>

        <StaggerGroup
          as="section"
          className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"
        >
          <RevealItem
            as="article"
            className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium">Active goals</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Give the day a clear intention before you trade.
                </p>
              </div>
              <Target className="text-[var(--accent)]" size={21} />
            </div>
            {data.goals.length ? (
              <StaggerGroup className="mt-7 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                {data.goals.map((goal) => (
                  <RevealItem
                    as="p"
                    key={goal.id}
                    className="min-w-0 py-4 text-sm text-[var(--text-secondary)] [overflow-wrap:anywhere]"
                  >
                    {goal.title}
                  </RevealItem>
                ))}
              </StaggerGroup>
            ) : (
              <div className="mt-7 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] px-5 py-10 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  No active goals.
                </p>
                <Link
                  to="/app/goals"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]"
                >
                  Create a goal <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </RevealItem>
          <RevealItem
            as="article"
            className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            <ClipboardCheck className="text-[var(--accent)]" size={21} />
            <h2 className="mt-7 text-base font-medium">Your rule check</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {data.rules.length
                ? `${data.rules.length} rule${data.rules.length === 1 ? "" : "s"} ready for your next review.`
                : "Add personal rules to make your process reviewable, before and after each trade."}
            </p>
            <Link
              to="/app/rules"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]"
            >
              {data.rules.length ? "Review rules" : "Add a rule"}{" "}
              <ArrowRight size={15} />
            </Link>
          </RevealItem>
        </StaggerGroup>

        <ScrollReveal
          as="section"
          className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-medium">Recent trades</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                The latest entries from your trading journal.
              </p>
            </div>
            <BookOpenCheck
              className="shrink-0 text-[var(--accent)]"
              size={21}
            />
          </div>
          {data.trades.length ? (
            <StaggerGroup className="mt-6 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              {data.trades.map((trade) => (
                <RevealItem
                  as="div"
                  key={`${trade.instrument}-${trade.created_at}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-4"
                >
                  <span className="min-w-[6rem] flex-1 text-sm font-medium [overflow-wrap:anywhere]">
                    {trade.instrument}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[var(--text-secondary)]">
                    {trade.pnl === null
                      ? "Active"
                      : number(Number(trade.pnl))}
                  </span>
                </RevealItem>
              ))}
            </StaggerGroup>
          ) : (
            <div className="mt-7 border-t border-[var(--border-soft)] pt-7 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Your record starts with the first intentional entry.
              </p>
            </div>
          )}
        </ScrollReveal>
      </main>
    </AppShell>
  );
}

export default DashboardPage;
