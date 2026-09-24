import { motion, useReducedMotion } from "framer-motion";

const particles = [
  { left: "12%", top: "18%", size: 4, delay: 0.6, opacity: 0.4 },
  { left: "28%", top: "62%", size: 3, delay: 1.4, opacity: 0.45 },
  { left: "43%", top: "14%", size: 2, delay: 2.5, opacity: 0.5 },
  { left: "61%", top: "72%", size: 5, delay: 0.9, opacity: 0.35 },
  { left: "78%", top: "36%", size: 3, delay: 2.1, opacity: 0.4 },
  { left: "88%", top: "18%", size: 4, delay: 1.8, opacity: 0.3 },
  { left: "72%", top: "58%", size: 2, delay: 3.2, opacity: 0.5 },
];

function FloatingBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute left-[-12%] top-[-18%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.18)_0%,rgba(201,168,118,0.08)_30%,transparent_68%)] blur-[80px]"
        animate={
          reducedMotion
            ? { opacity: 0.35 }
            : {
                x: [0, 30, -26, 0],
                y: [0, 18, -16, 0],
                scale: [1, 1.08, 0.96, 1],
                opacity: [0.28, 0.38, 0.3, 0.28],
              }
        }
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[12%] top-[6%] h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(201,168,118,0.14)_0%,rgba(201,168,118,0.07)_26%,transparent_70%)] blur-[90px]"
        animate={
          reducedMotion
            ? { opacity: 0.2 }
            : {
                x: [0, -24, 18, 0],
                y: [0, -26, 18, 0],
                scale: [1, 1.04, 0.98, 1],
                opacity: [0.18, 0.3, 0.22, 0.18],
              }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-[10%] bottom-[-8%] h-[220px] rounded-[50%] bg-[linear-gradient(90deg,rgba(201,168,118,0.04),rgba(201,168,118,0.12),rgba(201,168,118,0.03))] blur-3xl"
        animate={
          reducedMotion
            ? { opacity: 0.16 }
            : {
                x: [-12, 18, -10, 0],
                opacity: [0.12, 0.18, 0.14, 0.12],
              }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {particles.map((particle) => (
        <motion.span
          key={`${particle.left}-${particle.top}`}
          className="absolute rounded-full bg-[rgba(201,168,118,0.8)]"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            boxShadow: "0 0 12px rgba(201,168,118,0.6)",
          }}
          animate={
            reducedMotion
              ? { opacity: particle.opacity }
              : {
                  y: [0, -12, 0, 12, 0],
                  x: [0, 10, -6, 4, 0],
                  opacity: [particle.opacity, particle.opacity + 0.18, particle.opacity, particle.opacity + 0.1, particle.opacity],
                }
          }
          transition={{
            duration: 9 + particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}

export default FloatingBackground;
