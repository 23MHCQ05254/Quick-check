const styles = {
  LOW: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300',
  MEDIUM: 'bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  HIGH: 'bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:text-rose-300',
  CRITICAL: 'bg-red-600/15 text-red-700 ring-red-600/25 dark:text-red-300'
};

export function RiskPill({ level = 'LOW' }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1 ${styles[level] || styles.LOW}`}>
      {level} risk
    </span>
  );
}

