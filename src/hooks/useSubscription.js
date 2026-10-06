import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";

const INACTIVE_SUBSCRIPTION = {
  status: "inactive",
  plan: null,
  startedAt: null,
  expiresAt: null,
};

function normalizeSubscription(profile) {
  return {
    status: profile?.subscription_status || "inactive",
    plan: profile?.subscription_plan || null,
    startedAt: profile?.subscription_started_at || null,
    expiresAt: profile?.subscription_expires_at || null,
  };
}

function useSubscription() {
  const { user } = useAuth();
  const userId = user?.id;
  const requestId = useRef(0);
  const [subscription, setSubscription] = useState(INACTIVE_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!userId) {
      setSubscription(INACTIVE_SUBSCRIPTION);
      setIsLoading(false);
      return INACTIVE_SUBSCRIPTION;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const nextSubscription = normalizeSubscription(data);
      if (requestId.current === currentRequestId) {
        setSubscription(nextSubscription);
      }

      return nextSubscription;
    } catch (error) {
      console.error("Error loading subscription:", error);
      if (requestId.current === currentRequestId) {
        setSubscription(INACTIVE_SUBSCRIPTION);
      }
      return null;
    } finally {
      if (requestId.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  const expiryTime = subscription.expiresAt
    ? new Date(subscription.expiresAt).getTime()
    : null;
  const hasValidExpiry =
    expiryTime === null ||
    (Number.isFinite(expiryTime) && expiryTime > Date.now());
  const isSubscribed =
    subscription.status === "active" &&
    subscription.plan === "pro" &&
    hasValidExpiry;

  return {
    subscription,
    isSubscribed,
    isLoading,
    refresh,
  };
}

export default useSubscription;
