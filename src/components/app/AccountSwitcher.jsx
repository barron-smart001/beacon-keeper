import { Wallet } from "lucide-react";
import { ALL_ACCOUNTS } from "../../context/AccountProvider";
import { useAccounts } from "../../hooks/useAccounts";

/** Chooses which account's records the app shows. */
function AccountSwitcher({ compact = false }) {
  const { accounts, activeAccountId, setActiveAccountId, isLoading } = useAccounts();

  if (isLoading || accounts.length === 0) return null;

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Active account</span>
      <Wallet size={14} className="pointer-events-none absolute left-3 text-[var(--accent)]" />
      <select
        value={activeAccountId}
        onChange={(event) => setActiveAccountId(event.target.value)}
        className={`min-h-9 appearance-none rounded-full border border-[var(--border)] bg-[var(--surface)] pl-8 pr-4 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)] ${compact ? "max-w-[130px] truncate" : "max-w-[220px]"}`}
      >
        <option value={ALL_ACCOUNTS}>All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{account.name}</option>
        ))}
      </select>
    </label>
  );
}

export default AccountSwitcher;
