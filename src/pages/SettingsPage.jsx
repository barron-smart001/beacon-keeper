import { Check, Mail, Plus, Settings, UserRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "../components/app/AppShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const inputClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ default_currency: "USD", trading_style: "" });
  const [accounts, setAccounts] = useState([]);
  const [accountName, setAccountName] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      const [profileResult, accountsResult] = await Promise.all([supabase.from("profiles").select("default_currency, trading_style").eq("id", user.id).maybeSingle(), supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false })]);
      if (!mounted) return;
      if (profileResult.error || accountsResult.error) setNotice("We couldn't load all of your settings. Please refresh and try again.");
      if (profileResult.data) setProfile(profileResult.data);
      if (accountsResult.data) setAccounts(accountsResult.data);
    }
    if (user?.id) loadSettings();
    return () => { mounted = false; };
  }, [user?.id]);

  async function saveProfile(event) {
    event.preventDefault();
    setNotice("");
    const { error } = await supabase.from("profiles").upsert({ id: user.id, default_currency: profile.default_currency, trading_style: profile.trading_style || null });
    setNotice(error ? "We couldn't save your preferences. Please try again." : "Preferences saved.");
  }
  async function addAccount(event) {
    event.preventDefault();
    const name = accountName.trim();
    if (!name) return;
    setNotice("");
    const { data, error } = await supabase.from("accounts").insert({ user_id: user.id, name, currency: profile.default_currency }).select().single();
    if (error) { setNotice("We couldn't add that account. Please try again."); return; }
    setAccounts((current) => [data, ...current]);
    setAccountName("");
  }

  return <AppShell><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Workspace preferences</p><h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Manage your profile, record defaults, and the accounts that organize your trading practice.</p></div>{notice && <p role="status" className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">{notice}</p>}<section className="mt-9 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="grid size-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]"><UserRound size={20} /></div><h2 className="mt-6 text-lg font-medium">Profile</h2><div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] p-4"><div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><Mail size={16} className="text-[var(--accent)]" /><span className="break-all">{user?.email || "No email available"}</span></div></div></article><article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><Settings className="text-[var(--accent)]" size={21} /><h2 className="mt-6 text-lg font-medium">Record defaults</h2><form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={saveProfile}><label className="text-sm font-medium">Default currency<select value={profile.default_currency} onChange={(event) => setProfile((current) => ({ ...current, default_currency: event.target.value }))} className={inputClass}><option value="USD">USD</option><option value="NGN">NGN</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select></label><label className="text-sm font-medium">Trading style<select value={profile.trading_style || ""} onChange={(event) => setProfile((current) => ({ ...current, trading_style: event.target.value }))} className={inputClass}><option value="">Not specified</option><option value="Forex">Forex</option><option value="Day trading">Day trading</option><option value="Scalping">Scalping</option><option value="Swing trading">Swing trading</option><option value="Position trading">Position trading</option></select></label><div className="sm:col-span-2"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[#17130d] hover:bg-[var(--accent-light)]"><Check size={16} /> Save preferences</button></div></form></article></section><section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-medium">Accounts</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Use accounts to keep personal, broker, and demo records separate.</p></div><WalletCards className="shrink-0 text-[var(--accent)]" size={21} /></div><div className="mt-6 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">{accounts.length ? accounts.map((account) => <div key={account.id} className="flex items-center justify-between py-4"><span className="text-sm font-medium">{account.name}</span><span className="font-mono text-xs text-[var(--text-muted)]">{account.currency}</span></div>) : <p className="py-5 text-sm text-[var(--text-secondary)]">No accounts recorded yet.</p>}</div><form onSubmit={addAccount} className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="account-name">Account name</label><input id="account-name" value={accountName} onChange={(event) => setAccountName(event.target.value)} className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" placeholder="Add an account" /><button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"><Plus size={16} /> Add account</button></form></section></main></AppShell>;
}

export default SettingsPage;
