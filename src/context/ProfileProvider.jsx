import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const ProfileContext = createContext(null);

const COLUMNS = "full_name, headline, country, timezone, experience_level, avatar_path";

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [details, setDetails] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDetails(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    // Before the profile migration is applied the columns don't exist; the app
    // then falls back to the email initial.
    if (error) console.error("Unable to load profile details.", error);
    setDetails(error ? null : data);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The photo is private, so it is shown through a short-lived signed link
  // that is renewed before it expires.
  const avatarPath = details?.avatar_path ?? null;
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!avatarPath) {
      setAvatarUrl(null);
      return undefined;
    }

    let cancelled = false;
    let timer;

    async function sign() {
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(avatarPath, 3600);

      if (cancelled) return;
      if (error) {
        console.error("Unable to load the profile photo.", error);
        setAvatarUrl(null);
        return;
      }

      setAvatarUrl(data.signedUrl);
      timer = setTimeout(sign, 50 * 60 * 1000);
    }

    sign();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [avatarPath]);

  const value = useMemo(() => {
    const displayName =
      details?.full_name || user?.user_metadata?.full_name || user?.email || "";

    return { details, avatarUrl, displayName, refresh };
  }, [details, avatarUrl, user, refresh]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within a ProfileProvider.");
  return context;
}
