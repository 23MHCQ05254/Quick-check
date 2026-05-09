import { BarChart3, BrainCircuit, ShieldAlert, Trophy } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { MetricCard } from '../components/common/MetricCard.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

const colors = ['#38D5FF', '#37E6A0', '#F6C667', '#FF6B8A', '#8B5CF6'];

export default function InstitutionalAnalyticsPage() {
  const { data, loading } = useAsync(async () => {
    const [analytics, placement] = await Promise.all([api.get('/mentor/analytics'), api.get('/mentor/placement')]);
    return { ...analytics.data, placement: placement.data };
  }, []);

  const totalUploads = (data?.uploadTrends || []).reduce((sum, item) => sum + item.uploads, 0);
  const totalSuspicious = (data?.uploadTrends || []).reduce((sum, item) => sum + item.suspicious, 0);
  const bestDepartment = [...(data?.departmentAnalytics || [])].sort((a, b) => b.avgReadiness - a.avgReadiness)[0];
  const topOrg = [...(data?.organizationRisk || [])].sort((a, b) => b.uploads - a.uploads)[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-cyber-green">Institutional analytics</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Placement and fraud intelligence</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Analyze upload trends, fraud statistics, department readiness, certification strength, and organization popularity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Uploads" value={totalUploads} detail="Across trend window" icon={BarChart3} accent="cyan" />
        <MetricCard label="Suspicious" value={totalSuspicious} detail="AI-assisted review signals" icon={ShieldAlert} accent="rose" delay={0.05} />
        <MetricCard label="Top Department" value={bestDepartment?.department || 'N/A'} detail={`${bestDepartment?.avgReadiness || 0}% readiness`} icon={Trophy} accent="green" delay={0.1} />
        <MetricCard label="Top Org" value={topOrg?.organization || 'N/A'} detail={`${topOrg?.uploads || 0} uploads`} icon={BrainCircuit} accent="amber" delay={0.15} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <GlassPanel className="p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Upload and fraud trends</p>
          <div className="mt-6 h-80">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.uploadTrends || []}>
                  <defs>
                    <linearGradient id="trendUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38D5FF" stopOpacity={0.36} />
                      <stop offset="100%" stopColor="#38D5FF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                  <Area type="monotone" dataKey="uploads" stroke="#38D5FF" strokeWidth={3} fill="url(#trendUploads)" />
                  <Area type="monotone" dataKey="suspicious" stroke="#FF6B8A" strokeWidth={3} fill="rgba(255,107,138,.08)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Risk distribution</p>
          <div className="mt-6 h-80">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.riskDistribution || []} dataKey="count" nameKey="level" innerRadius={58} outerRadius={100} paddingAngle={3}>
                    {(data?.riskDistribution || []).map((entry, index) => (
                      <Cell key={entry.level} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassPanel className="p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Department comparison</p>
          <div className="mt-6 h-80">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.departmentAnalytics || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" vertical={false} />
                  <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                  <Bar dataKey="avgReadiness" fill="#37E6A0" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="avgRisk" fill="#FF6B8A" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">Skill readiness indicators</p>
          <div className="mt-6 h-80">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data?.placement?.skillReadiness || []}>
                  <PolarGrid stroke="rgba(148,163,184,.25)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Radar dataKey="strength" stroke="#38D5FF" fill="#38D5FF" fillOpacity={0.24} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,.25)' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

