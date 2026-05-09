import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, FileWarning, RefreshCcw, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../common/Button.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { RiskPill } from './RiskPill.jsx';

export function ReviewDrawer({ certificate, onClose, onReview, onModerate, onRerun }) {
  const [notes, setNotes] = useState('');
  const risk = certificate?.analysis?.fraudProbability || 0;
  const riskLevel = risk >= 85 ? 'CRITICAL' : risk >= 65 ? 'HIGH' : risk >= 35 ? 'MEDIUM' : 'LOW';

  return (
    <AnimatePresence>
      {certificate && (
        <motion.div className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="ml-auto h-full w-full max-w-2xl overflow-auto border-l border-white/10 bg-white/94 p-5 shadow-panel dark:bg-obsidian/96"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyber-green">Fraud review</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{certificate.title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {certificate.student?.name} - {certificate.organization?.name}
                </p>
              </div>
              <button className="focus-ring rounded-2xl p-2 text-slate-500 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10" onClick={onClose} aria-label="Close review">
                <X size={19} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-900/5 p-4 dark:bg-white/10">
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Fraud</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{risk}%</p>
              </div>
              <div className="rounded-2xl bg-slate-900/5 p-4 dark:bg-white/10">
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Confidence</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{certificate.analysis?.confidence || 0}%</p>
              </div>
              <div className="rounded-2xl bg-slate-900/5 p-4 dark:bg-white/10">
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Name</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{certificate.analysis?.nameSimilarity || 0}%</p>
              </div>
              <div className="rounded-2xl bg-slate-900/5 p-4 dark:bg-white/10">
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Visual</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{certificate.analysis?.visualSimilarity || 0}%</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StatusBadge status={certificate.status} />
              <RiskPill level={riskLevel} />
              {certificate.locked && <span className="rounded-full bg-slate-900/10 px-2.5 py-1 text-[11px] font-black uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">Locked</span>}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-900/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-cyber-amber" />
                <p className="text-sm font-black text-slate-950 dark:text-white">Detected anomalies</p>
              </div>
              <div className="mt-4 space-y-2">
                {(certificate.analysis?.suspiciousIndicators || ['No critical anomaly recorded']).map((indicator) => (
                  <div key={indicator} className="rounded-2xl bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {indicator}
                  </div>
                ))}
              </div>
            </div>

            <textarea
              className="field mt-5 min-h-28 resize-none"
              placeholder="Add mentor review comments or override reasoning"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button onClick={() => onReview(certificate, 'VERIFIED', notes)}>
                <BadgeCheck size={16} />
                Approve certificate
              </Button>
              <Button variant="danger" onClick={() => onReview(certificate, 'REJECTED', notes)}>
                <FileWarning size={16} />
                Reject certificate
              </Button>
              <Button variant="secondary" onClick={() => onReview(certificate, 'REVIEW_REQUIRED', notes)}>
                Request manual review
              </Button>
              <Button variant="secondary" onClick={() => onRerun(certificate)}>
                <RefreshCcw size={16} />
                Re-run AI analysis
              </Button>
              <Button variant="secondary" onClick={() => onModerate(certificate, { locked: !certificate.locked })}>
                {certificate.locked ? 'Unlock certificate' : 'Lock certificate'}
              </Button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
