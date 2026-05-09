import { motion } from 'framer-motion';
import { FileWarning, Search, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { ReviewDrawer } from '../components/mentor/ReviewDrawer.jsx';
import { RiskPill } from '../components/mentor/RiskPill.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function MentorReviewQueuePage() {
  const [query, setQuery] = useState('');
  const [activeReview, setActiveReview] = useState(null);
  const { data, loading, reload } = useAsync(async () => (await api.get('/mentor/review-queue', { params: { limit: 36 } })).data.items, []);
  const items = (data || []).filter((certificate) => `${certificate.title} ${certificate.student?.name} ${certificate.organization?.name}`.toLowerCase().includes(query.toLowerCase()));

  const review = async (certificate, status, notes = '') => {
    await api.patch(`/mentor/certificates/${certificate._id || certificate.id}/review`, { status, reviewNotes: notes, overrideReason: notes });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Fraud review queue</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Suspicious certificate operations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Triage AI-flagged uploads, inspect anomalies, override decisions, and record mentor reasoning.
          </p>
        </div>
        <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 dark:border-white/10 dark:bg-white/[0.06]">
          <Search size={17} className="text-cyber-cyan" />
          <input className="w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" placeholder="Search review queue" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
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
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-cyber-amber">
                      <FileWarning size={22} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950 dark:text-white">{certificate.title}</p>
                        <RiskPill level={certificate.riskLevel} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {certificate.student?.name} - {certificate.organization?.name} - Uploaded {certificate.createdAt ? new Date(certificate.createdAt).toLocaleString() : 'recently'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(certificate.analysis?.suspiciousIndicators || ['AI confidence requires mentor review']).slice(0, 3).map((indicator) => (
                          <span key={indicator} className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <ShieldAlert size={13} />
                            {indicator}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
                    {[
                      ['Fraud', `${certificate.analysis?.fraudProbability || 0}%`],
                      ['Confidence', `${certificate.analysis?.confidence || 0}%`],
                      ['Visual', `${certificate.analysis?.visualSimilarity || 0}%`]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-slate-900/5 p-3 dark:bg-white/10">
                        <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
                        <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setActiveReview(certificate)}>Open review</Button>
                    <Button variant="secondary" onClick={() => review(certificate, 'VERIFIED', 'Approved from queue.')}>Approve</Button>
                    <Button variant="danger" onClick={() => review(certificate, 'REJECTED', 'Rejected from queue.')}>Reject</Button>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        {!loading && items.length === 0 && <GlassPanel className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">No suspicious certificates match this filter.</GlassPanel>}
      </div>

      <ReviewDrawer certificate={activeReview} onClose={() => setActiveReview(null)} onReview={review} onModerate={moderate} onRerun={rerun} />
    </div>
  );
}
