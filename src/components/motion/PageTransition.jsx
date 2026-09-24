import { motion, useReducedMotion } from "framer-motion";

function PageTransition({ children, calm = false }) {
  const reducedMotion = useReducedMotion();

  const transition = {
    duration: reducedMotion ? 0.18 : calm ? 0.52 : 0.58,
    ease: "easeInOut",
  };

  return (
    <motion.div
      className="relative z-0 w-full overflow-visible"
      initial={false}
      transition={transition}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(circle at center, rgba(201,168,118,0.16), rgba(201,168,118,0.08) 20%, rgba(14,15,18,0.9) 55%, rgba(14,15,18,0.98) 100%)",
          filter: "blur(18px)",
        }}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0.8, scale: 0.96 }}
        animate={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
      />

      <motion.div
        initial={reducedMotion ? { opacity: 0, y: 4 } : { opacity: 0, scale: calm ? 0.985 : 0.985, y: calm ? 8 : 10 }}
        animate={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0, y: -4 } : { opacity: 0, scale: 0.99, y: -6 }}
        transition={transition}
        className="relative z-10 w-full origin-center will-change-transform"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default PageTransition;

