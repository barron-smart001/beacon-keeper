import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";

function useSubscription() {
  const { user } = useAuth();

  const [subscription, setSubscription] = useState({
    status: "inactive",
    plan: null,
    startedAt: null,
    expiresAt: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSubscription() {
      if (!user) {
        if (mounted) {
          setSubscription({
            status: "inactive",
            plan: null,
            startedAt: null,
            expiresAt: null,
          });

          setIsLoading(false);
        }

        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
        )
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (error) {
        console.error("Error loading subscription:", error);

        setSubscription({
          status: "inactive",
          plan: null,
          startedAt: null,
          expiresAt: null,
        });
      } else {
        setSubscription({
          status: data?.subscription_status || "inactive",
          plan: data?.subscription_plan || null,
          startedAt: data?.subscription_started_at || null,
          expiresAt: data?.subscription_expires_at || null,
        });
      }

      setIsLoading(false);
    }

    loadSubscription();

    return () => {
      mounted = false;
    };
  }, [user]);

  const hasValidExpiry =
    !subscription.expiresAt ||
    new Date(subscription.expiresAt).getTime() > Date.now();

  const isSubscribed =
    subscription.status === "active" &&
    subscription.plan === "pro" &&
    hasValidExpiry;

  return {
    subscription,
    isSubscribed,
    isLoading,
  };
}

export default useSubscription;