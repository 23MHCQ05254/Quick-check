import { motion } from 'framer-motion';

export function GlassPanel({ children, className = '', delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      className={`glass-panel rounded-2xl ${className}`}
    >
      {children}
    </motion.section>
  );
}

