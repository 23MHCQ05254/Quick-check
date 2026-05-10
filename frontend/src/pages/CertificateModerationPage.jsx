import { AnimatePresence, motion } from 'framer-motion';
import { Archive, FileCheck2, Lock, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { RiskPill } from '../components/mentor/RiskPill.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function CertificateModerationPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const { data, loading, reload } = useAsync(
    async () => (
      await api.get('/mentor/certificates', { params: { limit: 48, status: status || undefined, search: debouncedSearch || undefined } })
    ).data.items,
    [status, debouncedSearch]
  );

  const moderate = async (certificate, patch) => {
    await api.patch(`/mentor/certificates/${certificate._id || certificate.id}/moderate`, patch);
    reload();
  };

  const rerun = async (certificate) => {
    await api.post(`/mentor/certificates/${certificate._id || certificate.id}/rerun-analysis`);
    reload();
  };

  const archive = async (certificate) => {
    await api.delete(`/mentor/certificates/${certificate._id || certificate.id}`);
    reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-cyber-green">Certificate moderation</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Verification state control</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Edit status, lock uploads, rerun AI analysis, and archive invalid certificates from a protected mentor-only panel.
        </p>
      </div>

      <GlassPanel className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 dark:border-white/10 dark:bg-white/[0.06]">
            <Search size={17} className="text-cyber-cyan" />
            <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" placeholder="Search certificates, students, organizations" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="field lg:w-56" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REVIEW_REQUIRED">Review required</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </GlassPanel>

      <div className="grid gap-4">
        {loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
        <AnimatePresence>
          {!loading &&
            (data || []).map((certificate, index) => {
              const risk = certificate.analysis?.fraudProbability || 0;
              const level = risk >= 85 ? 'CRITICAL' : risk >= 65 ? 'HIGH' : risk >= 35 ? 'MEDIUM' : 'LOW';
              return (
                <motion.div key={certificate._id || certificate.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: index * 0.03 }}>
                  <GlassPanel className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
                          <FileCheck2 size={22} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-950 dark:text-white">{certificate.title}</p>
                            <StatusBadge status={certificate.status} />
                            <RiskPill level={level} />
                          </div>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{certificate.student?.name} - {certificate.organization?.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => moderate(certificate, { status: 'VERIFIED', reviewNotes: 'Marked verified by mentor.' })}>
                          <ShieldCheck size={16} />
                          Verify
                        </Button>
                        <Button variant="secondary" onClick={() => moderate(certificate, { locked: !certificate.locked })}>
                          <Lock size={16} />
                          {certificate.locked ? 'Unlock' : 'Lock'}
                        </Button>
                        <Button variant="secondary" onClick={() => rerun(certificate)}>
                          <RefreshCcw size={16} />
                          Rerun
                        </Button>
                        <Button variant="danger" onClick={() => archive(certificate)}>
                          <Archive size={16} />
                          Archive
                        </Button>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
    </div>
  );
}
