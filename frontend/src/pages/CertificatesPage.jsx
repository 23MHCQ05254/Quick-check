import { ExternalLink, FileCheck2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api, API_BASE_URL } from '../lib/api.js';

export default function CertificatesPage() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => (await api.get('/certificates/mine')).data.items, []);
  const certificates = data || [];
  const apiRoot = API_BASE_URL.replace('/api', '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Certificate vault</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Verification history</h2>
        </div>
        <Button as={Link} to={`/portfolio/${user.publicSlug}`}>
          <ExternalLink size={16} />
          Public portfolio
        </Button>
      </div>

      <div className="grid gap-4">
        {loading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
        {!loading &&
          certificates.map((certificate) => (
            <GlassPanel key={certificate._id || certificate.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-cyber-green">
                    <FileCheck2 size={22} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950 dark:text-white">{certificate.title}</p>
                      <StatusBadge status={certificate.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {certificate.organization?.name} - {certificate.certificateId || 'ID not provided'}
                    </p>
                    {certificate.fileUrl && (
                      <a className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-cyber-cyan" href={`${apiRoot}${certificate.fileUrl}`} target="_blank" rel="noreferrer">
                        View upload
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
                  {[
                    ['Risk', `${certificate.analysis?.fraudProbability || 0}%`],
                    ['Name', `${certificate.analysis?.nameSimilarity || 0}%`],
                    ['Visual', `${certificate.analysis?.visualSimilarity || 0}%`]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-900/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {!!certificate.analysis?.suspiciousIndicators?.length && (
                <div className="mt-4 space-y-2">
                  {certificate.analysis.suspiciousIndicators.map((indicator) => (
                    <div key={indicator} className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                      <ShieldAlert size={16} />
                      {indicator}
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          ))}
      </div>
    </div>
  );
}
