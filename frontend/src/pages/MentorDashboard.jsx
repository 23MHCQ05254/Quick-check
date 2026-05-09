import { motion } from 'framer-motion';
import { AlertTriangle, BadgeCheck, ClipboardCheck, FileWarning, ShieldCheck, UsersRound } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { MetricCard } from '../components/common/MetricCard.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function MentorDashboard() {
  const { data, loading, reload } = useAsync(async () => {
    const [dashboard, analytics] = await Promise.all([api.get('/mentor/dashboard'), api.get('/mentor/analytics')]);
    return { ...dashboard.data, analytics: analytics.data };
  }, []);

  const review = async (certificateId, status) => {
    await api.patch(`/mentor/certificates/${certificateId}/review`, {
      status,
      reviewNotes: status === 'VERIFIED' ? 'Mentor approved after review.' : 'Rejected after mentor review.'
    });
    reload();
  };

  const summary = data?.summary || {};
  const suspicious = data?.suspicious || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-cyber-green">Mentor command center</p>
        <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950 dark:text-white">Verification operations</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Monitor uploads, review suspicious indicators, and keep placement portfolios credible without treating AI probability as a final verdict.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Students" value={summary.students || 0} detail="Tracked in placement pipeline" icon={UsersRound} accent="cyan" />
        <MetricCard label="Uploads" value={summary.total || 0} detail={`${summary.PENDING || 0} pending certificates`} icon={ClipboardCheck} accent="green" delay={0.05} />
        <MetricCard label="Review Queue" value={summary.REVIEW_REQUIRED || 0} detail="Needs mentor decision" icon={FileWarning} accent="amber" delay={0.1} />
        <MetricCard label="Avg Risk" value={`${summary.avgFraud || 0}%`} detail="AI-assisted risk signal" icon={AlertTriangle} accent="rose" delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <GlassPanel className="p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Organization risk surface</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Average fraud probability by issuing organization.</p>
          <div className="mt-6 h-72">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.analytics?.organizationRisk || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" vertical={false} />
                  <XAxis dataKey="organization" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                  <Bar dataKey="avgFraud" fill="#38D5FF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Verification posture</p>
          <div className="mt-5 space-y-4">
            {[
              ['Verified', summary.VERIFIED || 0, 'bg-emerald-500'],
              ['Pending', summary.PENDING || 0, 'bg-cyan-500'],
              ['Review', summary.REVIEW_REQUIRED || 0, 'bg-amber-500'],
              ['Rejected', summary.REJECTED || 0, 'bg-rose-500']
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                  <span className="font-black text-slate-950 dark:text-white">{value}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/10">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, ((value || 0) / Math.max(1, summary.total || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-cyber-amber">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-white">Suspicious uploads</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Mentor decisions update student vault status.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {loading && <Skeleton className="h-24" />}
          {!loading &&
            suspicious.map((certificate) => (
              <motion.div
                key={certificate._id || certificate.id}
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950 dark:text-white">{certificate.title}</p>
                      <StatusBadge status={certificate.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {certificate.student?.name} · {certificate.organization?.name} · {certificate.analysis?.fraudProbability || 0}% probability
                    </p>
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      {(certificate.analysis?.suspiciousIndicators || ['Review score crossed threshold'])[0]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => review(certificate._id || certificate.id, 'VERIFIED')}>
                      <BadgeCheck size={16} />
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => review(certificate._id || certificate.id, 'REJECTED')}>
                      Reject
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          {!loading && suspicious.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No suspicious uploads in queue.</p>}
        </div>
      </GlassPanel>
    </div>
  );
}

