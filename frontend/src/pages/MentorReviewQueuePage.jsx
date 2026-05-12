import { motion } from 'framer-motion';
import { CheckCircle, FileCheck2, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function MentorReviewQueuePage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, loading } = useAsync(
    async () => (await api.get('/mentor/certificates', { params: { limit: 50, sort: '-createdAt' } })).data.items,
    []
  );

  const items = (data || []).filter((certificate) => {
    const matchesQuery =
      `${certificate.title} ${certificate.student?.name} ${certificate.organization?.name}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || certificate.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const getVerdictIcon = (status) => {
    if (status === 'VERIFIED') return <CheckCircle size={20} className="text-cyber-green" />;
    if (status === 'REJECTED') return <XCircle size={20} className="text-rose-500" />;
    return <FileCheck2 size={20} className="text-slate-400" />;
  };

  const getVerdictLabel = (status) => {
    if (status === 'VERIFIED') return 'AI ACCEPTED';
    if (status === 'REJECTED') return 'AI REJECTED';
    return 'PENDING';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Automated verification</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">AI Verification Logs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Review real-time AI verdicts on certificate uploads. Confidence ≥95% = ACCEPTED. Confidence &lt;95% = REJECTED. Duplicates are automatically rejected.
          </p>
        </div>
        <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 dark:border-white/10 dark:bg-white/[0.06]">
          <Search size={17} className="text-cyber-cyan" />
          <input
            className="w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            placeholder="Search verification logs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'VERIFIED', 'REJECTED', 'PENDING'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-2 rounded-xl text-sm font-bold transition ${statusFilter === status
                ? 'bg-cyber-cyan text-slate-950 dark:text-white'
                : 'border border-slate-900/10 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10'
              }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-36" />)}
        {!loading &&
          items.map((certificate, index) => (
            <motion.div
              key={certificate._id || certificate.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
            >
              <GlassPanel className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900/10 dark:bg-white/10">
                      {getVerdictIcon(certificate.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950 dark:text-white">{certificate.title}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/10 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {getVerdictLabel(certificate.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {certificate.student?.name} • {certificate.organization?.name} • Uploaded{' '}
                        {certificate.createdAt ? new Date(certificate.createdAt).toLocaleDateString() : 'recently'}
                      </p>
                      {certificate.analysis?.suspiciousIndicators?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {certificate.analysis.suspiciousIndicators.slice(0, 3).map((indicator) => (
                            <span key={indicator} className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              <ShieldAlert size={13} />
                              {indicator}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4 xl:w-[520px]">
                    {[
                      ['Confidence', `${certificate.analysis?.confidence || 0}%`],
                      ['Fraud Score', `${certificate.analysis?.fraudProbability || 0}%`],
                      ['Name Match', `${certificate.analysis?.nameSimilarity || 0}%`],
                      ['Visual Match', `${certificate.analysis?.visualSimilarity || 0}%`]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-slate-900/5 p-3 dark:bg-white/10">
                        <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
                        <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        {!loading && items.length === 0 && (
          <GlassPanel className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            No certificates match this filter.
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
