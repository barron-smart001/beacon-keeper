import { motion } from "framer-motion";

function FloatingOrb({
  className = "",
  size = 180,
  delay = 0,
}) {
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl opacity-[0.08] ${className}`}
      style={{
        width: size,
        height: size,
      }}
      animate={{
        x: [0, 20, -12, 0],
        y: [0, -18, 14, 0],
        scale: [1, 1.08, 0.96, 1],
      }}
      transition={{
        duration: 12,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export default FloatingOrb;