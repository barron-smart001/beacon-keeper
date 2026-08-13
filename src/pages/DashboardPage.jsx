import { ArrowRight, BookOpenCheck, CirclePlus, ClipboardCheck, Target } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "../components/app/AppShell";

const summaries = [
  ["Money in", "No records yet"],
  ["Money out", "No records yet"],
  ["Trading P/L", "No completed trades"],
  ["Net result", "Add records to calculate"],
];

function DashboardPage() {
  return <AppShell><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Daily command center</p><h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Good morning.</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">A calm view of your records, goals, and process.</p></div><Link to="/onboarding" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"><CirclePlus size={17} /> Add your first record</Link></div>
    <section className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Financial summary">{summaries.map(([label, value]) => <article key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-6 font-mono text-sm text-[var(--text-secondary)]">{value}</p></article>)}</section>
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-base font-medium">Start with today&apos;s plan</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Give the day a clear intention before you trade.</p></div><Target className="text-[var(--accent)]" size={21} /></div><div className="mt-7 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] px-5 py-10 text-center"><p className="text-sm text-[var(--text-secondary)]">No goals for today.</p><Link to="/onboarding" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]">Create a goal <ArrowRight size={15} /></Link></div></article>
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><ClipboardCheck className="text-[var(--accent)]" size={21} /><h2 className="mt-7 text-base font-medium">Your rule check</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Add your personal rules to make your process reviewable, before and after each trade.</p><Link to="/onboarding" className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]">Add a rule <ArrowRight size={15} /></Link></article></section>
    <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-medium">Recent activity</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Trades, money records, and daily reviews will appear here.</p></div><BookOpenCheck className="shrink-0 text-[var(--accent)]" size={21} /></div><div className="mt-7 border-t border-[var(--border-soft)] pt-7 text-center"><p className="text-sm text-[var(--text-muted)]">Your record starts with the first intentional entry.</p></div></section>
  </main></AppShell>;
}

export default DashboardPage;
