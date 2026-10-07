import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../hooks/useAuth";
import { SubscriptionContext } from "./subscriptionContext";
import { supabase } from "../lib/supabase";
import { BILLING_PLANS } from "../lib/billingPlans";

const INACTIVE_SUBSCRIPTION = {
  status: "inactive",
  plan: null,
  startedAt: null,
  expiresAt: null,
  billingPlan: null,
};

function getBillingPlanFromPayment(payment) {
  if (!payment || payment.currency !== "NGN" || payment.status !== "success") {
    return null;
  }

  const amount = Number(payment.amount);
  return (
    Object.values(BILLING_PLANS).find((plan) => plan.amount === amount) || null
  );
}

export function SubscriptionProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id || null;
  const requestId = useRef(0);
  const [subscription, setSubscription] = useState(INACTIVE_SUBSCRIPTION);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (isAuthLoading) {
      return null;
    }

    if (!userId) {
      setSubscription(INACTIVE_SUBSCRIPTION);
      setLoadedUserId(null);
      setIsFetching(false);
      return INACTIVE_SUBSCRIPTION;
    }

    setIsFetching(true);

    try {
      const [profileResult, paymentResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "subscription_status, subscription_plan, subscription_started_at, subscription_expires_at"
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("payment_transactions")
          .select("amount, currency, status")
          .eq("user_id", userId)
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (paymentResult.error) {
        console.error("Error loading the current subscription plan:", paymentResult.error);
      }

      const profile = profileResult.data;
      const nextSubscription = {
        status: profile?.subscription_status || "inactive",
        plan: profile?.subscription_plan || null,
        startedAt: profile?.subscription_started_at || null,
        expiresAt: profile?.subscription_expires_at || null,
        billingPlan: paymentResult.error
          ? null
          : getBillingPlanFromPayment(paymentResult.data),
      };

      if (requestId.current === currentRequestId) {
        setSubscription(nextSubscription);
        setLoadedUserId(userId);
      }

      return nextSubscription;
    } catch (error) {
      console.error("Error loading subscription:", error);
      if (requestId.current === currentRequestId) {
        setSubscription(INACTIVE_SUBSCRIPTION);
        setLoadedUserId(userId);
      }
      return null;
    } finally {
      if (requestId.current === currentRequestId) {
        setIsFetching(false);
      }
    }
  }, [isAuthLoading, userId]);

  useEffect(() => {
    if (isAuthLoading) {
      return undefined;
    }

    if (!userId) {
      setSubscription(INACTIVE_SUBSCRIPTION);
      setLoadedUserId(null);
      setIsFetching(false);
      return undefined;
    }

    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [isAuthLoading, refresh, userId]);

  useEffect(() => {
    const expiryTime = subscription.expiresAt
      ? new Date(subscription.expiresAt).getTime()
      : null;
    if (!Number.isFinite(expiryTime) || expiryTime <= now) {
      return undefined;
    }

    const timeoutId = window.setTimeout(
      () => setNow(Date.now()),
      expiryTime - now
    );
    return () => window.clearTimeout(timeoutId);
  }, [now, subscription.expiresAt]);

  const isLoading =
    isAuthLoading ||
    isFetching ||
    (userId !== null && loadedUserId !== userId);
  const expiryTime = subscription.expiresAt
    ? new Date(subscription.expiresAt).getTime()
    : null;
  const hasValidExpiry =
    expiryTime === null ||
    (Number.isFinite(expiryTime) && expiryTime > now);
  const isSubscribed =
    !isLoading &&
    subscription.status === "active" &&
    subscription.plan === "pro" &&
    hasValidExpiry;

  const value = useMemo(
    () => ({ subscription, isSubscribed, isLoading, refresh }),
    [subscription, isSubscribed, isLoading, refresh]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
