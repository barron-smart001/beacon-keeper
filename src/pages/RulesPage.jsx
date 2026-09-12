import { CheckCircle2, ClipboardCheck, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "../components/app/AppShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const starterChecklist = ["Higher timeframe bias confirmed", "Risk is acceptable", "Stop loss is defined", "Setup matches my plan"];

function RulesPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadRules() {
      const { data, error } = await supabase.from("trading_rules").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) setNotice("We couldn't load your rules. Please refresh and try again.");
      else setRules(data ?? []);
    }
    if (user?.id) loadRules();
    return () => { mounted = false; };
  }, [user?.id]);

  function openCreate() { setDraft(""); setEditingId(null); setIsFormOpen(true); }
  function openEdit(rule) { setDraft(rule.description); setEditingId(rule.id); setIsFormOpen(true); }
  async function saveRule(event) {
    event.preventDefault();
    const description = draft.trim();
    if (!description) return;
    setNotice("");
    const query = editingId ? supabase.from("trading_rules").update({ description }).eq("id", editingId).eq("user_id", user.id) : supabase.from("trading_rules").insert({ user_id: user.id, description });
    const { data, error } = await query.select().single();
    if (error) { setNotice("We couldn't save that rule. Please try again."); return; }
    setRules((current) => editingId ? current.map((rule) => rule.id === editingId ? data : rule) : [data, ...current]);
    setIsFormOpen(false);
  }
  async function deleteRule(id) {
    setNotice("");
    const { error } = await supabase.from("trading_rules").delete().eq("id", id).eq("user_id", user.id);
    if (error) { setNotice("We couldn't remove that rule. Please try again."); return; }
    setRules((current) => current.filter((rule) => rule.id !== id));
  }

  const displayedRules = rules.length ? rules : starterChecklist.map((description) => ({ description }));
  return <AppShell><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Trading accountability</p><h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Rules</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Create the personal rules and checklist items that make your trading process reviewable.</p></div><button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"><Plus size={17} /> Add rule</button></div>{notice && <p role="status" className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">{notice}</p>}<section className="mt-9 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><ShieldCheck className="text-[var(--accent)]" size={22} /><h2 className="mt-7 text-lg font-medium">{rules.length ? `${rules.length} rule${rules.length === 1 ? "" : "s"} saved.` : "No rules saved yet."}</h2><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Start with one rule you can confirm before or after a trade. Meridian will use these records to calculate adherence once rule tracking is connected.</p><button type="button" onClick={openCreate} className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]">Create a rule <Plus size={15} /></button></article><article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-5"><div><h2 className="text-base font-medium">Pre-trade checklist</h2><p className="mt-1 text-xs text-[var(--text-muted)]">{rules.length ? "Your saved rules." : "A starter structure for your process."}</p></div><ClipboardCheck className="text-[var(--accent)]" size={21} /></div><div className="mt-5 space-y-2">{displayedRules.map((rule) => <div key={rule.id ?? rule.description} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-3"><span className="text-sm text-[var(--text-secondary)]">{rule.description}</span>{rule.id ? <span className="flex shrink-0 gap-1"><button type="button" onClick={() => openEdit(rule)} className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]" aria-label={`Edit rule: ${rule.description}`}><Pencil size={14} /></button><button type="button" onClick={() => deleteRule(rule.id)} className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--danger)]" aria-label={`Delete rule: ${rule.description}`}><Trash2 size={14} /></button></span> : <CheckCircle2 size={18} className="shrink-0 text-[var(--text-muted)]" />}</div>)}</div></article></section></main>{isFormOpen && <div className="fixed inset-0 z-30 flex items-end bg-black/65 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="rule-form-title"><form onSubmit={saveRule} className="w-full max-w-lg rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-2xl sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Trading accountability</p><h2 id="rule-form-title" className="mt-2 text-2xl font-medium">{editingId ? "Edit rule" : "Add a rule"}</h2></div><button type="button" onClick={() => setIsFormOpen(false)} className="grid size-10 place-items-center rounded-full border border-[var(--border)]" aria-label="Close rule form"><X size={18} /></button></div><label className="mt-7 block text-sm font-medium">Rule<textarea autoFocus required value={draft} onChange={(event) => setDraft(event.target.value)} rows="4" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="e.g. Risk no more than 1% on a single trade" /></label><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]">Cancel</button><button type="submit" className="min-h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]">Save rule</button></div></form></div>}</AppShell>;
}

export default RulesPage;
