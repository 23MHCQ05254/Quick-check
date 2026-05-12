import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, FileUp, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { useCertificationSelection } from '../context/CertificationSelectionContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api, uploadCertificate } from '../lib/api.js';
import OverlayBoxes from '../components/common/OverlayBoxes.jsx';

export default function UploadCertificatePage() {
  const [query, setQuery] = useState('');
  const [file, setFile] = useState(null);
  const [certificateId, setCertificateId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const imgRef = useRef();
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const { selectedCertification, selectCertification } = useCertificationSelection();

  const formatPercent = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    return Math.round(numeric).toString();
  };

  const { data: catalog, loading } = useAsync(async () => (await api.get('/catalog')).data.items, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (catalog || []).filter((item) => `${item.name} ${item.organization?.name}`.toLowerCase().includes(q));
  }, [catalog, query]);

  const selectedMismatchWarning = useMemo(() => {
    if (!file || !selectedCertification) return '';
    const filename = file.name.toLowerCase();
    const certName = (selectedCertification.name || '').toLowerCase();
    const orgName = (selectedCertification.organization?.name || '').toLowerCase();
    const certTokens = certName.split(/[^a-z0-9]+/).filter((token) => token.length > 3);
    const orgTokens = orgName.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
    const hasCertHint = certTokens.some((token) => filename.includes(token));
    const hasOrgHint = orgTokens.some((token) => filename.includes(token));
    return hasCertHint || hasOrgHint
      ? ''
      : 'The file name does not look like the selected certification. Verify the selected template before running AI analysis.';
  }, [file, selectedCertification]);

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedCertification || !file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await uploadCertificate({
        certificationId: selectedCertification._id || selectedCertification.id,
        certificateId,
        issueDate,
        certificate: file
      });
      setResult(data.certificate);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <GlassPanel className="p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
            <Search size={19} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Certification catalog</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Select before upload.</p>
          </div>
        </div>

        <input className="field mt-5" placeholder="Search MongoDB, Cisco, AWS..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button as={Link} to="/dashboard/catalog" variant="secondary" className="mt-3 w-full">
          Open full catalog
          <ArrowRight size={16} />
        </Button>

        <div className="no-scrollbar mt-4 max-h-[540px] space-y-3 overflow-auto pr-1">
          {loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20" />)}
          {!loading &&
            filtered.map((item) => {
              const active = (selectedCertification?._id || selectedCertification?.id) === (item._id || item.id);
              return (
                <button
                  key={item._id || item.id}
                  type="button"
                  onClick={() => selectCertification(item)}
                  className={`focus-ring w-full rounded-2xl border p-4 text-left transition ${active
                    ? 'border-cyber-cyan/60 bg-cyan-500/10 shadow-glow'
                    : 'border-slate-900/10 bg-white/55 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.04]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950 dark:text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.organization?.name}</p>
                    </div>
                    {item.templateReady && <CheckCircle2 className="text-cyber-green" size={18} />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.skills || []).slice(0, 3).map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
        </div>
      </GlassPanel>

      <div className="space-y-6">
        <GlassPanel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyber-green">Upload analysis</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Template-scoped verification</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                The uploaded file is analyzed only against the selected certification profile. Duplicate evidence is checked after OCR, QR, and hashing signals return.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">Selected certification</p>
              <p className="mt-2 font-black text-slate-950 dark:text-white">{selectedCertification ? selectedCertification.name : 'Choose from catalog'}</p>
              {selectedCertification && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedCertification.organization?.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input className="field" placeholder="Certificate ID" value={certificateId} onChange={(event) => setCertificateId(event.target.value)} />
              <input className="field" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyber-cyan/40 bg-cyan-500/5 px-5 py-10 text-center transition hover:bg-cyan-500/10">
              <FileUp className="text-cyber-cyan" size={28} />
              <span className="mt-3 text-sm font-bold text-slate-950 dark:text-white">{file ? file.name : 'Drop or choose certificate image/PDF'}</span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">PNG, JPG, or PDF up to 10 MB</span>
              <input className="hidden" type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>

            {selectedMismatchWarning && (
              <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                {selectedMismatchWarning}
              </p>
            )}

            {error && <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>}

            <Button type="submit" disabled={!selectedCertification || !file || uploading} className="w-full">
              <Sparkles size={17} />
              {uploading ? 'Analyzing certificate' : 'Run AI-assisted verification'}
            </Button>
          </form>
        </GlassPanel>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassPanel className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">Analysis result</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result.title}</p>
                  </div>
                  <StatusBadge status={result.status} />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="min-w-0 rounded-2xl bg-white/55 p-4 dark:bg-white/[0.04]">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Fraud probability</p>
                    <p className="mt-2 text-2xl font-black leading-none tabular-nums tracking-tight text-slate-950 dark:text-white sm:text-3xl">{formatPercent(result.analysis?.fraudProbability)}%</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-white/55 p-4 dark:bg-white/[0.04]">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Name match</p>
                    <p className="mt-2 text-2xl font-black leading-none tabular-nums tracking-tight text-slate-950 dark:text-white sm:text-3xl">{formatPercent(result.analysis?.nameSimilarity)}%</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-white/55 p-4 dark:bg-white/[0.04]">
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Visual match</p>
                    <p className="mt-2 text-2xl font-black leading-none tabular-nums tracking-tight text-slate-950 dark:text-white sm:text-3xl">{formatPercent(result.analysis?.visualSimilarity)}%</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI summary</p>
                    <div className="mt-3 space-y-2">
                      {(result.aiAnalysis?.aiReasoning || result.analysis?.suspiciousIndicators || []).map((indicator, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                          <ShieldAlert size={16} />
                          {indicator}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Visual verification</p>
                    <div className="mt-3 relative max-h-[560px] overflow-auto rounded-2xl border bg-white/60 p-2">
                      {result.fileUrl ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img ref={imgRef}
                            src={(api.defaults.baseURL || '').replace(/\/api\/*$/, '') + result.fileUrl}
                            alt="uploaded"
                            style={{ display: 'block', maxWidth: '720px', height: 'auto' }}
                            id="uploaded-preview"
                            onLoad={(e) => {
                              setImageSize({ width: e.target.naturalWidth, height: e.target.naturalHeight });
                            }}
                          />
                          <OverlayBoxes
                            boxes={result.extractedCertificateData?.textCoordinates || result.aiAnalysis?.mismatchedRegions || []}
                            imageWidth={imageSize.width || 720}
                            imageHeight={imageSize.height || 480}
                            color={'rgba(255,0,0,0.25)'}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No preview available</p>
                      )}
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
