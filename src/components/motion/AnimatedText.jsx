import { motion } from "framer-motion";

function AnimatedText({
  children,
  className = "",
  shimmer = false,
}) {
  return (
    <motion.span
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`inline-block ${
        shimmer ? "meridian-shimmer" : ""
      } ${className}`}
    >
      {children}
    </motion.span>
  );
}

export default AnimatedText;