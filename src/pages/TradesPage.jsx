
import {
  ArrowRight,
  ChevronDown,
  CirclePlus,
  ClipboardCheck,
  Lock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "../components/app/AppShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const initialForm = {
  instrument: "",
  direction: "long",
  entry: "",
  exit: "",
  size: "",
  status: "completed",
  notes: "",
};

function calculatePnl({ direction, entry, exit, size }) {
  const entryValue = Number(entry);
  const exitValue = Number(exit);
  const sizeValue = Number(size);

  if (
    ![entryValue, exitValue, sizeValue].every(Number.isFinite) ||
    sizeValue <= 0 ||
    !exit
  ) {
    return null;
  }

  return (
    (direction === "long"
      ? exitValue - entryValue
      : entryValue - exitValue) * sizeValue
  );
}

function formatPnl(value) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    signDisplay: "always",
  }).format(value);
}

function TradeForm({
  onClose,
  onSave,
  editingTrade,
  isSaving,
}) {
  const [form, setForm] = useState(
    editingTrade
      ? {
          instrument: editingTrade.instrument ?? "",
          direction: editingTrade.direction ?? "long",
          entry: editingTrade.entry ?? "",
          exit: editingTrade.exit ?? "",
          size: editingTrade.size ?? "",
          status: editingTrade.status ?? "completed",
          notes: editingTrade.notes ?? "",
        }
      : initialForm
  );

  const [error, setError] = useState("");
  const pnl = calculatePnl(form);

  function update(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function submit(event) {
    event.preventDefault();

    if (
      !form.instrument.trim() ||
      !form.entry ||
      !form.size ||
      (form.status === "completed" && !form.exit)
    ) {
      setError(
        "Add an instrument, entry, position size, and exit price for a completed trade."
      );
      return;
    }

    if (
      Number(form.entry) <= 0 ||
      Number(form.size) <= 0 ||
      (form.exit && Number(form.exit) <= 0)
    ) {
      setError("Prices and position size must be greater than zero.");
      return;
    }

    setError("");
    onSave({
      ...form,
      pnl,
    });
  }

  const fieldClass =
    "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

  return (
    <div
      className="fixed inset-0 z-30 flex items-end bg-black/65 p-0 sm:items-center sm:justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-form-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {editingTrade ? "Edit record" : "New record"}
            </p>

            <h2
              id="trade-form-title"
              className="mt-2 text-2xl font-medium tracking-[-0.04em]"
            >
              {editingTrade ? "Edit trade" : "Record a trade"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full border border-[var(--border)]"
            aria-label="Close trade form"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">
            Instrument
            <input
              autoFocus
              required
              name="instrument"
              value={form.instrument}
              onChange={update}
              className={fieldClass}
              placeholder="e.g. EUR/USD"
            />
          </label>

          <label className="text-sm font-medium">
            Direction
            <select
              name="direction"
              value={form.direction}
              onChange={update}
              className={fieldClass}
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Status
            <select
              name="status"
              value={form.status}
              onChange={update}
              className={fieldClass}
            >
              <option value="completed">Completed</option>
              <option value="active">Active</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Entry price
            <input
              required
              min="0"
              step="any"
              inputMode="decimal"
              name="entry"
              value={form.entry}
              onChange={update}
              className={fieldClass}
              placeholder="0.00"
            />
          </label>

          <label className="text-sm font-medium">
            {form.status === "completed"
              ? "Exit price"
              : "Current price (optional)"}
            <input
              required={form.status === "completed"}
              min="0"
              step="any"
              inputMode="decimal"
              name="exit"
              value={form.exit}
              onChange={update}
              className={fieldClass}
              placeholder="0.00"
            />
          </label>

          <label className="text-sm font-medium sm:col-span-2">
            Position size
            <input
              required
              min="0"
              step="any"
              inputMode="decimal"
              name="size"
              value={form.size}
              onChange={update}
              className={fieldClass}
              placeholder="0.00"
            />

            <span className="mt-2 block text-xs text-[var(--text-muted)]">
              P/L is calculated as price movement × position size. It does not
              include fees, swaps, or currency conversion.
            </span>
          </label>

          <label className="text-sm font-medium sm:col-span-2">
            Notes{" "}
            <span className="font-normal text-[var(--text-muted)]">
              (optional)
            </span>

            <textarea
              name="notes"
              value={form.notes}
              onChange={update}
              rows="3"
              className={fieldClass}
              placeholder="Setup, execution, or lesson learned"
            />
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs text-[var(--text-muted)]">
            Estimated P/L
          </p>

          <p
            className={`mt-2 font-mono text-lg ${
              pnl !== null && pnl > 0
                ? "text-[var(--success)]"
                : pnl !== null && pnl < 0
                ? "text-[var(--danger)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {formatPnl(pnl)}
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)] disabled:opacity-60"
          >
            {isSaving
              ? "Saving..."
              : editingTrade
              ? "Save changes"
              : "Save trade"}

            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function TradesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [trades, setTrades] = useState([]);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");

  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmTrade, setDeleteConfirmTrade] = useState(null);

  const { user } = useAuth();

  function showToast(message, type = "success") {
    setNotice(message);
    setNoticeType(type);
  }

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;

    async function loadTrades() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        console.error("Trade load error:", error);
        showToast(
          "We couldn't load your trades. Please try again.",
          "error"
        );
      } else {
        setTrades(data ?? []);
      }
    }

    loadTrades();

    return () => {
      active = false;
    };
  }, [user?.id]);

  function openNewTrade() {
    setEditingTrade(null);
    setFormOpen(true);
  }

  function openEditTrade(trade) {
    if (trade.edit_count >= 1) {
      showToast(
        "This trade has already been edited and is now locked.",
        "error"
      );
      return;
    }

    setEditingTrade(trade);
    setFormOpen(true);
  }

  async function saveTrade(trade) {
    if (!user?.id) {
      showToast("You must be signed in before recording a trade.", "error");
      return;
    }

    setIsSaving(true);

    try {
      if (editingTrade) {
        const { data, error } = await supabase
          .from("trades")
          .update({
            instrument: trade.instrument.trim(),
            direction: trade.direction,
            status: trade.status,
            entry: Number(trade.entry),
            exit: trade.exit ? Number(trade.exit) : null,
            size: Number(trade.size),
            pnl: trade.pnl,
            notes: trade.notes.trim() || null,
            edit_count: 1,
          })
          .eq("id", editingTrade.id)
          .eq("user_id", user.id)
          .eq("edit_count", 0)
          .select()
          .single();

        if (error) {
          console.error("Trade update error:", error);

          showToast(
            "This trade could not be edited. It may already be locked.",
            "error"
          );

          return;
        }

        setTrades((current) =>
          current.map((item) =>
            item.id === editingTrade.id ? data : item
          )
        );

        setFormOpen(false);
        setEditingTrade(null);

        showToast(
          "Trade updated successfully. This record is now locked."
        );

        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .insert({
          user_id: user.id,
          instrument: trade.instrument.trim(),
          direction: trade.direction,
          status: trade.status,
          entry: Number(trade.entry),
          exit: trade.exit ? Number(trade.exit) : null,
          size: Number(trade.size),
          pnl: trade.pnl,
          notes: trade.notes.trim() || null,
          edit_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Trade save error:", error);

        showToast(
          "We couldn't save your trade. Please try again.",
          "error"
        );

        return;
      }

      setTrades((current) => [data, ...current]);
      setFormOpen(false);

      showToast("Trade saved successfully.");
    } finally {
      setIsSaving(false);
    }
  }

  function deleteTrade(trade) {
    if (trade.edit_count >= 1) {
      showToast(
        "This trade has already been edited and cannot be deleted.",
        "error"
      );
      return;
    }

    setDeleteConfirmTrade(trade);
  }

  async function confirmDeleteTrade() {
    if (!deleteConfirmTrade || !user?.id) return;

    const trade = deleteConfirmTrade;
    setDeletingId(trade.id);

    try {
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", trade.id)
        .eq("user_id", user.id)
        .eq("edit_count", 0);

      if (error) {
        console.error("Trade delete error:", error);

        showToast(
          "We couldn't delete this trade. It may already be locked.",
          "error"
        );

        return;
      }

      setTrades((current) =>
        current.filter((item) => item.id !== trade.id)
      );

      setDeleteConfirmTrade(null);
      showToast("Trade deleted successfully.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Trading journal
            </p>

            <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
              Trades
            </h1>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Record the decision, not just the outcome.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewTrade}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"
          >
            <CirclePlus size={17} />
            Record a trade
          </button>
        </div>

        <section className="mt-9 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-medium">
                Trade history
              </h2>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Your recorded trades
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
            >
              All statuses
              <ChevronDown size={14} />
            </button>
          </div>

          {trades.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6">
              <ClipboardCheck
                className="mx-auto text-[var(--accent)]"
                size={24}
              />

              <p className="mt-5 text-sm text-[var(--text-secondary)]">
                No trades recorded yet.
              </p>

              <button
                type="button"
                onClick={openNewTrade}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]"
              >
                Record your first trade
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-[var(--border-soft)] text-xs text-[var(--text-muted)]">
                  <tr>
                    <th className="px-5 py-3 font-medium sm:px-6">
                      Instrument
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Direction
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Status
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Entry / Exit
                    </th>

                    <th className="px-5 py-3 text-right font-medium sm:px-6">
                      P/L
                    </th>

                    <th className="px-5 py-3 text-right font-medium sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {trades.map((trade) => {
                    const locked = trade.edit_count >= 1;

                    return (
                      <tr
                        key={trade.id}
                        className="border-b border-[var(--border-soft)] last:border-0"
                      >
                        <td className="px-5 py-4 font-medium sm:px-6">
                          {trade.instrument}
                        </td>

                        <td className="px-5 py-4 capitalize text-[var(--text-secondary)]">
                          {trade.direction}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs capitalize text-[var(--text-secondary)]">
                            {trade.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-[var(--text-secondary)]">
                          {trade.entry}
                          {trade.exit ? ` / ${trade.exit}` : ""}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-mono sm:px-6 ${
                            trade.pnl !== null && trade.pnl > 0
                              ? "text-[var(--success)]"
                              : trade.pnl !== null && trade.pnl < 0
                              ? "text-[var(--danger)]"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {formatPnl(trade.pnl)}
                        </td>

                        <td className="px-5 py-4 sm:px-6">
                          {locked ? (
                            <div className="flex items-center justify-end gap-1.5 text-xs text-[var(--text-muted)]">
                              <Lock size={13} />
                              Locked
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditTrade(trade)}
                                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteTrade(trade)}
                                disabled={deletingId === trade.id}
                                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <Trash2 size={14} />

                                {deletingId === trade.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {formOpen && (
        <TradeForm
          onClose={() => {
            setFormOpen(false);
            setEditingTrade(null);
          }}
          onSave={saveTrade}
          editingTrade={editingTrade}
          isSaving={isSaving}
        />
      )}

      {deleteConfirmTrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-trade-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) {
              setDeleteConfirmTrade(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--danger)]">
                <Trash2 size={18} />
              </div>

              <button
                type="button"
                onClick={() => setDeleteConfirmTrade(null)}
                disabled={Boolean(deletingId)}
                className="grid size-9 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close delete confirmation"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Delete record
              </p>

              <h2
                id="delete-trade-title"
                className="mt-2 text-2xl font-medium tracking-[-0.04em]"
              >
                Delete this trade?
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                This will permanently remove
                {deleteConfirmTrade.instrument
                  ? ` ${deleteConfirmTrade.instrument}`
                  : " this trade"}
                {" from your journal. This action cannot be undone."}
              </p>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmTrade(null)}
                disabled={Boolean(deletingId)}
                className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep trade
              </button>

              <button
                type="button"
                onClick={confirmDeleteTrade}
                disabled={Boolean(deletingId)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--danger)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={15} />
                {deletingId === deleteConfirmTrade.id
                  ? "Deleting..."
                  : "Delete trade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 size-2 shrink-0 rounded-full ${
                noticeType === "error"
                  ? "bg-[var(--danger)]"
                  : "bg-[var(--success)]"
              }`}
            />

            <p>{notice}</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default TradesPage;

