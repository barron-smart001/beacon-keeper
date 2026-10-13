import {
  AlertCircle,
  CheckCircle2,
  Link2,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAccounts } from "../../hooks/useAccounts";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

const CONNECTION_COLUMNS =
  "id, account_id, broker, platform, provider, login, server, status, last_error_message, last_synced_at, last_sync_status";

const STATUS_STYLES = {
  connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  pending: "border-[var(--border)] text-[var(--text-secondary)]",
  error: "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]",
};

const STATUS_LABELS = {
  connected: "Connected",
  pending: "Connecting",
  error: "Needs attention",
};

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

/** Turns a failed Edge Function call into a short, safe message. */
async function describeFunctionError(error) {
  try {
    const body = await error?.context?.json?.();
    if (body?.message && typeof body.message === "string") {
      return body.message.slice(0, 300);
    }
  } catch {
    // Fall through to the generic message.
  }

  if (error?.name === "FunctionsFetchError" || error?.context?.status === 404) {
    return "The broker connection service isn't available yet. Nothing was connected.";
  }

  return "Something went wrong. Nothing was changed. Please try again.";
}

function formatTime(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function BrokerConnections({ isSubscribed, subscriptionLoading, onRequireUpgrade }) {
  const { user } = useAuth();
  const { accounts, refresh: refreshAccounts } = useAccounts();

  const [connections, setConnections] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | unavailable
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ account_id: "", login: "", server: "", password: "" });
  const [isConnecting, setIsConnecting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null); // { type, text }
  const [lastRuns, setLastRuns] = useState({});

  const accountName = (id) =>
    accounts.find((account) => account.id === id)?.name ?? "Unassigned";

  const load = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("broker_connections")
      .select(CONNECTION_COLUMNS)
      .eq("user_id", user.id)
      .neq("status", "disconnected")
      .order("created_at", { ascending: false });

    if (error) {
      // The table only exists once the broker migration has been applied.
      console.error("Unable to load broker connections.", error);
      setLoadState("unavailable");
      return;
    }

    setConnections(data ?? []);
    setLoadState("ready");

    if (data?.length) {
      const { data: runs } = await supabase
        .from("broker_sync_runs")
        .select("connection_id, status, deals_imported, trades_upserted, started_at")
        .in("connection_id", data.map((item) => item.id))
        .order("started_at", { ascending: false });

      const latest = {};
      (runs ?? []).forEach((run) => {
        if (!latest[run.connection_id]) latest[run.connection_id] = run;
      });
      setLastRuns(latest);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  function openForm() {
    if (subscriptionLoading) return;
    if (!isSubscribed) {
      onRequireUpgrade();
      return;
    }

    setMessage(null);
    setForm({ account_id: accounts[0]?.id ?? "", login: "", server: "", password: "" });
    setFormOpen(true);
  }

  async function connect(event) {
    event.preventDefault();
    if (isConnecting) return;

    if (!/^[0-9]{1,20}$/.test(form.login.trim())) {
      setMessage({ type: "error", text: "Enter your MT5 login number (digits only)." });
      return;
    }
    if (!form.server.trim() || !form.password || !form.account_id) {
      setMessage({ type: "error", text: "Choose an account and fill in every field." });
      return;
    }

    setIsConnecting(true);
    setMessage(null);

    const { data, error } = await supabase.functions.invoke("broker-connect", {
      body: {
        account_id: form.account_id,
        login: form.login.trim(),
        server: form.server.trim(),
        investor_password: form.password,
      },
    });

    // The password is never kept after the request.
    setForm((current) => ({ ...current, password: "" }));
    setIsConnecting(false);

    if (error || data?.error) {
      setMessage({
        type: "error",
        text: error ? await describeFunctionError(error) : String(data.message || "Connection failed."),
      });
      return;
    }

    setFormOpen(false);
    setMessage({
      type: "info",
      text: "Connection started. It will show as Connected once your broker confirms it.",
    });
    await load();
  }

  async function syncNow(connection) {
    if (busyId) return;
    if (!isSubscribed) {
      onRequireUpgrade();
      return;
    }

    setBusyId(connection.id);
    setMessage(null);

    const { data, error } = await supabase.functions.invoke("broker-sync", {
      body: { connection_id: connection.id },
    });

    setBusyId(null);

    if (error || data?.error) {
      setMessage({
        type: "error",
        text: error ? await describeFunctionError(error) : String(data.message || "Sync failed."),
      });
      await load();
      return;
    }

    // Only the backend's own result decides what the user is told.
    const imported = Number(data?.trades_upserted ?? 0);
    if (data?.status === "success") {
      setMessage({ type: "success", text: `Sync complete. ${imported} trade${imported === 1 ? "" : "s"} updated.` });
    } else if (data?.status === "partial") {
      setMessage({ type: "error", text: "Sync finished partly. Some records could not be imported; try again shortly." });
    } else {
      setMessage({ type: "error", text: "Sync did not complete. Please try again." });
    }

    await load();
    refreshAccounts();
  }

  async function disconnect(connection) {
    if (busyId) return;

    setBusyId(connection.id);
    setMessage(null);

    const { data, error } = await supabase.functions.invoke("broker-disconnect", {
      body: { connection_id: connection.id },
    });

    setBusyId(null);

    if (error || data?.error) {
      setMessage({
        type: "error",
        text: error ? await describeFunctionError(error) : String(data.message || "Couldn't disconnect."),
      });
      return;
    }

    setMessage({ type: "info", text: "Disconnected. Trades already imported are kept." });
    await load();
  }

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
          <PlugZap size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium">Broker connections</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Import trades automatically from an Exness MetaTrader 5 account, using read-only access.
          </p>
        </div>

        {loadState === "ready" && !formOpen && (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
          >
            <Link2 size={16} />
            Connect
          </button>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`mt-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-[var(--danger)]/30 bg-[var(--danger)]/5 text-[var(--text-secondary)]"
              : message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]"
          }`}
        >
          {message.type === "error" ? (
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          ) : (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      <div className="mt-5">
        {loadState === "loading" && (
          <p className="flex items-center gap-2 py-4 text-sm text-[var(--text-secondary)]">
            <Loader2 size={15} className="animate-spin" /> Loading connections…
          </p>
        )}

        {loadState === "unavailable" && (
          <p className="py-4 text-sm leading-6 text-[var(--text-secondary)]">
            Broker connections aren't available yet. Your manual records are unaffected.
          </p>
        )}

        {loadState === "ready" && connections.length === 0 && !formOpen && (
          <p className="py-4 text-sm leading-6 text-[var(--text-secondary)]">
            No broker connected. Connect an Exness MT5 account to import its trades into one of your accounts.
          </p>
        )}

        {connections.length > 0 && (
          <div className="divide-y divide-[var(--border-soft)]">
            {connections.map((connection) => {
              const busy = busyId === connection.id;
              const run = lastRuns[connection.id];

              return (
                <div key={connection.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Exness · MT5 {connection.login}
                      </p>
                      <p className="mt-1 break-all text-xs text-[var(--text-muted)]">
                        {connection.server} · Records go to “{accountName(connection.account_id)}”
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        STATUS_STYLES[connection.status] ?? STATUS_STYLES.pending
                      }`}
                    >
                      {STATUS_LABELS[connection.status] ?? connection.status}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    Last successful sync: {formatTime(connection.last_synced_at)}
                    {run?.status === "success" &&
                      ` · ${run.trades_upserted} trade${run.trades_upserted === 1 ? "" : "s"} in last run`}
                  </p>

                  {connection.status === "error" && (
                    <p className="mt-2 text-xs leading-5 text-[var(--danger)]">
                      {connection.last_error_message ||
                        "The connection needs attention. Check your credentials and try again."}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => syncNow(connection)}
                      disabled={busy || connection.status === "pending"}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-xs font-semibold text-[#17130d] hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                      {busy ? "Syncing…" : "Sync now"}
                    </button>

                    <button
                      type="button"
                      onClick={() => disconnect(connection)}
                      disabled={busy}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] disabled:opacity-50"
                    >
                      <Unplug size={14} />
                      Disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <form onSubmit={connect} className="mt-2 space-y-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] p-4 sm:p-5">
          <div className="flex items-start gap-2.5 text-xs leading-5 text-[var(--text-secondary)]">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <p>
              Use your <strong className="font-semibold text-[var(--text-primary)]">investor (read-only) password</strong>,
              never your main trading password. It lets TradeFrame read trades but never place orders or withdraw funds.
            </p>
          </div>

          <label className="block text-sm font-medium">
            Import into account
            <select
              value={form.account_id}
              onChange={(event) => setForm({ ...form, account_id: event.target.value })}
              className={inputClass}
            >
              {accounts.length === 0 && <option value="">Add an account first</option>}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              MT5 login
              <input
                inputMode="numeric"
                autoComplete="off"
                value={form.login}
                onChange={(event) => setForm({ ...form, login: event.target.value })}
                className={inputClass}
                placeholder="e.g. 12345678"
              />
            </label>

            <label className="block text-sm font-medium">
              Server
              <input
                autoComplete="off"
                value={form.server}
                onChange={(event) => setForm({ ...form, server: event.target.value })}
                className={inputClass}
                placeholder="e.g. Exness-MT5Real8"
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Investor password
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className={inputClass}
            />
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={isConnecting}
              className="min-h-11 rounded-full px-4 text-sm text-[var(--text-secondary)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isConnecting || accounts.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting && <Loader2 size={15} className="animate-spin" />}
              {isConnecting ? "Connecting…" : "Connect account"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

export default BrokerConnections;
