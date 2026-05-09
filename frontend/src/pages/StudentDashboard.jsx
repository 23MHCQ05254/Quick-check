import { motion } from 'framer-motion';
import { Award, BadgeCheck, Bell, BriefcaseBusiness, ShieldAlert, UploadCloud } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { MetricCard } from '../components/common/MetricCard.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';

const readinessData = [
  { month: 'Jan', score: 46 },
  { month: 'Feb', score: 52 },
  { month: 'Mar', score: 58 },
  { month: 'Apr', score: 64 },
  { month: 'May', score: 71 }
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => (await api.get('/certificates/mine')).data.items, []);
  const certificates = data || [];
  const verified = certificates.filter((item) => item.status === 'VERIFIED').length;
  const review = certificates.filter((item) => item.status === 'REVIEW_REQUIRED').length;
  const avgFraud = certificates.length
    ? Math.round(certificates.reduce((sum, item) => sum + (item.analysis?.fraudProbability || 0), 0) / certificates.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Student vault</p>
          <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950 dark:text-white">Welcome back, {user.name.split(' ')[0]}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Upload only after choosing the exact certification type. QuickCheck compares every certificate against its selected mentor-trained profile.
          </p>
        </div>
        <Button as={Link} to="/student/catalog" className="self-start md:self-auto">
          <UploadCloud size={17} />
          Browse catalog
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Certificates" value={certificates.length} detail={`${verified} verified by mentors`} icon={Award} accent="cyan" />
        <MetricCard label="Fraud Avg" value={`${avgFraud}%`} detail="AI-assisted probability, not a final verdict" icon={ShieldAlert} accent="rose" delay={0.05} />
        <MetricCard label="Skill Score" value={user.skillScore || 42} detail="Based on verified organizations and skills" icon={BadgeCheck} accent="green" delay={0.1} />
        <MetricCard label="Readiness" value={`${user.placementReadiness || 38}%`} detail={`${review} item waiting for review`} icon={BriefcaseBusiness} accent="amber" delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <GlassPanel className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">Placement readiness signal</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verified achievements raise portfolio confidence over time.</p>
            </div>
          </div>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readinessData}>
                <defs>
                  <linearGradient id="readiness" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#37E6A0" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#37E6A0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                <Area type="monotone" dataKey="score" stroke="#37E6A0" strokeWidth={3} fill="url(#readiness)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
              <Bell size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">Notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.notifications?.length || 0} active</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {(user.notifications || []).map((note) => (
              <div key={note.title} className="rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-sm font-bold text-slate-950 dark:text-white">{note.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{note.body}</p>
              </div>
            ))}
            {!user.notifications?.length && <p className="text-sm text-slate-500 dark:text-slate-400">No unread notifications.</p>}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-black text-slate-950 dark:text-white">Recent certificates</p>
          <Link className="text-sm font-bold text-cyber-cyan" to="/student/certificates">
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {loading && <Skeleton className="h-20" />}
          {!loading &&
            certificates.slice(0, 4).map((certificate) => (
              <motion.div
                key={certificate._id || certificate.id}
                whileHover={{ y: -2 }}
                className="flex flex-col gap-3 rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{certificate.title}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{certificate.organization?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{certificate.analysis?.fraudProbability || 0}% risk</span>
                  <StatusBadge status={certificate.status} />
                </div>
              </motion.div>
            ))}
        </div>
      </GlassPanel>
    </div>
  );
}
