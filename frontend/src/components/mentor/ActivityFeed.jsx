import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

const iconFor = (severity) => {
  if (severity === 'HIGH' || severity === 'CRITICAL') return AlertTriangle;
  if (severity === 'INFO') return CheckCircle2;
  return ShieldCheck;
};

export function ActivityFeed({ items = [] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const Icon = iconFor(item.severity);
        return (
          <motion.div
            key={item._id || item.id || `${item.action}-${index}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.035 }}
            className="flex gap-3 rounded-2xl border border-slate-900/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{item.message}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {item.action?.replaceAll('_', ' ')} - {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}
              </p>
            </div>
          </motion.div>
        );
      })}
      {!items.length && (
        <div className="grid min-h-28 place-items-center rounded-2xl bg-slate-900/5 text-center dark:bg-white/10">
          <div>
            <Activity className="mx-auto text-slate-400" size={22} />
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">No activity yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
