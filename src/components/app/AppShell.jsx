import { Bell, CalendarDays, CircleDollarSign, ClipboardCheck, Goal, LayoutDashboard, LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MeridianMark from "../ui/MeridianMark";
import { useAuth } from "../../hooks/useAuth";
import PageTransition from "../motion/PageTransition";

const navigation = [
  [LayoutDashboard, "Overview", "/app"],
  [ClipboardCheck, "Trades", "/app/trades"],
  [CircleDollarSign, "Money", "/app/money"],
  [Goal, "Goals", "/app/goals"],
  [CalendarDays, "Calendar", "/app/calendar"],
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

function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]"><MeridianMark /> Meridian</Link>
        <Navigation onRequestSignOut={() => setShowSignOutConfirm(true)} />
        <p className="absolute bottom-6 left-5 right-5 text-xs leading-5 text-[var(--text-muted)]">Your private record of progress.</p>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg)]/95 px-5 backdrop-blur lg:hidden">
          <Link to="/" className="flex items-center gap-2.5 font-semibold"><MeridianMark /> Meridian</Link>
          <button onClick={() => setMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-full border border-[var(--border)]" aria-label="Toggle application navigation" aria-expanded={menuOpen}>
            {menuOpen ? <X size={18} /> : <Menu size={19} />}
          </button>
        </header>

        {menuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-[68px] z-10 bg-[var(--bg)] px-5 py-4 lg:hidden">
            <Navigation closeMenu={() => setMenuOpen(false)} onRequestSignOut={() => setShowSignOutConfirm(true)} />
          </div>
        )}

        <header className="sticky top-0 z-20 hidden h-[76px] items-center justify-end border-b border-[var(--border-soft)] bg-[var(--bg)]/95 px-8 backdrop-blur lg:flex">
          <button className="grid size-10 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <span className="ml-4 grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent)]">M</span>
        </header>

        <main className="min-w-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/75 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true">
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
                You will be signed out of this device. Your trading records will remain safely stored in your Meridian account.
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
        </div>
      )}
    </>
  );
}

export default AppShell;
