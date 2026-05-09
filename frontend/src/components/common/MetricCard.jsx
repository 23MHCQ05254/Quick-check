import { ArrowUpRight } from 'lucide-react';
import { GlassPanel } from './GlassPanel.jsx';

export function MetricCard({ label, value, detail, icon: Icon, accent = 'cyan', delay = 0 }) {
  const accents = {
    cyan: 'text-cyber-cyan bg-cyan-500/10',
    green: 'text-cyber-green bg-emerald-500/10',
    amber: 'text-cyber-amber bg-amber-500/10',
    rose: 'text-cyber-rose bg-rose-500/10'
  };

  return (
    <GlassPanel className="p-5" delay={delay}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${accents[accent]}`}>
          {Icon ? <Icon size={20} /> : <ArrowUpRight size={20} />}
        </div>
      </div>
      {detail && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{detail}</p>}
    </GlassPanel>
  );
}

