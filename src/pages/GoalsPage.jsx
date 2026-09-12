import { Check, Circle, Flag, Plus, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/app/AppShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const goalTypes = ["daily", "weekly", "monthly", "trading", "financial", "habit"];
const initialForm = { title: "", type: "daily", target_date: "", notes: "" };

function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadGoals() {
      const { data, error } = await supabase.from("goals").select("*").eq("user_id", user.id).neq("status", "archived").order("target_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) setNotice("We couldn't load your goals. Please refresh and try again.");
      else setGoals(data ?? []);
    }
    if (user?.id) loadGoals();
    return () => { mounted = false; };
  }, [user?.id]);

  const activeGoals = useMemo(() => goals.filter((goal) => goal.status === "active"), [goals]);
  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  function openForm() { setForm(initialForm); setIsFormOpen(true); }
  async function saveGoal(event) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    setNotice("");
    const { data, error } = await supabase.from("goals").insert({ user_id: user.id, title, type: form.type, target_date: form.target_date || null, notes: form.notes.trim() || null }).select().single();
    if (error) { setNotice("We couldn't save that goal. Please try again."); return; }
    setGoals((current) => [...current, data]);
    setIsFormOpen(false);
  }
  async function toggleGoal(goal) {
    setNotice("");
    const status = goal.status === "completed" ? "active" : "completed";
    const { data, error } = await supabase.from("goals").update({ status }).eq("id", goal.id).eq("user_id", user.id).select().single();
    if (error) { setNotice("We couldn't update that goal. Please try again."); return; }
    setGoals((current) => current.map((item) => item.id === data.id ? data : item));
  }

  return <AppShell><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Plan the work</p><h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Goals</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Track the financial, trading, and habit goals that give each review period a clear standard.</p></div><button type="button" onClick={openForm} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"><Plus size={17} /> Create goal</button></div>{notice && <p role="status" className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">{notice}</p>}<section className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{goalTypes.map((type) => { const count = activeGoals.filter((goal) => goal.type === type).length; return <article key={type} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Flag className="text-[var(--accent)]" size={20} /><h2 className="mt-6 text-base font-medium capitalize">{type} goals</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{count ? `${count} active ${count === 1 ? "goal" : "goals"}.` : `No active ${type} goals.`}</p></article>; })}</section><section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-medium">Goal board</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Mark a goal complete when the review period gives you the evidence.</p></div><Target className="shrink-0 text-[var(--accent)]" size={21} /></div>{goals.length ? <div className="mt-6 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">{goals.map((goal) => <div key={goal.id} className="flex items-start gap-4 py-4"><button type="button" onClick={() => toggleGoal(goal)} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${goal.status === "completed" ? "border-[var(--accent)] bg-[var(--accent)] text-[#17130d]" : "border-[var(--text-muted)] text-transparent"}`} aria-label={`Mark ${goal.title} as ${goal.status === "completed" ? "active" : "complete"}`}><Check size={14} /></button><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${goal.status === "completed" ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}`}>{goal.title}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]"><span className="capitalize">{goal.type}</span>{goal.target_date && <span>Target {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${goal.target_date}T00:00:00`))}</span>}</div>{goal.notes && <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{goal.notes}</p>}</div></div>)}</div> : <div className="py-12 text-center"><Circle className="mx-auto text-[var(--accent)]" size={23} /><h2 className="mt-5 text-lg font-medium">Your goal board is empty.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Add one goal with a clear enough finish line to review honestly.</p><button type="button" onClick={openForm} className="mt-6 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]">Start with one goal</button></div>}</section></main>{isFormOpen && <div className="fixed inset-0 z-30 flex items-end bg-black/65 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="goal-form-title"><form onSubmit={saveGoal} className="w-full max-w-lg rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-2xl sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Plan the work</p><h2 id="goal-form-title" className="mt-2 text-2xl font-medium">Create goal</h2></div><button type="button" onClick={() => setIsFormOpen(false)} className="grid size-10 place-items-center rounded-full border border-[var(--border)]" aria-label="Close goal form"><X size={18} /></button></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Goal<input autoFocus required name="title" value={form.title} onChange={update} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="e.g. Follow my pre-trade checklist every session" /></label><label className="text-sm font-medium">Type<select name="type" value={form.type} onChange={update} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]">{goalTypes.map((type) => <option key={type} value={type} className="capitalize">{type}</option>)}</select></label><label className="text-sm font-medium">Target date <span className="font-normal text-[var(--text-muted)]">(optional)</span><input type="date" name="target_date" value={form.target_date} onChange={update} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /></label><label className="text-sm font-medium sm:col-span-2">Notes <span className="font-normal text-[var(--text-muted)]">(optional)</span><textarea name="notes" value={form.notes} onChange={update} rows="3" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="What would make this goal complete?" /></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]">Cancel</button><button type="submit" className="min-h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]">Save goal</button></div></form></div>}</AppShell>;
}

export default GoalsPage;
