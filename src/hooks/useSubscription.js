import { useContext } from "react";

import { SubscriptionContext } from "../context/subscriptionContext";

function useSubscription() {
  const subscriptionState = useContext(SubscriptionContext);
  if (!subscriptionState) {
    throw new Error("useSubscription must be used within a SubscriptionProvider.");
  }
  return subscriptionState;
}

export default useSubscription;
