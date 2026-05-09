import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, FileScan, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, pretty, VERIFICATION_LABELS } from '../../lib/catalogMeta.js';

export function CertificationDetailsModal({ certification, onClose, onSelect, selected, showUploadActions = true }) {
  return (
    <AnimatePresence>
      {certification && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/20 bg-white/92 p-5 shadow-panel backdrop-blur-2xl dark:bg-obsidian/95"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink text-cyber-cyan dark:bg-white dark:text-ink">
                  <FileScan size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">{certification.organization?.name || certification.organizationName}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{certification.name || certification.certificateName}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={certification.templateStatus || 'NOT_TRAINED'} />
                    <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold uppercase text-cyan-700 dark:text-cyan-300">
                      {pretty(certification.verificationType, VERIFICATION_LABELS)}
                    </span>
                  </div>
                </div>
              </div>
              <button className="focus-ring rounded-2xl p-2 text-slate-500 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10" onClick={onClose} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <p className="mt-6 leading-7 text-slate-600 dark:text-slate-300">
              {certification.description || 'Certification profile managed by mentors for template-scoped fraud probability and evidence analysis.'}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                ['Category', pretty(certification.category, CATEGORY_LABELS)],
                ['Difficulty', pretty(certification.difficultyLevel, DIFFICULTY_LABELS)],
                ['Uploads', certification.uploadCount || 0],
                ['Template', certification.templateReady ? 'Ready' : 'Pending']
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-900/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-2 font-black text-slate-950 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Skill signals</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(certification.skills || []).map((skill) => (
                  <span key={skill} className="rounded-full bg-slate-900/5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {showUploadActions ? (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={onSelect}>
                  <BadgeCheck size={16} />
                  {selected ? 'Selected' : 'Select certification'}
                </Button>
                <Button as={Link} to="/student/upload" onClick={onSelect}>
                  <UploadCloud size={16} />
                  Continue to upload
                </Button>
              </div>
            ) : (
              <div className="mt-7 flex justify-end">
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
