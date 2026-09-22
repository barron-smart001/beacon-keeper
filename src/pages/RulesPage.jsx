import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

import jsPDF from "jspdf";

import AppShell from "../components/app/AppShell";

import { useAuth } from "../hooks/useAuth";

import { supabase } from "../lib/supabase";

const starterChecklist = [
  "Higher timeframe bias confirmed",
  "Risk is acceptable",
  "Stop loss is defined",
  "Setup matches my plan",
];

function RulesPage() {
  const { user } = useAuth();

  const [rules, setRules] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRules() {
      const { data, error } = await supabase
        .from("trading_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setNotice(
          "We couldn't load your rules. Please refresh and try again."
        );
      } else {
        setRules(data ?? []);
      }
    }

    if (user?.id) {
      loadRules();
    }

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  function openCreate() {
    setDraft("");
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEdit(rule) {
    setDraft(rule.description);
    setEditingId(rule.id);
    setIsFormOpen(true);
  }

  async function saveRule(event) {
    event.preventDefault();

    const description = draft.trim();

    if (!description) return;

    setNotice("");

    const query = editingId
      ? supabase
          .from("trading_rules")
          .update({ description })
          .eq("id", editingId)
          .eq("user_id", user.id)
      : supabase
          .from("trading_rules")
          .insert({
            user_id: user.id,
            description,
          });

    const { data, error } = await query.select().single();

    if (error) {
      setNotice("We couldn't save that rule. Please try again.");
      return;
    }

    setRules((current) =>
      editingId
        ? current.map((rule) =>
            rule.id === editingId ? data : rule
          )
        : [data, ...current]
    );

    setIsFormOpen(false);
  }

  async function deleteRule(id) {
    setNotice("");

    const { error } = await supabase
      .from("trading_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setNotice("We couldn't remove that rule. Please try again.");
      return;
    }

    setRules((current) =>
      current.filter((rule) => rule.id !== id)
    );
  }

  async function downloadRulesAsPDF() {
    if (!rules.length) return;

    setIsDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      let y = 24;

      // Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text("Meridian", margin, y);

      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Trading Rules & Accountability", margin, y);

      y += 12;

      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y, pageWidth - margin, y);

      y += 12;

      // Intro
      pdf.setTextColor(40, 40, 40);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const intro =
        "Your personal trading rules and checklist. Use these rules to review your process before and after each trade.";

      const introLines = pdf.splitTextToSize(
        intro,
        contentWidth
      );

      pdf.text(introLines, margin, y);

      y += introLines.length * 5 + 10;

      // Rules
      rules.forEach((rule, index) => {
        const ruleNumber = `${index + 1}.`;
        const ruleText = rule.description || "";

        const textX = margin + 10;
        const availableWidth = contentWidth - 10;

        const ruleLines = pdf.splitTextToSize(
          ruleText,
          availableWidth
        );

        // Start new page if necessary
        const estimatedHeight =
          12 + ruleLines.length * 5;

        if (y + estimatedHeight > pageHeight - 25) {
          pdf.addPage();
          y = 24;
        }

        // Rule number
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(35, 35, 35);

        pdf.text(ruleNumber, margin, y);

        // Rule text
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        pdf.text(ruleLines, textX, y);

        y += ruleLines.length * 5 + 8;

        // Divider
        if (index < rules.length - 1) {
          pdf.setDrawColor(235, 235, 235);
          pdf.line(
            margin,
            y - 3,
            pageWidth - margin,
            y - 3
          );

          y += 5;
        }
      });

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();

      for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);

        pdf.text(
          "Created with Meridian",
          margin,
          pageHeight - 12
        );

        pdf.text(
          `Page ${page} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 12,
          {
            align: "right",
          }
        );
      }

      pdf.save("meridian-trading-rules.pdf");
    } catch (error) {
      console.error("PDF generation failed:", error);

      setNotice(
        "We couldn't generate the PDF. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  }

  const displayedRules = rules.length
    ? rules
    : starterChecklist.map((description) => ({
        description,
      }));

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Trading accountability
            </p>

            <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
              Rules
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Create the personal rules and checklist items that make
              your trading process reviewable.
            </p>
          </div>

          {/* Only show Add Rule before the user has created rules */}
         <button
  type="button"
  onClick={openCreate}
  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"
>
  <Plus size={17} />
  Add rule
</button>
        </div>

        {/* Notice */}
        {notice && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]"
          >
            {notice}
          </p>
        )}

        {/* EMPTY STATE */}
        {!rules.length ? (
          <section className="mt-9 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            {/* Intro card */}
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
              <ShieldCheck
                className="text-[var(--accent)]"
                size={22}
              />

              <h2 className="mt-7 text-lg font-medium">
                No rules saved yet.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Start with one rule you can confirm before or after a
                trade. Meridian will use these records to calculate
                adherence once rule tracking is connected.
              </p>

              <button
                type="button"
                onClick={openCreate}
                className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-light)] hover:text-[var(--accent)]"
              >
                Create a rule
                <Plus size={15} />
              </button>
            </article>

            {/* Starter checklist */}
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-5">
                <div>
                  <h2 className="text-base font-medium">
                    Pre-trade checklist
                  </h2>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    A starter structure for your process.
                  </p>
                </div>

                <ClipboardCheck
                  className="text-[var(--accent)]"
                  size={21}
                />
              </div>

              <div className="mt-5 space-y-2">
                {displayedRules.map((rule) => (
                  <div
                    key={rule.description}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-3"
                  >
                    <span className="text-sm text-[var(--text-secondary)]">
                      {rule.description}
                    </span>

                    <CheckCircle2
                      size={18}
                      className="shrink-0 text-[var(--text-muted)]"
                    />
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : (
          /* SAVED RULES - FULL WIDTH */
          <section className="mt-9">
            <article className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 lg:p-7">
              {/* Rules header */}
              <div className="flex flex-col gap-5 border-b border-[var(--border-soft)] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--bg)]">
                    <ClipboardCheck
                      className="text-[var(--accent)]"
                      size={21}
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-medium">
                      Your trading rules
                    </h2>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {rules.length}{" "}
                      {rules.length === 1 ? "rule" : "rules"} saved
                      to your Meridian account.
                    </p>
                  </div>
                </div>

                {/* PDF button */}
                <button
                  type="button"
                  onClick={downloadRulesAsPDF}
                  disabled={isDownloading}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />

                  {isDownloading
                    ? "Preparing PDF..."
                    : "Download PDF"}
                </button>
              </div>

              {/* Rules list */}
              <div className="mt-6 space-y-3">
                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="group flex items-start gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] px-4 py-4 transition hover:border-[var(--border)] sm:px-5"
                  >
                    {/* Number */}
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--accent)]">
                      {index + 1}
                    </div>

                    {/* Rule content */}
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm leading-6 text-[var(--text-secondary)]">
                        {rule.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(rule)}
                        className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                        aria-label={`Edit rule: ${rule.description}`}
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteRule(rule.id)}
                        className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--danger)]"
                        aria-label={`Delete rule: ${rule.description}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom information */}
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] p-4">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--accent)]"
                />

                <p className="text-xs leading-5 text-[var(--text-muted)]">
                  These rules represent your personal trading process.
                  Keep them clear and specific so they can be reviewed
                  consistently with your trades.
                </p>
              </div>
            </article>
          </section>
        )}
      </main>

      {/* Rule form modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/65 p-0 sm:items-center sm:justify-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rule-form-title"
        >
          <form
            onSubmit={saveRule}
            className="w-full max-w-lg rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Trading accountability
                </p>

                <h2
                  id="rule-form-title"
                  className="mt-2 text-2xl font-medium"
                >
                  {editingId ? "Edit rule" : "Add a rule"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="grid size-10 place-items-center rounded-full border border-[var(--border)]"
                aria-label="Close rule form"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mt-7 block text-sm font-medium">
              Rule

              <textarea
                autoFocus
                required
                value={draft}
                onChange={(event) =>
                  setDraft(event.target.value)
                }
                rows="4"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                placeholder="e.g. Risk no more than 1% on a single trade"
              />
            </label>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="min-h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"
              >
                Save rule
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

export default RulesPage;