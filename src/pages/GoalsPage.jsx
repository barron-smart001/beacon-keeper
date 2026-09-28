import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Circle,
  Flag,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AppShell from "../components/app/AppShell";
import UpgradeModal from "../components/subscription/UpgradeModal";
import { useAuth } from "../hooks/useAuth";
import useSubscription from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";

const goalTypes = [
  "daily",
  "weekly",
  "monthly",
  "trading",
  "financial",
  "habit",
];

const initialForm = {
  title: "",
  type: "daily",
  target_date: "",
  notes: "",
};

function GoalsPage() {
  const { user } = useAuth();
  const { isSubscribed, isLoading } = useSubscription();

  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadGoals() {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("target_date", {
          ascending: true,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (!mounted) return;

      if (error) {
        setNotice(
          "We couldn't load your goals. Please refresh and try again."
        );
      } else {
        setGoals(data ?? []);
      }
    }

    if (user?.id) {
      loadGoals();
    }

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === "active"),
    [goals]
  );

  function update(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function openForm() {
    if (isLoading) return;

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      return;
    }

    setForm(initialForm);
    setEditingGoal(null);
    setIsFormOpen(true);
  }

  function openEdit(goal) {
    if (isLoading) return;

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      return;
    }

    setEditingGoal(goal);

    setForm({
      title: goal.title,
      type: goal.type,
      target_date: goal.target_date
        ? goal.target_date.split("T")[0]
        : "",
      notes: goal.notes ?? "",
    });

    setIsFormOpen(true);
  }

  async function saveGoal(event) {
    event.preventDefault();

    if (isLoading) return;

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      return;
    }

    const title = form.title.trim();

    if (!title) return;

    setNotice("");

    const payload = {
      user_id: user.id,
      title,
      type: form.type,
      target_date: form.target_date || null,
      notes: form.notes.trim() || null,
    };

    const query = editingGoal
      ? supabase
          .from("goals")
          .update(payload)
          .eq("id", editingGoal.id)
          .eq("user_id", user.id)
      : supabase.from("goals").insert(payload);

    const { data, error } = await query.select().single();

    if (error) {
      setNotice("We couldn't save that goal. Please try again.");
      return;
    }

    setGoals((current) =>
      editingGoal
        ? current.map((goal) =>
            goal.id === data.id ? data : goal
          )
        : [...current, data]
    );

    setIsFormOpen(false);
    setEditingGoal(null);
    setForm(initialForm);
  }

  async function toggleGoal(goal) {
    if (isLoading) return;

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      return;
    }

    setNotice("");

    const status =
      goal.status === "completed"
        ? "active"
        : "completed";

    const { data, error } = await supabase
      .from("goals")
      .update({ status })
      .eq("id", goal.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      setNotice("We couldn't update that goal. Please try again.");
      return;
    }

    setGoals((current) =>
      current.map((item) =>
        item.id === data.id ? data : item
      )
    );
  }

  async function deleteGoal(goalId) {
    if (isLoading) return;

    if (!isSubscribed) {
      setShowUpgradeModal(true);
      return;
    }

    setNotice("");

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", user.id);

    if (error) {
      setNotice("We couldn't remove that goal. Please try again.");
      return;
    }

    setGoals((current) =>
      current.filter((goal) => goal.id !== goalId)
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Plan the work
            </p>

            <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
              Goals
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Track the financial, trading, and habit goals that give
              each review period a clear standard.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition-colors hover:bg-[var(--accent-light)]"
          >
            <Plus size={17} />
            Create goal
          </button>
        </div>

        {notice && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]"
          >
            {notice}
          </p>
        )}

        <section className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goalTypes.map((type) => {
            const count = activeGoals.filter(
              (goal) => goal.type === type
            ).length;

            return (
              <article
                key={type}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <Flag
                  className="text-[var(--accent)]"
                  size={20}
                />

                <h2 className="mt-6 text-base font-medium capitalize">
                  {type} goals
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {count
                    ? `${count} active ${
                        count === 1 ? "goal" : "goals"
                      }.`
                    : `No active ${type} goals.`}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-medium">
                Goal board
              </h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Mark a goal complete when the review period gives you
                the evidence.
              </p>
            </div>

            <Target
              className="shrink-0 text-[var(--accent)]"
              size={21}
            />
          </div>

          {goals.length ? (
            <div className="mt-6 space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-4"
                >
                  <button
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${
                      goal.status === "completed"
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[#17130d]"
                        : "border-[var(--text-muted)] text-transparent"
                    }`}
                    aria-label={
                      goal.status === "completed"
                        ? `Mark ${goal.title} active`
                        : `Mark ${goal.title} complete`
                    }
                  >
                    {goal.status === "completed" ? (
                      <Check size={14} />
                    ) : (
                      <Circle size={14} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">
                        {goal.title}
                      </h3>

                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        {goal.type}
                      </span>
                    </div>

                    {goal.notes && (
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {goal.notes}
                      </p>
                    )}

                    {goal.target_date && (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Target date:{" "}
                        {new Date(
                          goal.target_date
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                      aria-label={`Edit goal: ${goal.title}`}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--danger)]"
                      aria-label={`Delete goal: ${goal.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] p-5 text-sm text-[var(--text-secondary)]">
              No goals yet. Create one to start tracking your next
              milestone.
            </div>
          )}
        </section>
      </main>

      {createPortal(
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.22,
                ease: "easeOut",
              }}
              className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-[#070b10]/75 p-4 backdrop-blur-md sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="goal-form-title"
              onClick={() => setIsFormOpen(false)}
            >
              <motion.form
                initial={{
                  opacity: 0,
                  scale: 0.96,
                  y: 14,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: 12,
                }}
                transition={{
                  duration: 0.24,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={(event) =>
                  event.stopPropagation()
                }
                onSubmit={saveGoal}
                className="relative my-auto w-full max-w-[560px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,201,92,0.12),_transparent_58%)]" />

                <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto p-5 sm:max-h-[calc(100vh-3rem)] sm:p-7">
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-5">
                    <div className="flex items-start gap-3.5">
                      <div className="grid size-11 place-items-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--surface-elevated)] text-[var(--accent)] shadow-[0_0_0_1px_rgba(230,176,74,0.08)]">
                        <Target size={19} />
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                          Plan the work
                        </p>

                        <h2
                          id="goal-form-title"
                          className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[var(--text-primary)]"
                        >
                          {editingGoal
                            ? "Edit goal"
                            : "Create goal"}
                        </h2>

                        <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                          {editingGoal
                            ? "Update your target and keep your progress on track."
                            : "Set a clear target and keep your trading progress accountable."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                      aria-label="Close goal form"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Goal title
                      </span>

                      <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={update}
                        required
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] shadow-inner shadow-black/5 outline-none transition duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                        placeholder="Example: Grow my daily consistency"
                      />
                    </label>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-[var(--text-primary)]">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                          Type
                        </span>

                        <select
                          name="type"
                          value={form.type}
                          onChange={update}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] shadow-inner shadow-black/5 outline-none transition duration-200 focus:border-[var(--accent)]"
                        >
                          {goalTypes.map((type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-medium text-[var(--text-primary)]">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                          Deadline
                        </span>

                        <input
                          type="date"
                          name="target_date"
                          value={form.target_date}
                          onChange={update}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] shadow-inner shadow-black/5 outline-none transition duration-200 focus:border-[var(--accent)]"
                        />
                      </label>
                    </div>

                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Notes
                      </span>

                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={update}
                        rows="4"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] shadow-inner shadow-black/5 outline-none transition duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                        placeholder="Add context, milestones, or review notes"
                      />
                    </label>
                  </div>

                  <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[var(--border-soft)] pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setIsFormOpen(false)
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 text-sm font-medium text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--surface-elevated)]"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] transition-colors duration-200 hover:bg-[var(--accent-light)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                    >
                      {editingGoal
                        ? "Save changes"
                        : "Create goal"}
                    </button>
                  </div>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </AppShell>
  );
}

export default GoalsPage;