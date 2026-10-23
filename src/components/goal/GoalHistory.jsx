import { RotateCcw, Target, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { ScrollReveal } from "../motion/ScrollReveal";

function GoalHistory() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyGoalId, setBusyGoalId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Unable to load completed goals:", error);
        setNotice("We couldn't load your goal history. Please try again.");
      } else {
        setGoals(data ?? []);
      }
      setIsLoading(false);
    }

    if (user?.id) loadHistory();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function reopenGoal(goal) {
    if (!user?.id || busyGoalId) return;

    setBusyGoalId(goal.id);
    setNotice("");
    const { error } = await supabase
      .from("goals")
      .update({ status: "active" })
      .eq("id", goal.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Unable to reopen completed goal:", error);
      setNotice("We couldn't move that goal back to active. Please try again.");
    } else {
      setGoals((current) => current.filter((item) => item.id !== goal.id));
    }
    setBusyGoalId(null);
  }

  async function deleteGoal(goal) {
    if (!user?.id || busyGoalId) return;

    setBusyGoalId(goal.id);
    setNotice("");
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goal.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Unable to delete completed goal:", error);
      setNotice("We couldn't remove that goal. Please try again.");
    } else {
      setGoals((current) => current.filter((item) => item.id !== goal.id));
    }
    setBusyGoalId(null);
  }

  return (
    <ScrollReveal as="section" className="mt-8">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          History
        </p>
      </div>

      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
            <Target size={20} />
          </div>
          <div>
            <h2 className="text-base font-medium">Completed goals</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Goals you’ve marked complete are saved here.
            </p>
          </div>
        </div>

        {notice && (
          <p role="status" className="mt-5 text-sm text-[var(--danger)]">
            {notice}
          </p>
        )}

        {isLoading ? (
          <p className="mt-5 text-sm text-[var(--text-secondary)]">
            Loading goal history…
          </p>
        ) : goals.length ? (
          <ul className="mt-5 space-y-3">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="flex items-start gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] [overflow-wrap:anywhere]">
                      {goal.title}
                    </h3>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      {goal.type}
                    </span>
                  </div>
                  {goal.notes && (
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] [overflow-wrap:anywhere]">
                      {goal.notes}
                    </p>
                  )}
                  {goal.target_date && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Target date: {new Date(goal.target_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => reopenGoal(goal)}
                    disabled={busyGoalId !== null}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-50"
                    aria-label={`Move ${goal.title} back to active goals`}
                  >
                    <RotateCcw size={14} />
                    Reopen
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGoal(goal)}
                    disabled={busyGoalId !== null}
                    className="grid size-9 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--danger)] disabled:cursor-wait disabled:opacity-50"
                    aria-label={`Delete completed goal: ${goal.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] p-4 text-sm text-[var(--text-secondary)]">
            No completed goals yet.
          </p>
        )}
      </article>
    </ScrollReveal>
  );
}

export default GoalHistory;
