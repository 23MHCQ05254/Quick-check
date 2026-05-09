const styles = {
  VERIFIED: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300',
  PENDING: 'bg-cyan-500/12 text-cyan-700 ring-cyan-500/25 dark:text-cyan-300',
  REVIEW_REQUIRED: 'bg-amber-500/14 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  REJECTED: 'bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:text-rose-300',
  ACTIVE: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300',
  DRAFT: 'bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-300'
};

export function StatusBadge({ status }) {
  const label = (status || 'PENDING').replaceAll('_', ' ');
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-normal ring-1 ${styles[status] || styles.PENDING}`}>
      {label}
    </span>
  );
}

