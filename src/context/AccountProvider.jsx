import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { AccountContext } from "./accountContext";

export const ALL_ACCOUNTS = "all";
const storageKey = (userId) => `tradeframe:activeAccount:${userId}`;

function readStored(userId) {
  try {
    return window.localStorage.getItem(storageKey(userId)) || ALL_ACCOUNTS;
  } catch {
    return ALL_ACCOUNTS;
  }
}

export function AccountProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(ALL_ACCOUNTS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("id, name, currency, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) console.error("Unable to load trading accounts.", error);
    else setAccounts(data ?? []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    setSelected(userId ? readStored(userId) : ALL_ACCOUNTS);
    refresh();
  }, [userId, refresh]);

  // A deleted account must not stay selected.
  const activeAccountId =
    selected === ALL_ACCOUNTS || accounts.some((account) => account.id === selected)
      ? selected
      : ALL_ACCOUNTS;

  const setActiveAccountId = useCallback(
    (id) => {
      setSelected(id);
      try {
        if (userId) window.localStorage.setItem(storageKey(userId), id);
      } catch {
        // Remembering the choice is a convenience only.
      }
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      accounts,
      activeAccountId,
      activeAccount: accounts.find((account) => account.id === activeAccountId) ?? null,
      setActiveAccountId,
      refresh,
      isLoading,
    }),
    [accounts, activeAccountId, setActiveAccountId, refresh, isLoading]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
