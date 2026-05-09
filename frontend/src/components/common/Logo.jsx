import { ShieldCheck } from 'lucide-react';

export function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-cyber-green shadow-glow dark:bg-white dark:text-ink">
        <ShieldCheck size={21} strokeWidth={2.4} />
      </div>
      {!compact && (
        <div>
          <p className="text-sm font-black tracking-normal text-slate-950 dark:text-white">QuickCheck</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Certificate Intelligence</p>
        </div>
      )}
    </div>
  );
}

