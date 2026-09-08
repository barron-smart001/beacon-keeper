import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import AppShell from "../../components/app/AppShell";
import { supabase } from "../../lib/supabase";

const EMPTY_FORM = {
  type: "income",
  amount: "",
  category: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
};

const MoneyPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [currency, setCurrency] = useState("USD");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // ---------------------------------------------------------
  // LOAD USER DATA
  // ---------------------------------------------------------

  useEffect(() => {
    loadMoneyData();
  }, []);

  async function loadMoneyData() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You need to be signed in.");
      }

      const [transactionsResult, profileResult] = await Promise.all([
        supabase
          .from("money_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("default_currency")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (transactionsResult.error) {
        throw transactionsResult.error;
      }

      setTransactions(transactionsResult.data ?? []);

      if (profileResult.data?.default_currency) {
        setCurrency(profileResult.data.default_currency);
      }
    } catch (err) {
      console.error("Failed to load money data:", err);

      setError(
        err?.message ||
          "Something went wrong while loading your financial records."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // TOTALS
  // ---------------------------------------------------------

  const totals = useMemo(() => {
    return transactions.reduce(
      (result, transaction) => {
        const amount = Number(transaction.amount) || 0;

        if (transaction.type === "income") {
          result.income += amount;
        }

        if (transaction.type === "expense") {
          result.expenses += amount;
        }

        return result;
      },
      {
        income: 0,
        expenses: 0,
      }
    );
  }, [transactions]);

  const balance = totals.income - totals.expenses;

  // ---------------------------------------------------------
  // CURRENCY FORMATTER
  // ---------------------------------------------------------

  function formatAmount(amount) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(Number(amount) || 0);
    } catch {
      return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
    }
  }

  // ---------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------

  function openCreateModal() {
    setEditingTransaction(null);

    setFormData({
      ...EMPTY_FORM,
      date: new Date().toISOString().split("T")[0],
    });

    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(transaction) {
    setEditingTransaction(transaction);

    setFormData({
      type: transaction.type,
      amount: transaction.amount?.toString() ?? "",
      category: transaction.category ?? "",
      date: transaction.transaction_date,
      description: transaction.description ?? "",
    });

    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingTransaction(null);
    setFormError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (formError) {
      setFormError("");
    }
  }

  // ---------------------------------------------------------
  // CREATE / UPDATE
  // ---------------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (!formData.date) {
      setFormError("Choose a transaction date.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You need to be signed in.");
      }

      const transactionData = {
        user_id: user.id,
        type: formData.type,
        amount,
        category: formData.category.trim() || null,
        description: formData.description.trim() || null,
        transaction_date: formData.date,
        updated_at: new Date().toISOString(),
      };

      // EDIT
      if (editingTransaction) {
        const { data, error: updateError } = await supabase
          .from("money_transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setTransactions((current) =>
          current
            .map((transaction) =>
              transaction.id === data.id ? data : transaction
            )
            .sort(sortTransactions)
        );
      }

      // CREATE
      else {
        const { data, error: insertError } = await supabase
          .from("money_transactions")
          .insert(transactionData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setTransactions((current) =>
          [data, ...current].sort(sortTransactions)
        );
      }

      closeModalAfterSave();
    } catch (err) {
      console.error("Failed to save transaction:", err);

      setFormError(
        err?.message || "We couldn't save this transaction. Try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function closeModalAfterSave() {
    setModalOpen(false);
    setEditingTransaction(null);

    setFormData({
      ...EMPTY_FORM,
      date: new Date().toISOString().split("T")[0],
    });

    setFormError("");
  }

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  async function deleteTransaction(transaction) {
    const shouldDelete = window.confirm(
      `Delete this ${transaction.type} transaction?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(transaction.id);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You need to be signed in.");
      }

      const { error: deleteError } = await supabase
        .from("money_transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id)
      );
    } catch (err) {
      console.error("Failed to delete transaction:", err);

      setError(
        err?.message || "We couldn't delete the transaction. Try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ---------------------------------------------------------
  // SORTING
  // ---------------------------------------------------------

  function sortTransactions(a, b) {
    const dateA = new Date(`${a.transaction_date}T00:00:00`);
    const dateB = new Date(`${b.transaction_date}T00:00:00`);

    if (dateB.getTime() !== dateA.getTime()) {
      return dateB - dateA;
    }

    return new Date(b.created_at) - new Date(a.created_at);
  }

  // ---------------------------------------------------------
  // DATE
  // ---------------------------------------------------------

  function formatDate(date) {
    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <AppShell>
      <main className="px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">
                Financial record
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Money
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                Keep track of the money coming in and going out of your trading
                life.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[#0A0A0C] transition hover:bg-[var(--accent-light)]"
            >
              <Plus size={17} />
              Add transaction
            </button>
          </div>

          {/* Error */}

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-[var(--danger)]"
              />

              <div className="flex-1">
                <p className="text-sm text-[var(--text-primary)]">{error}</p>

                <button
                  type="button"
                  onClick={loadMoneyData}
                  className="mt-2 text-xs font-medium text-[var(--accent)]"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Financial overview */}

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={Wallet}
              label="Net balance"
              value={formatAmount(balance)}
              variant="balance"
              secondary="Current"
            />

            <MetricCard
              icon={ArrowUpRight}
              label="Money in"
              value={formatAmount(totals.income)}
              variant="income"
            />

            <MetricCard
              icon={ArrowDownLeft}
              label="Money out"
              value={formatAmount(totals.expenses)}
              variant="expense"
            />
          </section>

          {/* Transactions */}

          <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Recent transactions
                </h2>

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Your recorded income and expenses.
                </p>
              </div>

              <CircleDollarSign
                size={18}
                className="text-[var(--text-muted)]"
              />
            </div>

            {loading ? (
              <div className="grid min-h-64 place-items-center">
                <div className="text-center">
                  <Loader2
                    size={22}
                    className="mx-auto animate-spin text-[var(--accent)]"
                  />

                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    Loading your records...
                  </p>
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState onAdd={openCreateModal} />
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    formatAmount={formatAmount}
                    formatDate={formatDate}
                    onEdit={openEditModal}
                    onDelete={deleteTransaction}
                    deleting={deletingId === transaction.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {modalOpen && (
        <TransactionModal
          formData={formData}
          editing={Boolean(editingTransaction)}
          saving={saving}
          error={formError}
          onChange={handleChange}
          onSetType={(type) =>
            setFormData((current) => ({
              ...current,
              type,
            }))
          }
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </AppShell>
  );
};

// =========================================================
// METRIC CARD
// =========================================================

function MetricCard({
  icon: Icon,
  label,
  value,
  variant,
  secondary,
}) {
  const iconClass =
    variant === "income"
      ? "text-[var(--success)]"
      : variant === "expense"
        ? "text-[var(--danger)]"
        : "text-[var(--accent)]";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <div className="grid size-10 place-items-center rounded-xl border border-[var(--border)]">
          <Icon size={18} className={iconClass} />
        </div>

        {secondary && (
          <span className="text-xs text-[var(--text-muted)]">
            {secondary}
          </span>
        )}
      </div>

      <p className="mt-6 text-sm text-[var(--text-secondary)]">{label}</p>

      <p className="mt-1 font-mono text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({ onAdd }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]">
        <CircleDollarSign size={20} className="text-[var(--accent)]" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
        No transactions yet
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        Record your first income or expense to start building your financial
        history.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
      >
        <Plus size={16} />

        Add your first transaction
      </button>
    </div>
  );
}

// =========================================================
// TRANSACTION ROW
// =========================================================

function TransactionRow({
  transaction,
  formatAmount,
  formatDate,
  onEdit,
  onDelete,
  deleting,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isIncome = transaction.type === "income";

  return (
    <div className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--surface-elevated)]/40">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]">
          {isIncome ? (
            <ArrowUpRight size={17} className="text-[var(--success)]" />
          ) : (
            <ArrowDownLeft size={17} className="text-[var(--danger)]" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {transaction.category ||
                (isIncome ? "Income" : "Expense")}
            </p>

            <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
              ·
            </span>

            <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
              {formatDate(transaction.transaction_date)}
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {transaction.description ||
              formatDate(transaction.transaction_date)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <p
          className={`font-mono text-sm font-semibold ${
            isIncome
              ? "text-[var(--success)]"
              : "text-[var(--danger)]"
          }`}
        >
          {isIncome ? "+" : "-"}
          {formatAmount(transaction.amount)}
        </p>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            disabled={deleting}
            className="grid size-9 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:opacity-50"
            aria-label="Transaction options"
          >
            {deleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MoreHorizontal size={17} />
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(transaction);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              >
                <Pencil size={14} />
                Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(transaction);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--danger)] transition hover:bg-[var(--surface)]"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// MODAL
// =========================================================

function TransactionModal({
  formData,
  editing,
  saving,
  error,
  onChange,
  onSetType,
  onClose,
  onSubmit,
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 px-5 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
          <div>
            <h2
              id="transaction-modal-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              {editing ? "Edit transaction" : "Add transaction"}
            </h2>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {editing
                ? "Update this financial record."
                : "Record money coming in or going out."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid size-9 place-items-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
            aria-label="Close transaction form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3">
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0 text-[var(--danger)]"
              />

              <p className="text-xs leading-5 text-[var(--text-secondary)]">
                {error}
              </p>
            </div>
          )}

          {/* Type */}

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Type
            </label>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <TypeButton
                active={formData.type === "income"}
                onClick={() => onSetType("income")}
              >
                <ArrowUpRight size={16} />
                Income
              </TypeButton>

              <TypeButton
                active={formData.type === "expense"}
                onClick={() => onSetType("expense")}
              >
                <ArrowDownLeft size={16} />
                Expense
              </TypeButton>
            </div>
          </div>

          {/* Amount */}

          <div>
            <label
              htmlFor="amount"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Amount
            </label>

            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={onChange}
              placeholder="0.00"
              required
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 font-mono text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </div>

          {/* Category */}

          <div>
            <label
              htmlFor="category"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Category
            </label>

            <input
              id="category"
              name="category"
              type="text"
              value={formData.category}
              onChange={onChange}
              maxLength={80}
              placeholder={
                formData.type === "income"
                  ? "e.g. Trading profit, salary"
                  : "e.g. Trading fee, data, transport"
              }
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </div>

          {/* Date */}

          <div>
            <label
              htmlFor="date"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Date
            </label>

            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={onChange}
              required
              className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </div>

          {/* Description */}

          <div>
            <label
              htmlFor="description"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={onChange}
              maxLength={500}
              rows={3}
              placeholder="Add an optional note..."
              className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </div>

          {/* Buttons */}

          <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[#0A0A0C] transition hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}

              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Save transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TypeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
        active
          ? "border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--accent-light)]"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

export default MoneyPage;