import { Activity, Bell, Filter } from 'lucide-react';
import { useState } from 'react';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { ActivityFeed } from '../components/mentor/ActivityFeed.jsx';
import { NotificationCenter } from '../components/mentor/NotificationCenter.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function MentorActivityPage() {
  const [severity, setSeverity] = useState('');
  const { data, loading } = useAsync(async () => {
    const [activity, notifications] = await Promise.all([
      api.get('/mentor/activity', { params: { limit: 80, severity: severity || undefined } }),
      api.get('/mentor/notifications')
    ]);
    return { activity: activity.data.items, notifications: notifications.data.items };
  }, [severity]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Activity and alerts</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Institutional operations feed</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Track uploads, mentor actions, fraud reviews, approval decisions, template updates, and live alert signals.
          </p>
        </div>
        <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 dark:border-white/10 dark:bg-white/[0.06]">
          <Filter size={16} className="text-cyber-cyan" />
          <select className="bg-transparent text-sm font-semibold outline-none" value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="">All severity</option>
            <option value="INFO">Info</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <GlassPanel className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
              <Activity size={18} />
            </div>
            <p className="text-sm font-black text-slate-950 dark:text-white">Audit activity timeline</p>
          </div>
          <div className="mt-5">{loading ? <Skeleton className="h-80" /> : <ActivityFeed items={data?.activity || []} />}</div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-500/10 text-cyber-rose">
              <Bell size={18} />
            </div>
            <p className="text-sm font-black text-slate-950 dark:text-white">Notification center</p>
          </div>
          <div className="mt-5">{loading ? <Skeleton className="h-80" /> : <NotificationCenter items={data?.notifications || []} />}</div>
        </GlassPanel>
      </div>
    </div>
  );
}

