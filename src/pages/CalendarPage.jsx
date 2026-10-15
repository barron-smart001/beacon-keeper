import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AppShell from "../components/app/AppShell";
import { ScrollReveal } from "../components/motion/ScrollReveal";
import { ALL_ACCOUNTS } from "../context/AccountProvider";
import { useAccounts } from "../hooks/useAccounts";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (year, monthIndex, day) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
// A timestamp belongs to the day it fell on for the user, not in UTC.
const localKey = (iso) => {
  const d = new Date(iso);
  return keyOf(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Weeks of the month, Monday first. Days outside the month are null. */
function monthWeeks(month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const total = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= total ? day : null;
  });
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

function emptyDay() {
  return { trades: [], money: [], pnl: 0, wins: 0, completed: 0, income: 0, expense: 0 };
}

function CalendarPage() {
  const { user } = useAuth();
  const { accounts, activeAccountId } = useAccounts();
  const showingAll = activeAccountId === ALL_ACCOUNTS;

  const today = new Date();
  const todayKey = keyOf(today.getFullYear(), today.getMonth(), today.getDate());

  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [trades, setTrades] = useState([]);
  const [money, setMoney] = useState([]);
  const [currency, setCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  // Load this month's records for the chosen account.
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);

      // A day either side, so time zones never drop a record at the edge.
      const from = new Date(year, monthIndex, 0);
      const to = new Date(year, monthIndex + 1, 2);
      const fromDate = keyOf(year, monthIndex, 1);
      const toDate = keyOf(year, monthIndex, new Date(year, monthIndex + 1, 0).getDate());

      let tradeQuery = supabase
        .from("trades")
        .select("id, instrument, direction, status, pnl, account_id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", from.toISOString())
        .lt("created_at", to.toISOString());

      let moneyQuery = supabase
        .from("money_transactions")
        .select("id, type, amount, category, description, transaction_date, account_id")
        .eq("user_id", user.id)
        .gte("transaction_date", fromDate)
        .lte("transaction_date", toDate);

      if (!showingAll) {
        tradeQuery = tradeQuery.eq("account_id", activeAccountId);
        moneyQuery = moneyQuery.eq("account_id", activeAccountId);
      }

      const [tradeResult, moneyResult, profileResult] = await Promise.all([
        tradeQuery,
        moneyQuery,
        supabase.from("profiles").select("default_currency").eq("id", user.id).maybeSingle(),
      ]);

      if (cancelled) return;

      if (tradeResult.error || moneyResult.error) {
        console.error("Calendar load failed:", tradeResult.error || moneyResult.error);
        setLoadError(true);
      } else {
        setTrades(tradeResult.data ?? []);
        setMoney(moneyResult.data ?? []);
      }
      if (profileResult.data?.default_currency) setCurrency(profileResult.data.default_currency);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, year, monthIndex, activeAccountId, showingAll]);

  // Group everything by day.
  const byDay = useMemo(() => {
    const map = new Map();
    const get = (key) => {
      if (!map.has(key)) map.set(key, emptyDay());
      return map.get(key);
    };

    for (const trade of trades) {
      const day = get(localKey(trade.created_at));
      day.trades.push(trade);
      if (trade.status === "completed" && trade.pnl !== null && trade.pnl !== undefined) {
        const pnl = Number(trade.pnl);
        day.pnl += pnl;
        day.completed += 1;
        if (pnl > 0) day.wins += 1;
      }
    }

    for (const item of money) {
      const day = get(String(item.transaction_date).slice(0, 10));
      day.money.push(item);
      const amount = Number(item.amount) || 0;
      if (item.type === "income") day.income += amount;
      else day.expense += amount;
    }

    return map;
  }, [trades, money]);

  const weeks = useMemo(() => monthWeeks(month), [month]);

  // Month summary and the scale the heatmap is drawn against.
  const summary = useMemo(() => {
    let net = 0;
    let wins = 0;
    let completed = 0;
    let tradingDays = 0;
    let income = 0;
    let expense = 0;
    let maxAbs = 0;
    let best = null;
    let worst = null;

    for (const week of weeks) {
      for (const day of week) {
        if (!day) continue;
        const key = keyOf(year, monthIndex, day);
        const data = byDay.get(key);
        if (!data) continue;
        net += data.pnl;
        wins += data.wins;
        completed += data.completed;
        income += data.income;
        expense += data.expense;
        if (data.trades.length) tradingDays += 1;
        maxAbs = Math.max(maxAbs, Math.abs(data.pnl));
        if (data.completed) {
          if (!best || data.pnl > best.pnl) best = { key, day, pnl: data.pnl };
          if (!worst || data.pnl < worst.pnl) worst = { key, day, pnl: data.pnl };
        }
      }
    }

    return {
      net,
      completed,
      tradingDays,
      income,
      expense,
      maxAbs,
      winRate: completed ? Math.round((wins / completed) * 100) : null,
      best: best && best.pnl > 0 ? best : null,
      worst: worst && worst.pnl < 0 ? worst : null,
    };
  }, [weeks, byDay, year, monthIndex]);

  const accountName = (id) => accounts.find((a) => a.id === id)?.name ?? "Unassigned";

  const formatSigned = (value) =>
    new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
      signDisplay: "always",
      ...(currency ? { style: "currency", currency } : {}),
    }).format(value);

  const formatPlain = (value) =>
    new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
      ...(currency ? { style: "currency", currency } : {}),
    }).format(value);

  const formatCompact = (value) =>
    new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
      signDisplay: "always",
    }).format(value);

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month);
  const isCurrentMonth = year === today.getFullYear() && monthIndex === today.getMonth();

  function goToMonth(next) {
    setMonth(next);
    setSelectedKey(null);
  }

  // On small screens the day's details sit below the grid, so bring them into view.
  function selectDay(key) {
    setSelectedKey(key);
    if (window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document
          .getElementById("calendar-day-detail")
          ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
      });
    }
  }

  function goToday() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(todayKey);
  }

  const selectedDay = selectedKey ? byDay.get(selectedKey) ?? emptyDay() : null;
  const selectedDate = selectedKey ? new Date(`${selectedKey}T12:00:00`) : null;
  const selectedInMonth =
    selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === monthIndex;

  const stats = [
    {
      label: "Net P/L",
      value: summary.completed ? formatSigned(summary.net) : "—",
      tone: summary.net > 0 ? "good" : summary.net < 0 ? "bad" : "flat",
    },
    {
      label: "Win rate",
      value: summary.winRate === null ? "—" : `${summary.winRate}%`,
      hint: summary.completed ? `${summary.completed} closed` : "No closed trades",
    },
    { label: "Trading days", value: String(summary.tradingDays) },
    {
      label: "Best day",
      value: summary.best ? formatSigned(summary.best.pnl) : "—",
      hint: summary.best ? `${monthLabel.split(" ")[0]} ${summary.best.day}` : undefined,
      tone: summary.best ? "good" : "flat",
    },
  ];

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <ScrollReveal as="div">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Trader activity calendar
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Your month as a heatmap of profit and loss. Greener days made money, redder days lost it.
          </p>
        </ScrollReveal>

        {/* Month at a glance */}
        <ScrollReveal as="section" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Month summary">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
            >
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
              <p
                className={`mt-2 [overflow-wrap:anywhere] font-mono text-lg font-semibold tracking-[-0.02em] sm:text-xl ${
                  stat.tone === "good"
                    ? "text-[var(--success)]"
                    : stat.tone === "bad"
                      ? "text-[var(--danger)]"
                      : "text-[var(--text-primary)]"
                }`}
              >
                {stat.value}
              </p>
              {stat.hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{stat.hint}</p>}
            </div>
          ))}
        </ScrollReveal>

        {/* The heatmap */}
        <ScrollReveal
          as="section"
          className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] px-3 py-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={() => goToMonth(new Date(year, monthIndex - 1, 1))}
              className="grid size-11 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex min-w-0 flex-col items-center gap-1 text-center">
              <h2 className="text-base font-medium sm:text-lg" aria-live="polite">
                {monthLabel}
              </h2>
              {!isCurrentMonth ? (
                <button
                  type="button"
                  onClick={goToday}
                  className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--surface-elevated)]"
                >
                  Back to today
                </button>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  {loading ? (
                    <>
                      <Loader2 size={11} className="animate-spin" /> Loading records…
                    </>
                  ) : (
                    "Pick a day to see what happened"
                  )}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => goToMonth(new Date(year, monthIndex + 1, 1))}
              className="grid size-11 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {loadError && (
            <p role="alert" className="border-b border-[var(--border-soft)] px-5 py-3 text-xs text-[var(--danger)]">
              We couldn’t load this month’s records. Please try again.
            </p>
          )}

          <div className="p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:grid-cols-[repeat(7,minmax(0,1fr))_92px]">
              {WEEKDAYS.map((name) => (
                <div key={name} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] sm:text-xs">
                  {name}
                </div>
              ))}
              <div className="hidden pb-1 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] md:block">
                Week
              </div>

              {weeks.map((week, weekIndex) => {
                const weekPnl = week.reduce((sum, day) => {
                  if (!day) return sum;
                  return sum + (byDay.get(keyOf(year, monthIndex, day))?.pnl ?? 0);
                }, 0);
                const weekHasTrades = week.some(
                  (day) => day && byDay.get(keyOf(year, monthIndex, day))?.completed
                );

                return (
                  <Fragment key={weekIndex}>
                    {week.map((day, dayIndex) => {
                      if (!day) {
                        return <div key={`blank-${weekIndex}-${dayIndex}`} className="min-h-[58px] rounded-lg sm:min-h-24" />;
                      }

                      const key = keyOf(year, monthIndex, day);
                      const data = byDay.get(key);
                      const isToday = key === todayKey;
                      const isSelected = key === selectedKey;
                      const hasPnl = data && data.completed > 0;
                      const strength = hasPnl && summary.maxAbs ? Math.abs(data.pnl) / summary.maxAbs : 0;
                      const tint = hasPnl && data.pnl !== 0
                        ? `color-mix(in srgb, var(${data.pnl > 0 ? "--success" : "--danger"}) ${Math.round(14 + strength * 40)}%, var(--bg))`
                        : undefined;

                      const description = [
                        new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, monthIndex, day)),
                        hasPnl ? `${data.pnl >= 0 ? "profit" : "loss"} ${formatSigned(data.pnl)}` : null,
                        data?.trades.length ? `${data.trades.length} trade${data.trades.length === 1 ? "" : "s"}` : "no trades",
                        data?.money.length ? `${data.money.length} money record${data.money.length === 1 ? "" : "s"}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectDay(key)}
                          aria-label={description}
                          aria-pressed={isSelected}
                          style={tint ? { background: tint } : undefined}
                          className={`relative flex min-h-[58px] flex-col justify-between overflow-hidden rounded-lg border p-1.5 text-left transition sm:min-h-24 sm:p-2 ${
                            isSelected
                              ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
                              : "border-[var(--border-soft)] hover:border-[var(--border)]"
                          } ${tint ? "" : "bg-[var(--bg)] hover:bg-[var(--surface-elevated)]"}`}
                        >
                          <span
                            className={`grid size-5 place-items-center rounded-full font-mono text-[10px] sm:size-6 sm:text-xs ${
                              isToday
                                ? "bg-[var(--accent)] font-semibold text-[#17130d]"
                                : "text-[var(--text-secondary)]"
                            }`}
                          >
                            {day}
                          </span>

                          <span className="flex min-w-0 flex-col gap-0.5">
                            {hasPnl && (
                              <span
                                className={`truncate font-mono text-[10px] font-semibold sm:text-xs ${
                                  data.pnl > 0 ? "text-[var(--success)]" : data.pnl < 0 ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
                                }`}
                              >
                                {formatCompact(data.pnl)}
                              </span>
                            )}

                            <span className="flex items-center gap-1">
                              {data?.trades.length > 0 && (
                                <span className="hidden text-[10px] text-[var(--text-secondary)] sm:inline">
                                  {data.trades.length} trade{data.trades.length === 1 ? "" : "s"}
                                </span>
                              )}
                              {data?.income > 0 && <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />}
                              {data?.expense > 0 && <span className="size-1.5 rounded-full bg-[var(--danger)]" aria-hidden="true" />}
                            </span>
                          </span>
                        </button>
                      );
                    })}

                    <div
                      className={`hidden min-h-24 flex-col justify-center rounded-lg border border-dashed border-[var(--border-soft)] px-2 text-center md:flex ${
                        weekHasTrades ? "" : "opacity-50"
                      }`}
                      aria-label={weekHasTrades ? `Week ${weekIndex + 1} total ${formatSigned(weekPnl)}` : `Week ${weekIndex + 1}, no closed trades`}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Wk {weekIndex + 1}</span>
                      <span
                        className={`mt-1 truncate font-mono text-xs font-semibold ${
                          !weekHasTrades ? "text-[var(--text-muted)]" : weekPnl > 0 ? "text-[var(--success)]" : weekPnl < 0 ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {weekHasTrades ? formatCompact(weekPnl) : "—"}
                      </span>
                    </div>
                  </Fragment>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[var(--success)]/50" /> Profit day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[var(--danger)]/50" /> Loss day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--success)]" /> Money in
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--danger)]" /> Money out
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* The chosen day */}
        <ScrollReveal as="section" id="calendar-day-detail" className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-live="polite">
          {!selectedDay || !selectedInMonth ? (
            <div className="flex items-start gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                <CalendarDays size={19} />
              </div>
              <div>
                <h2 className="text-base font-medium">Select a day</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Choose a date above to see its trades and money records.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">
                    {new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(selectedDate)}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {showingAll ? "All accounts" : accountName(activeAccountId)}
                  </p>
                </div>

                {selectedDay.completed > 0 && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm font-semibold ${
                      selectedDay.pnl > 0
                        ? "border-[var(--success)]/40 text-[var(--success)]"
                        : selectedDay.pnl < 0
                          ? "border-[var(--danger)]/40 text-[var(--danger)]"
                          : "border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {selectedDay.pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {formatSigned(selectedDay.pnl)}
                  </span>
                )}
              </div>

              {selectedDay.trades.length === 0 && selectedDay.money.length === 0 ? (
                <p className="mt-5 text-sm text-[var(--text-secondary)]">
                  Nothing recorded on this day.{" "}
                  <Link to="/app/trades" className="text-[var(--accent)] underline-offset-4 hover:underline">
                    Record a trade
                  </Link>
                </p>
              ) : (
                <div className="mt-5 space-y-5">
                  {selectedDay.trades.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Trades · {selectedDay.trades.length}
                      </h3>
                      <ul className="mt-2 divide-y divide-[var(--border-soft)]">
                        {selectedDay.trades.map((trade) => (
                          <li key={trade.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{trade.instrument}</p>
                              <p className="mt-0.5 text-xs capitalize text-[var(--text-muted)]">
                                {trade.direction} · {trade.status}
                                {showingAll ? ` · ${accountName(trade.account_id)}` : ""}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-sm font-semibold ${
                                trade.pnl > 0 ? "text-[var(--success)]" : trade.pnl < 0 ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
                              }`}
                            >
                              {trade.pnl === null || trade.pnl === undefined ? "Open" : formatSigned(Number(trade.pnl))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedDay.money.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Money · {selectedDay.money.length}
                      </h3>
                      <ul className="mt-2 divide-y divide-[var(--border-soft)]">
                        {selectedDay.money.map((item) => {
                          const isIncome = item.type === "income";
                          return (
                            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--border)]">
                                  {isIncome ? (
                                    <ArrowUpRight size={15} className="text-[var(--success)]" />
                                  ) : (
                                    <ArrowDownLeft size={15} className="text-[var(--danger)]" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {item.category || (isIncome ? "Income" : "Expense")}
                                  </p>
                                  {(item.description || showingAll) && (
                                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                                      {[item.description, showingAll ? accountName(item.account_id) : null].filter(Boolean).join(" · ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 font-mono text-sm font-semibold ${
                                  isIncome ? "text-[var(--success)]" : "text-[var(--danger)]"
                                }`}
                              >
                                {isIncome ? "+" : "-"}
                                {formatPlain(Number(item.amount) || 0)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </ScrollReveal>
      </main>
    </AppShell>
  );
}

export default CalendarPage;
