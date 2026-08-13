import { ArrowLeft, ArrowRight, Check, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import MeridianMark from "../components/ui/MeridianMark";

const steps = ["Your practice", "First account", "First rule"];
const inputClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]";

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ style: "", currency: "USD", account: "", rule: "" });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function advance(event) {
    event.preventDefault();
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setNotice("Your setup is ready to save once Meridian persistence is connected. Nothing has been saved yet.");
  }

  const content = [
    {
      eyebrow: "Step 1 of 3",
      title: "Shape Meridian around your practice.",
      body: "Start with the details that make your records clearer. You can adjust these later.",
      fields: <><label className="block text-sm font-medium">Trading style<select required name="style" value={form.style} onChange={updateField} className={inputClass}><option value="">Select your primary style</option><option value="Forex">Forex</option><option value="Day trading">Day trading</option><option value="Scalping">Scalping</option><option value="Swing trading">Swing trading</option><option value="Position trading">Position trading</option><option value="Other">Other</option></select></label><label className="mt-5 block text-sm font-medium">Default currency<select name="currency" value={form.currency} onChange={updateField} className={inputClass}><option value="USD">USD — US dollar</option><option value="NGN">NGN — Nigerian naira</option><option value="GBP">GBP — British pound</option><option value="EUR">EUR — Euro</option></select><span className="mt-2 block text-xs leading-5 text-[var(--text-muted)]">Meridian will not convert currencies or assume exchange rates.</span></label></>,
    },
    {
      eyebrow: "Step 2 of 3",
      title: "Add your first account.",
      body: "Accounts help you keep records organized. A personal, broker, or demo account is a good place to begin.",
      fields: <><label className="block text-sm font-medium">Account name<input required name="account" value={form.account} onChange={updateField} className={inputClass} placeholder="e.g. Personal trading account" /></label><div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[var(--surface-elevated)] text-[var(--accent)]"><WalletCards size={18} /></span><p className="text-sm text-[var(--text-secondary)]">You can add balances and account details when your records are ready.</p></div></div></>,
    },
    {
      eyebrow: "Step 3 of 3",
      title: "Start with one rule you trust.",
      body: "A good rule is specific and observable. Meridian will help you review it before and after your trades.",
      fields: <><label className="block text-sm font-medium">Your first trading rule<textarea required name="rule" value={form.rule} onChange={updateField} rows="4" className={inputClass} placeholder="e.g. Risk no more than 1% on a single trade" /></label><div className="mt-5 flex gap-3 rounded-xl border border-[rgba(201,168,118,0.22)] bg-[rgba(201,168,118,0.07)] p-4"><ShieldCheck className="shrink-0 text-[var(--accent)]" size={19} /><p className="text-xs leading-5 text-[var(--text-secondary)]">The most useful rules describe an action you can confirm, not an outcome you cannot control.</p></div></>,
    },
  ][step];

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between"><Link to="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]"><MeridianMark /> Meridian</Link><Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Finish later</Link></header>
        <div className="mx-auto mt-14 max-w-xl sm:mt-20">
          <ol className="mb-12 flex items-center" aria-label="Onboarding progress">{steps.map((label, index) => <li key={label} className="flex flex-1 items-center last:flex-none"><span className={`grid size-7 place-items-center rounded-full border text-xs font-semibold ${index < step ? "border-[var(--accent)] bg-[var(--accent)] text-[#17130d]" : index === step ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}>{index < step ? <Check size={14} /> : index + 1}</span>{index < steps.length - 1 && <span className={`mx-2 h-px flex-1 ${index < step ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />}</li>)}</ol>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{content.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">{content.title}</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">{content.body}</p>
          <form className="mt-9 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" onSubmit={advance}>{content.fields}{notice && <p role="status" className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">{notice}</p>}<div className="mt-7 flex items-center justify-between gap-4">{step > 0 ? <button type="button" onClick={() => { setStep((current) => current - 1); setNotice(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} /> Back</button> : <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={16} /> Home</Link>}<button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]">{step === steps.length - 1 ? "Complete setup" : "Continue"}{step === steps.length - 1 ? <Check size={16} /> : <ArrowRight size={16} />}</button></div></form>
          <p className="mt-5 text-center text-xs text-[var(--text-muted)]">This setup currently stays only in this browser session.</p>
        </div>
      </div>
    </main>
  );
}

export default OnboardingPage;
