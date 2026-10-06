import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function UpgradeModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    onClose();
    navigate("/app/billing");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f14]/70 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_80px_rgba(0,0,0,0.38)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,201,92,0.12),_transparent_58%)]" />

            <div className="relative p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-elevated)] text-[var(--accent)] shadow-[0_0_0_1px_rgba(230,176,74,0.08)]">
                    <LockKeyhole size={20} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close upgrade prompt"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--border)]/80 hover:text-[var(--text-primary)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-6">
                <h2
                  id="upgrade-modal-title"
                  className="text-2xl font-medium tracking-[-0.04em] text-[var(--text-primary)] sm:text-[28px]"
                >
                  Unlock your trading workspace
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  Subscribe to Recordium Pro to record and manage your trading activity.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 text-sm font-medium text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--surface-elevated)]"
                >
                  Maybe later
                </button>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[#17130d] transition-transform duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                >
                  Subscribe to Recordium
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UpgradeModal;
