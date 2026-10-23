import {
  ArrowDown,
  ArrowRight,
  BookOpenCheck,
  Check,
  Landmark,
  Link2,
  PencilLine,
  PlugZap,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Link2,
    title: "Connect",
    text: "Link a broker account with read-only access. Pick which TradeFrame account its trades belong to.",
  },
  {
    icon: RefreshCw,
    title: "Import",
    text: "Closed trades are pulled in on a schedule, and you can sync on demand. Nothing is entered twice.",
  },
  {
    icon: BookOpenCheck,
    title: "Review",
    text: "Imported trades appear in Trades, the Dashboard and the Calendar, ready for your notes.",
  },
];

const promises = [
  "Read-only: TradeFrame can see trades, never place them",
  "It can never move or withdraw money",
  "Your main trading password is never asked for",
  "Disconnect any time, imported trades stay in your journal",
];

const plannedBrokers = [
  { name: "Exness", detail: "MetaTrader 5" },
  { name: "Deriv", detail: "Deriv account or MT5" },
];

function FlowNode({ icon: Icon, label, sub, accent = false }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-3.5 ${
        accent
          ? "border-[var(--accent)] bg-[rgba(201,168,118,0.08)]"
          : "border-[var(--border)] bg-[var(--bg)]"
      }`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--text-muted)]">{sub}</span>
      </span>
    </div>
  );
}

function FlowLink({ label }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 text-[11px] text-[var(--text-muted)] sm:flex-col sm:gap-1">
      <ArrowDown size={16} className="text-[var(--accent)] sm:hidden" aria-hidden="true" />
      <ArrowRight size={16} className="hidden text-[var(--accent)] sm:block" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Shown while the broker service is not available yet. It promises nothing that does not exist. */
function BrokerComingSoon() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* What it is */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.14),transparent_70%)]"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            In development
          </span>

          <h2 className="mt-5 max-w-xl text-balance text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
            Your broker’s trades, imported for you.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base sm:leading-7">
            Broker import isn’t live yet. We’re building it, and when it’s ready it will appear right here. Until then
            everything you record by hand works exactly as before.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch" aria-label="How trades will flow">
            <FlowNode icon={Landmark} label="Your broker" sub="Read-only access" />
            <FlowLink label="auto-import" />
            <FlowNode icon={PlugZap} label="TradeFrame" sub="Matches and de-duplicates" accent />
            <FlowLink label="appears in" />
            <FlowNode icon={BookOpenCheck} label="Your journal" sub="Trades · Dashboard · Calendar" />
          </div>
        </div>
      </section>

      {/* How it will work */}
      <section aria-label="How it will work">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          How it will work
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                  <Icon size={18} />
                </span>
                <span className="font-mono text-xs text-[var(--text-muted)]">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Safety and planned brokers */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
              <ShieldCheck size={18} />
            </span>
            <h2 className="text-base font-medium">Built to be safe</h2>
          </div>
          <ul className="mt-5 space-y-3">
            {promises.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]">
                <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-[rgba(201,168,118,0.14)] text-[var(--accent)]">
                  <Check size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
              <Landmark size={18} />
            </span>
            <h2 className="text-base font-medium">Planned brokers</h2>
          </div>
          <ul className="mt-5 space-y-3">
            {plannedBrokers.map(({ name, detail }) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{name}</span>
                  <span className="block text-xs text-[var(--text-muted)]">{detail}</span>
                </span>
                <span className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                  Planned
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
            Which brokers are supported depends on what each one allows for read-only access.
          </p>
        </section>
      </div>

      {/* What to do now */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
            <PencilLine size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-medium">In the meantime</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Record trades by hand. It takes a minute, and it’s the best way to keep the reasons behind each trade.
            </p>
          </div>
        </div>

        <Link
          to="/app/trades"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[#17130d] transition hover:bg-[var(--accent-light)]"
        >
          Record a trade <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}

export default BrokerComingSoon;
