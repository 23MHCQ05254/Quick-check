import { motion } from 'framer-motion';
import { AlertTriangle, BadgeCheck, Bell, BrainCircuit, ClipboardCheck, Download, FileWarning, RadioTower, ShieldCheck, UsersRound } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { MetricCard } from '../components/common/MetricCard.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { ActivityFeed } from '../components/mentor/ActivityFeed.jsx';
import { CircularScore } from '../components/mentor/CircularScore.jsx';
import { NotificationCenter } from '../components/mentor/NotificationCenter.jsx';
import { ReviewDrawer } from '../components/mentor/ReviewDrawer.jsx';
import { RiskPill } from '../components/mentor/RiskPill.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const riskColors = {
  LOW: '#37E6A0',
  MEDIUM: '#F6C667',
  HIGH: '#FF6B8A',
  CRITICAL: '#DC2626'
};

export default function MentorDashboard() {
  const [activeReview, setActiveReview] = useState(null);
  const { data, loading, reload, error } = useAsync(async () => (await api.get('/mentor/command-center')).data, []);

  const review = async (certificate, status, notes = '') => {
    await api.patch(`/mentor/certificates/${certificate._id || certificate.id}/review`, {
      status,
      reviewNotes: notes || (status === 'VERIFIED' ? 'Mentor approved after review.' : 'Mentor decision recorded.'),
      overrideReason: notes
    });
    setActiveReview(null);
    reload();
  };

  const moderate = async (certificate, patch) => {
    await api.patch(`/mentor/certificates/${certificate._id || certificate.id}/moderate`, patch);
    setActiveReview(null);
    reload();
  };

  const rerun = async (certificate) => {
    await api.post(`/mentor/certificates/${certificate._id || certificate.id}/rerun-analysis`);
    setActiveReview(null);
    reload();
  };

  const downloadReport = async () => {
    const response = await api.get('/mentor/reports/institutional', { params: { format: 'csv' }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quickcheck-institutional-report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary || {};
  const reviewQueue = data?.reviewQueue || [];
  const riskDistribution = data?.riskDistribution || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => ({ level, count: 0 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Mentor command center</p>
          <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950 dark:text-white">Institutional verification operations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Monitor certificate intelligence, review high-risk uploads, track placement readiness, and coordinate fraud decisions from one enterprise-grade command surface.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/mentor/review">
            <FileWarning size={16} />
            Review queue
          </Button>
          <Button as={Link} to="/mentor/analytics" variant="secondary">
            <BrainCircuit size={16} />
            Analytics
          </Button>
          <Button variant="secondary" onClick={downloadReport}>
            <Download size={16} />
            Report
          </Button>
        </div>
      </div>

      {error && <GlassPanel className="p-4 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</GlassPanel>}

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Students" value={summary.students || 0} detail="Tracked learners" icon={UsersRound} accent="cyan" />
        <MetricCard label="Uploads" value={summary.total || 0} detail={`${summary.PENDING || 0} pending`} icon={ClipboardCheck} accent="green" delay={0.04} />
        <MetricCard label="Verified" value={summary.VERIFIED || 0} detail="Mentor accepted" icon={BadgeCheck} accent="green" delay={0.08} />
        <MetricCard label="Suspicious" value={summary.suspicious || 0} detail="Needs attention" icon={FileWarning} accent="amber" delay={0.12} />
        <MetricCard label="Avg Risk" value={`${summary.avgFraud || 0}%`} detail="AI probability" icon={AlertTriangle} accent="rose" delay={0.16} />
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <GlassPanel className="min-w-0 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">Fraud and upload trends</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live institutional upload pressure and risk movement.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-300">
              <RadioTower size={14} />
              Monitoring active
            </span>
          </div>
          <div className="mt-5 h-[300px] min-h-[260px] w-full overflow-hidden">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%" debounce={80}>
                <AreaChart data={data?.fraudTrends || []} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="uploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38D5FF" stopOpacity={0.36} />
                      <stop offset="100%" stopColor="#38D5FF" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="risk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B8A" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#FF6B8A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="uploads" axisLine={false} tickLine={false} width={42} domain={[0, 'dataMax + 5']} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="risk" orientation="right" axisLine={false} tickLine={false} width={38} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                  <Area yAxisId="uploads" type="monotone" dataKey="uploads" stroke="#38D5FF" strokeWidth={2.5} fill="url(#uploads)" dot={false} activeDot={{ r: 4 }} />
                  <Area yAxisId="risk" type="monotone" dataKey="avgRisk" stroke="#FF6B8A" strokeWidth={2.5} fill="url(#risk)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="flex min-w-0 flex-col p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">AI risk posture</p>
          <div className="mt-4 flex justify-center">
            <CircularScore value={summary.avgFraud || 0} label="Avg Risk" tone={(summary.avgFraud || 0) >= 65 ? 'rose' : (summary.avgFraud || 0) >= 35 ? 'amber' : 'green'} size={124} />
          </div>
          <div className="mt-4 h-[150px] w-full overflow-hidden">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%" debounce={80}>
                <PieChart>
                  <Pie data={riskDistribution} dataKey="count" nameKey="level" innerRadius={42} outerRadius={64} paddingAngle={3} cx="50%" cy="50%">
                    {riskDistribution.map((entry) => (
                      <Cell key={entry.level} fill={riskColors[entry.level]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <GlassPanel className="min-w-0 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-cyber-amber">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">Fraud review queue</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Approve, reject, override, lock, or rerun AI analysis.</p>
              </div>
            </div>
            <Button as={Link} to="/mentor/review" variant="secondary">
              Open queue
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {loading && <Skeleton className="h-28" />}
            {!loading &&
              reviewQueue.map((certificate, index) => (
                <motion.button
                  key={certificate._id || certificate.id}
                  type="button"
                  onClick={() => setActiveReview(certificate)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="focus-ring w-full rounded-2xl border border-slate-900/10 bg-white/55 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyber-cyan/40 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">{certificate.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {certificate.student?.name} - {certificate.organization?.name} - {certificate.analysis?.fraudProbability || 0}% probability
                      </p>
                    </div>
                    <RiskPill level={certificate.riskLevel || 'MEDIUM'} />
                  </div>
                </motion.button>
              ))}
            {!loading && reviewQueue.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No certificates require review right now.</p>}
          </div>
        </GlassPanel>

        <GlassPanel className="min-w-0 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
              <Bell size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">Notification center</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fraud, duplicate, and manual review alerts.</p>
            </div>
          </div>
          <div className="mt-5 max-h-[430px] overflow-auto pr-1">
            {loading ? <Skeleton className="h-32" /> : <NotificationCenter items={data?.notifications || []} />}
          </div>
        </GlassPanel>
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <GlassPanel className="min-w-0 p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Department readiness analytics</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Placement intelligence by department.</p>
          <div className="mt-5 h-[280px] min-h-[240px] w-full overflow-hidden">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%" debounce={80}>
                <BarChart data={data?.departmentStats || []} margin={{ top: 12, right: 8, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" vertical={false} />
                  <XAxis dataKey="department" axisLine={false} tickLine={false} interval={0} minTickGap={8} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} width={42} domain={[0, 100]} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                  <Bar dataKey="avgReadiness" fill="#37E6A0" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  <Bar dataKey="avgRisk" fill="#FF6B8A" radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="min-w-0 p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Institutional activity</p>
          <div className="mt-5 max-h-[360px] overflow-auto pr-1">
            {loading ? <Skeleton className="h-32" /> : <ActivityFeed items={data?.activity || []} />}
          </div>
        </GlassPanel>
      </div>

      <ReviewDrawer certificate={activeReview} onClose={() => setActiveReview(null)} onReview={review} onModerate={moderate} onRerun={rerun} />
    </div>
  );
}
