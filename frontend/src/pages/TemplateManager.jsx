import { BadgeCheck, FileStack, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api, trainTemplate } from '../lib/api.js';

export default function TemplateManager() {
  const [certificationId, setCertificationId] = useState('');
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [training, setTraining] = useState(false);
  const templates = useAsync(async () => (await api.get('/templates')).data.items, []);
  const catalog = useAsync(async () => (await api.get('/catalog/certifications')).data.items, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setTraining(true);
    try {
      const { data } = await trainTemplate(certificationId, files);
      setMessage(data.qualityWarning || 'Template profile trained and activated.');
      setFiles([]);
      await templates.reload();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Template training failed');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <GlassPanel className="p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-cyber-green">
            <UploadCloud size={19} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Train template profile</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload 5-10 genuine references per certification.</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <select className="field" value={certificationId} onChange={(event) => setCertificationId(event.target.value)} required>
            <option value="">Select certification</option>
            {(catalog.data || []).map((item) => (
              <option key={item._id || item.id} value={item._id || item.id}>
                {item.organization?.name} · {item.name}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyber-green/40 bg-emerald-500/5 px-5 py-10 text-center transition hover:bg-emerald-500/10">
            <FileStack className="text-cyber-green" size={28} />
            <span className="mt-3 text-sm font-bold text-slate-950 dark:text-white">{files.length ? `${files.length} sample files selected` : 'Choose reference certificates'}</span>
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mentor-verified genuine certificates only</span>
            <input className="hidden" multiple type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
          </label>

          {message && <p className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-700 dark:text-cyan-300">{message}</p>}

          <Button className="w-full" type="submit" disabled={!certificationId || !files.length || training}>
            <BadgeCheck size={17} />
            {training ? 'Extracting profile' : 'Train reference template'}
          </Button>
        </form>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Template registry</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Active certification profiles</h2>
        </div>

        <div className="mt-5 grid gap-3">
          {templates.loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24" />)}
          {!templates.loading &&
            (templates.data || []).map((template) => (
              <div key={template._id || template.id} className="rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-slate-950 dark:text-white">{template.certification?.name}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{template.organization?.name}</p>
                  </div>
                  <StatusBadge status={template.status} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {[
                    ['Version', template.version],
                    ['Samples', template.extractedProfile?.metadata?.trainedSamples || template.samples?.length || 0],
                    ['Name threshold', template.thresholds?.nameSimilarity || 78],
                    ['Visual threshold', template.thresholds?.visualSimilarity || 70]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-slate-900/5 p-3 dark:bg-white/10">
                      <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </GlassPanel>
    </div>
  );
}

