import { motion, useReducedMotion } from "framer-motion";

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const word = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/** Text whose words appear one after another once it scrolls into view. */
function ScrollText({ text, as = "p", className }) {
  const reducedMotion = useReducedMotion();
  const Tag = motion[as];

  if (reducedMotion) return <Tag className={className}>{text}</Tag>;

  return (
    <Tag
      className={className}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      aria-label={text}
    >
      {text.split(" ").map((item, index) => (
        <motion.span key={`${item}-${index}`} variants={word} aria-hidden="true" className="mr-[0.25em] inline-block">
          {item}
        </motion.span>
      ))}
    </Tag>
  );
}

export default ScrollText;
