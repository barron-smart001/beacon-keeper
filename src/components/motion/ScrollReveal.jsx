import { motion, useReducedMotion } from "framer-motion";

const revealTransition = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1],
};

function ScrollReveal({
  as = "div",
  children,
  className,
  ...props
}) {
  const Tag = motion[as];
  const reducedMotion = useReducedMotion();

  return (
    <Tag
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={reducedMotion ? { duration: 0 } : revealTransition}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
}

function StaggerGroup({
  as = "div",
  children,
  className,
  ...props
}) {
  const Tag = motion[as];
  const reducedMotion = useReducedMotion();

  return (
    <Tag
      initial={reducedMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={{
        hidden: {},
        visible: {
          transition: reducedMotion
            ? { duration: 0 }
            : { staggerChildren: 0.07 },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
}

function RevealItem({ as = "div", children, className, ...props }) {
  const Tag = motion[as];
  const reducedMotion = useReducedMotion();

  return (
    <Tag
      variants={{
        hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: reducedMotion ? { duration: 0 } : revealTransition,
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { ScrollReveal, StaggerGroup, RevealItem };
