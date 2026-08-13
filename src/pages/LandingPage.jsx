import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Menu,
  ShieldCheck,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import MeridianMark from "../components/ui/MeridianMark";

const navItems = [
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["Pricing", "#pricing"],
];

const features = [
  {
    icon: BookOpenCheck,
    title: "A record worth reviewing",
    text: "Capture every trade with the context behind it: setup, risk, execution, notes, and the lesson you take forward.",
  },
  {
    icon: CircleDollarSign,
    title: "See the whole financial picture",
    text: "Keep trading income, everyday income, and expenses together, without turning your journal into a spreadsheet maze.",
  },
  {
    icon: ClipboardCheck,
    title: "Make discipline measurable",
    text: "Turn your personal trading rules into a repeatable pre-trade and post-trade practice you can actually improve.",
  },
];

const faqs = [
  ["Is Meridian a trading platform?", "No. Meridian does not execute trades, provide signals, or replace your broker. It is your private place to plan, record, and review the decisions you make."],
  ["Do I need to connect a broker account?", "No. Meridian is designed around records you enter yourself. Broker synchronization can be considered later, but it is not required to build a useful trading practice."],
  ["Is Meridian only for forex traders?", "No. It supports the process behind forex, day, swing, position, and other discretionary trading styles. You decide which instruments, accounts, and rules matter."],
  ["Can I track personal income and expenses too?", "Yes. Meridian brings manually recorded money in and money out alongside your trading activity, so progress is visible in one considered view."],
];

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function SectionHeading({ eyebrow, title, body, centered = false }) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-medium tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">{title}</h2>
      {body && <p className="mt-5 text-base leading-7 text-[var(--text-secondary)] sm:text-lg">{body}</p>}
    </div>
  );
}

function ButtonLink({ children, secondary = false, className = "", to, ...props }) {
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] ${secondary ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--text-muted)]" : "bg-[var(--accent)] text-[#17130d] hover:bg-[var(--accent-light)]"} ${className}`;

  if (to) {
    return <Link className={classes} to={to}>{children}</Link>;
  }

  return (
    <a
      className={classes}
      {...props}
    >
      {children}
    </a>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-12 max-w-5xl rounded-[22px] border border-[var(--border)] bg-[#0d0e12] p-2 shadow-[0_25px_80px_rgba(0,0,0,0.35)] sm:p-3">
      <div className="overflow-hidden rounded-[15px] border border-[var(--border-soft)] bg-[var(--bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5 text-sm font-semibold"><MeridianMark className="size-5" /> Meridian</div>
          <span className="rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[10px] text-[var(--text-muted)]">TODAY</span>
        </div>
        <div className="grid lg:grid-cols-[180px_1fr]">
          <aside className="hidden border-r border-[var(--border-soft)] p-3 lg:block">
            {["Overview", "Trades", "Money", "Rules", "Goals"].map((item, index) => <div key={item} className={`mb-1 rounded-lg px-3 py-2 text-xs ${index === 0 ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{item}</div>)}
          </aside>
          <div className="p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs text-[var(--text-muted)]">Your daily command center</p><p className="mt-1 text-lg font-medium">Thursday, 13 August</p></div><button className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[#17130d]">Add record</button></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Money in", "Money out", "Trading P/L"].map((label) => <div key={label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-5 font-mono text-sm text-[var(--text-secondary)]">No records yet</p></div>)}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium">Today&apos;s plan</p><Target size={16} className="text-[var(--accent)]" /></div><div className="mt-5 rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-muted)]">Set your first goal for today</div></div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4"><p className="text-sm font-medium">Rule check</p><p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">Your process is more valuable when you can review it.</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--border-soft)]"><div className="h-full w-1/3 rounded-full bg-[var(--accent)]" /></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const motionProps = reducedMotion ? {} : { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.2 }, variants: reveal, transition: { duration: 0.55 } };

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <header className="relative z-20 border-b border-[var(--border-soft)] bg-[var(--bg)]/95 backdrop-blur">
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]"><MeridianMark /> Meridian</a>
          <div className="hidden items-center gap-7 md:flex">{navItems.map(([label, href]) => <a key={label} href={href} className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">{label}</a>)}</div>
          <div className="hidden items-center gap-4 md:flex"><Link to="/sign-in" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Sign in</Link><ButtonLink to="/sign-up">Start tracking free</ButtonLink></div>
          <button type="button" className="grid size-11 place-items-center rounded-full border border-[var(--border)] md:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={19} /> : <Menu size={20} />}</button>
        </nav>
        <AnimatePresence>{menuOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[var(--border-soft)] md:hidden"><div className="space-y-1 px-5 py-4">{navItems.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm text-[var(--text-secondary)]">{label}</a>)}<ButtonLink to="/sign-up" className="mt-3 w-full">Start tracking free</ButtonLink></div></motion.div>}</AnimatePresence>
      </header>

      <section id="top" className="relative isolate border-b border-[var(--border-soft)]">
        <div className="pointer-events-none absolute left-1/2 top-[-260px] -z-10 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(201,168,118,0.12),transparent_67%)]" />
        <motion.div {...motionProps} className="mx-auto max-w-7xl px-5 pb-20 pt-20 text-center sm:pb-24 sm:pt-28 lg:px-8 lg:pb-28">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"><span className="size-1.5 rounded-full bg-[var(--accent)]" /> Built for intentional traders</p>
          <h1 className="text-balance mx-auto max-w-4xl text-5xl font-medium tracking-[-0.06em] sm:text-6xl lg:text-8xl">Your trading. Your money. <span className="text-[var(--accent-light)]">Your discipline.</span></h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-[var(--text-secondary)] sm:text-lg">Meridian is the calm, complete record of how you trade and how you progress—one place to plan, record, review, and improve.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><ButtonLink href="#start" className="px-6">Start tracking free <ArrowRight size={16} /></ButtonLink><ButtonLink secondary href="#features" className="px-6">Explore Meridian</ButtonLink></div>
          <p className="mt-5 text-xs text-[var(--text-muted)]">No broker connection required.</p>
          <ProductPreview />
        </motion.div>
      </section>

      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:grid-cols-3 lg:px-8 lg:py-20">{[["PLAN", "Define the conditions that earn your risk."], ["RECORD", "Keep every decision and result in context."], ["IMPROVE", "Review patterns and strengthen your process."]].map(([label, text], index) => <div key={label} className="flex gap-4"><span className="font-mono text-sm text-[var(--accent)]">0{index + 1}</span><div><h2 className="text-sm font-semibold tracking-[0.14em]">{label}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p></div></div>)}</div></section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><motion.div {...motionProps}><SectionHeading eyebrow="More than a trade journal" title="A clearer practice, built one record at a time." body="Meridian holds the information that matters after the chart is closed—not only what happened, but why." /></motion.div><div className="mt-12 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <motion.article {...motionProps} key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7"><span className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]"><Icon size={20} /></span><h3 className="mt-8 text-xl font-medium tracking-[-0.03em]">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{text}</p></motion.article>)}</div></section>

      <section className="border-y border-[var(--border-soft)] bg-[var(--surface)]"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28"><motion.div {...motionProps}><SectionHeading eyebrow="Trading accountability" title="A rule only matters when you can see whether you kept it." body="Create the rules that protect your edge. Use them before a trade, revisit them afterward, and discover where your process needs more attention." /><div className="mt-8 space-y-3">{["Confirm your pre-trade checklist", "Record what went well and what did not", "Review rule adherence over time"].map((item) => <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]" key={item}><span className="grid size-5 place-items-center rounded-full bg-[rgba(201,168,118,0.14)] text-[var(--accent)]"><Check size={12} /></span>{item}</div>)}</div></motion.div><motion.div {...motionProps} className="rounded-2xl border border-[var(--border)] bg-[#0d0e12] p-5 sm:p-7"><div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-5"><div><p className="text-sm font-medium">Pre-trade checklist</p><p className="mt-1 text-xs text-[var(--text-muted)]">Your process, before you commit.</p></div><ShieldCheck className="text-[var(--accent)]" size={21} /></div><div className="mt-5 space-y-2">{["Higher timeframe bias confirmed", "Risk is acceptable", "Stop loss is defined", "Setup meets my criteria"].map((item, index) => <div key={item} className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"><span className="text-sm text-[var(--text-secondary)]">{item}</span><span className={`size-4 rounded border ${index < 2 ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--text-muted)]"}`}>{index < 2 && <Check size={14} className="text-[#17130d]" />}</span></div>)}</div></motion.div></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><motion.div {...motionProps}><SectionHeading centered eyebrow="Your daily command center" title="Less noise. More useful reflection." body="Every view begins with your own records. Meridian makes the next right action obvious, whether that is planning your day or reviewing last week." /></motion.div><div className="mt-12 grid gap-4 lg:grid-cols-3">{[[Target, "Plan with intention", "Set financial, trading, and habit goals that give the day shape."], [TrendingUp, "Record the full picture", "Log trades and financial activity as it happens, in your own words."], [BarChart3, "Review to improve", "Use your history to recognize stronger decisions and recurring mistakes."]].map(([Icon, title, text], index) => <motion.div {...motionProps} key={title} className="relative rounded-2xl border border-[var(--border)] p-6"><span className="font-mono text-xs text-[var(--accent)]">0{index + 1}</span><Icon className="mt-12 text-[var(--accent)]" size={24} /><h3 className="mt-5 text-lg font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p></motion.div>)}</div></section>

      <section id="pricing" className="border-y border-[var(--border-soft)] bg-[var(--surface)]"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><motion.div {...motionProps}><SectionHeading centered eyebrow="Simple by design" title="Start building a better record today." body="Meridian is being shaped carefully around the habits that make independent traders more intentional." /></motion.div><motion.div {...motionProps} className="mx-auto mt-12 max-w-md rounded-2xl border border-[rgba(201,168,118,0.5)] bg-[var(--surface-elevated)] p-7"><p className="text-sm font-medium text-[var(--accent)]">Early access</p><h3 className="mt-3 text-2xl font-medium tracking-[-0.03em]">Start tracking free</h3><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Begin with your trade records, rules, goals, and personal money tracking.</p><ul className="my-7 space-y-3">{["Your private trading journal", "Personal rules and checklists", "Income and expense records", "Goals and daily reviews"].map((item) => <li key={item} className="flex gap-3 text-sm text-[var(--text-secondary)]"><Check className="shrink-0 text-[var(--accent)]" size={17} />{item}</li>)}</ul><ButtonLink href="#start" className="w-full">Get early access <ArrowRight size={16} /></ButtonLink></motion.div></div></section>

      <section className="mx-auto max-w-3xl px-5 py-20 lg:py-28"><motion.div {...motionProps}><SectionHeading centered eyebrow="Questions" title="A calmer way to keep track." /></motion.div><div className="mt-10 divide-y divide-[var(--border)] border-y border-[var(--border)]">{faqs.map(([question, answer]) => <details key={question} className="group py-1"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-sm font-medium marker:content-none">{question}<ChevronDown className="shrink-0 text-[var(--text-muted)] transition group-open:rotate-180" size={18} /></summary><p className="max-w-2xl pb-5 text-sm leading-6 text-[var(--text-secondary)]">{answer}</p></details>)}</div></section>

      <section id="start" className="border-t border-[var(--border-soft)] bg-[var(--surface)]"><div className="mx-auto max-w-5xl px-5 py-20 text-center lg:py-28"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Your process deserves a place</p><h2 className="text-balance mx-auto mt-5 max-w-3xl text-4xl font-medium tracking-[-0.05em] sm:text-5xl">Trade with more intention. Review with more honesty.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)]">Build the record that helps you show up for your trading practice every day.</p><ButtonLink href="mailto:hello@meridian.app" className="mt-8 px-6">Start tracking free <ArrowRight size={16} /></ButtonLink></div></section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8"><a href="#top" className="flex items-center gap-2.5 font-semibold"><MeridianMark /> Meridian</a><p className="text-xs text-[var(--text-muted)]">Your trading. Your money. Your discipline.</p><div className="flex gap-5 text-xs text-[var(--text-secondary)]"><a href="#features" className="hover:text-[var(--text-primary)]">Features</a><a href="#pricing" className="hover:text-[var(--text-primary)]">Pricing</a></div></footer>
    </main>
  );
}

export default LandingPage;
