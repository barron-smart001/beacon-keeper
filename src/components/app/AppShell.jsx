import { CalendarDays, CheckCircle2, CircleDollarSign, ClipboardCheck, CreditCard, Goal, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import RecordiumMark from "../ui/RecordiumMark";
import { useAuth } from "../../hooks/useAuth";
import useSubscription from "../../hooks/useSubscription";
import { useProfile } from "../../context/ProfileProvider";
import AccountSwitcher from "./AccountSwitcher";
import PageTransition from "../motion/PageTransition";

const navigation = [
  [LayoutDashboard, "Overview", "/app"],
  [ClipboardCheck, "Trades", "/app/trades"],
  [CircleDollarSign, "Money", "/app/money"],
  [WalletCards, "Accounts", "/app/accounts"],
  [ShieldCheck, "Rules", "/app/rules"],
  [Goal, "Goals", "/app/goals"],
  [CalendarDays, "Calendar", "/app/calendar"],
  [CreditCard, "Billing & payments", "/app/billing"],
];

function Navigation({ closeMenu, onRequestSignOut }) {
  const { pathname } = useLocation();

  return <nav className="mt-8 space-y-1" aria-label="Application navigation">{navigation.map(([Icon, label, to]) => {
    const active = pathname === to;
    return <Link onClick={closeMenu} key={label} to={to} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${active ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"}`}><Icon size={18} />{label}</Link>;
  })}<div className="my-5 border-t border-[var(--border-soft)]" /> <Link
  to="/app/settings"
  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
>
  <Settings size={18} />
  Settings
</Link><button type="button" onClick={onRequestSignOut} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"><LogOut size={18} />Sign out</button></nav>;
}

const primaryTabs = [
  [LayoutDashboard, "Overview", "/app"],
  [ClipboardCheck, "Trades", "/app/trades"],
  [CircleDollarSign, "Money", "/app/money"],
  [ShieldCheck, "Rules", "/app/rules"],
];

/** Thumb-reach navigation for phones and tablets; the rest lives under More. */
function BottomTabs({ menuOpen, onToggleMore, onNavigate }) {
  const { pathname } = useLocation();
  const onPrimary = primaryTabs.some(([, , to]) => pathname === to);
  const tab = "flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors";

  return (
    <nav
      aria-label="Main"
      data-bottom-tabs
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border-soft)] bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {primaryTabs.map(([Icon, label, to]) => {
          const active = pathname === to && !menuOpen;
          return (
            <Link
              key={label}
              to={to}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`${tab} ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
            >
              <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[11px] leading-none">{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onToggleMore}
          aria-expanded={menuOpen}
          className={`${tab} ${menuOpen || !onPrimary ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
          <span className="text-[11px] leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}

function SubscriptionIndicator({ compact = false }) {
  const { subscription, isSubscribed, isLoading } = useSubscription();
  const expiryDate = subscription.expiresAt
    ? new Date(subscription.expiresAt)
    : null;
  const formattedExpiry =
    expiryDate && Number.isFinite(expiryDate.getTime())
      ? expiryDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;
  const label = isLoading
    ? "Checking subscription"
    : isSubscribed
      ? "PRO ACTIVE"
      : "Upgrade to Pro";
  const detail = isLoading
    ? "Loading plan..."
    : isSubscribed
      ? [
          subscription.billingPlan?.title || "Pro",
          formattedExpiry ? `Active until ${formattedExpiry}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Unlock all features";

  return (
    <Link
      to="/app/billing"
      aria-label={`${label}. ${detail}`}
      className={`inline-flex min-w-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-left transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-elevated)] ${
        compact ? "max-w-[120px] px-2 py-1.5" : "max-w-[280px] px-3 py-2"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${
          isLoading
            ? "animate-pulse bg-[var(--text-muted)]"
            : isSubscribed
              ? "bg-emerald-400"
              : "bg-[var(--text-muted)]"
        }`}
      />
      <span className="min-w-0">
        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">
          {label}
        </span>
        <span className="block truncate text-[10px] text-[var(--text-muted)]">
          {detail}
        </span>
      </span>
    </Link>
  );
}

function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const reducedMotion = useReducedMotion();
  const { signOut } = useAuth();
  const { avatarUrl, displayName } = useProfile();
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentNotice, setPaymentNotice] = useState(
    location.state?.paymentNotice || ""
  );

  // Clear the one-time notice from history so a reload doesn't repeat it.
  useEffect(() => {
    if (location.state?.paymentNotice) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const nextIsScrolled = latest > 8;
    setIsScrolled((current) =>
      current === nextIsScrolled ? current : nextIsScrolled
    );
  });

  async function handleConfirmSignOut() {
    try {
      await signOut();
      navigate("/sign-in", { replace: true });
    } finally {
      setShowSignOutConfirm(false);
      setMenuOpen(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[var(--bg)] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="fixed inset-y-0 hidden w-60 border-r border-[var(--border-soft)] bg-[var(--bg)] p-5 lg:block">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]"><RecordiumMark /> TradeFrame</Link>
        <Navigation onRequestSignOut={() => setShowSignOutConfirm(true)} />
        <p className="absolute bottom-6 left-5 right-5 text-xs leading-5 text-[var(--text-muted)]">Your private record of progress.</p>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className={`sticky top-0 z-20 flex h-[68px] items-center justify-between gap-2 border-b border-[var(--border-soft)] px-3 backdrop-blur sm:px-5 ${isScrolled ? "bg-[var(--bg)]/90 shadow-[0_8px_24px_rgba(0,0,0,0.12)]" : "bg-[var(--bg)]/95"} ${reducedMotion ? "" : "transition-colors duration-300"} lg:hidden`}>
          <Link to="/" className="flex items-center gap-2.5 font-semibold"><RecordiumMark /> TradeFrame</Link>
          <SubscriptionIndicator compact />
          <Link to="/app/settings" aria-label="Your profile" className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--accent)]">
            {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : initial}
          </Link>
        </header>

        <div className="border-b border-[var(--border-soft)] px-3 py-2 sm:px-5 lg:hidden">
          <AccountSwitcher block />
        </div>

        {menuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-[68px] z-10 overflow-y-auto bg-[var(--bg)] px-5 pb-28 pt-2 lg:hidden">
            <Navigation closeMenu={() => setMenuOpen(false)} onRequestSignOut={() => setShowSignOutConfirm(true)} />
          </div>
        )}

        <header className={`sticky top-0 z-20 hidden h-[76px] items-center justify-end gap-4 border-b border-[var(--border-soft)] px-8 backdrop-blur ${isScrolled ? "bg-[var(--bg)]/90 shadow-[0_8px_24px_rgba(0,0,0,0.12)]" : "bg-[var(--bg)]/95"} ${reducedMotion ? "" : "transition-colors duration-300"} lg:flex`}>
          <AccountSwitcher />
          <SubscriptionIndicator />
          <Link to="/app/settings" aria-label="Your profile" className="ml-4 grid size-9 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent)]">
            {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : initial}
          </Link>
        </header>

        <main className="min-w-0 pb-24 lg:pb-0">
          {paymentNotice && (
            <div role="status" className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 sm:mx-6 lg:mx-8">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1">{paymentNotice} You now have full access.</p>
              <button type="button" onClick={() => setPaymentNotice("")} aria-label="Dismiss" className="shrink-0 text-emerald-200/80 hover:text-emerald-100">
                <X size={16} />
              </button>
            </div>
          )}
          <PageTransition>{children}</PageTransition>
        </main>

        <BottomTabs
          menuOpen={menuOpen}
          onToggleMore={() => setMenuOpen((open) => !open)}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>
    </div>

      {showSignOutConfirm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end bg-black/75 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[#111318] p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-end">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-2">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">Sign out?</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                You will be signed out of this device. Your trading records will remain safely stored in your TradeFrame account.
              </p>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-transparent px-5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface)]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#111318] transition hover:bg-[var(--text-primary)]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default AppShell;
