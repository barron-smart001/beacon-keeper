import { Bell, CalendarDays, CircleDollarSign, ClipboardCheck, Goal, LayoutDashboard, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import MeridianMark from "../ui/MeridianMark";

const navigation = [
  [LayoutDashboard, "Overview", "/app"],
  [ClipboardCheck, "Trades", "/app"],
  [CircleDollarSign, "Money", "/app"],
  [Goal, "Goals", "/app"],
  [CalendarDays, "Calendar", "/app"],
];

function Navigation({ closeMenu }) {
  return <nav className="mt-8 space-y-1" aria-label="Application navigation">{navigation.map(([Icon, label, to], index) => <Link onClick={closeMenu} key={label} to={to} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${index === 0 ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"}`}><Icon size={18} />{label}</Link>)}<div className="my-5 border-t border-[var(--border-soft)]" /><Link to="/app" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"><Settings size={18} />Settings</Link></nav>;
}

function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="min-h-screen bg-[var(--bg)] lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="fixed inset-y-0 hidden w-60 border-r border-[var(--border-soft)] bg-[var(--bg)] p-5 lg:block"><Link to="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]"><MeridianMark /> Meridian</Link><Navigation /><p className="absolute bottom-6 left-5 right-5 text-xs leading-5 text-[var(--text-muted)]">Your private record of progress.</p></aside>
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg)]/95 px-5 backdrop-blur lg:hidden"><Link to="/" className="flex items-center gap-2.5 font-semibold"><MeridianMark /> Meridian</Link><button onClick={() => setMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-full border border-[var(--border)]" aria-label="Toggle application navigation" aria-expanded={menuOpen}>{menuOpen ? <X size={18} /> : <Menu size={19} />}</button></header>
    {menuOpen && <div className="fixed inset-x-0 bottom-0 top-[68px] z-10 bg-[var(--bg)] px-5 py-4 lg:hidden"><Navigation closeMenu={() => setMenuOpen(false)} /></div>}
    <div className="lg:col-start-2"><header className="hidden h-[76px] items-center justify-end border-b border-[var(--border-soft)] px-8 lg:flex"><button className="grid size-10 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]" aria-label="Notifications"><Bell size={18} /></button><span className="ml-4 grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent)]">M</span></header>{children}</div>
  </div>;
}

export default AppShell;
