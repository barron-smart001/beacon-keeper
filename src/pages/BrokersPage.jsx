import { useState } from "react";

import AppShell from "../components/app/AppShell";
import BrokerConnections from "../components/broker/BrokerConnections";
import { ScrollReveal } from "../components/motion/ScrollReveal";
import UpgradeModal from "../components/subscription/UpgradeModal";
import useSubscription from "../hooks/useSubscription";

function BrokersPage() {
  const { isSubscribed, isLoading: subscriptionLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
        <ScrollReveal as="div">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Automatic trade import
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Brokers</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Connect a broker so its trades import into TradeFrame on their own, with read-only access.
          </p>
        </ScrollReveal>

        <ScrollReveal as="section" className="mt-8">
          <BrokerConnections
            isSubscribed={isSubscribed}
            subscriptionLoading={subscriptionLoading}
            onRequireUpgrade={() => setShowUpgradeModal(true)}
          />
        </ScrollReveal>
      </main>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </AppShell>
  );
}

export default BrokersPage;
