import { motion } from 'framer-motion';
import { Bell, RadioTower } from 'lucide-react';

export function NotificationCenter({ items = [] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.id || `${item.title}-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.035 }}
          className="rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <div className="flex items-start gap-3">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${item.priority === 'CRITICAL' || item.priority === 'HIGH' ? 'bg-rose-500/10 text-cyber-rose' : 'bg-cyan-500/10 text-cyber-cyan'}`}>
              <RadioTower size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950 dark:text-white">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.body}</p>
              <p className="mt-2 text-[11px] font-bold uppercase text-slate-400">{item.priority}</p>
            </div>
          </div>
        </motion.div>
      ))}
      {!items.length && (
        <div className="grid min-h-28 place-items-center rounded-2xl bg-slate-900/5 text-center dark:bg-white/10">
          <div>
            <Bell className="mx-auto text-slate-400" size={22} />
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">No active alerts</p>
          </div>
        </div>
      )}
    </div>
  );
}

