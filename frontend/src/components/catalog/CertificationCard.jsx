import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, CheckCircle2, FileScan, ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { CATEGORY_ICONS, CATEGORY_LABELS, DIFFICULTY_LABELS, pretty, verificationIcon, VERIFICATION_LABELS } from '../../lib/catalogMeta.js';

export function CertificationCard({ certification, selected, onSelect, onDetails, index = 0 }) {
  const CategoryIcon = CATEGORY_ICONS[certification.category] || FileScan;
  const VerificationIcon = verificationIcon(certification.verificationType);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.22) }}
      whileHover={{ y: -5 }}
      className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur transition ${
        selected
          ? 'border-cyber-green/60 bg-emerald-500/10 shadow-glow'
          : 'border-slate-900/10 bg-white/68 shadow-panel hover:border-cyber-cyan/40 dark:border-white/10 dark:bg-white/[0.055]'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/60 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-cyber-cyan dark:bg-white dark:text-ink">
            <CategoryIcon size={21} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">{certification.organization?.name || certification.organizationName}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-black text-slate-950 dark:text-white">{certification.name || certification.certificateName}</h3>
          </div>
        </div>
        {selected ? <CheckCircle2 className="shrink-0 text-cyber-green" size={20} /> : <StatusBadge status={certification.templateStatus || 'NOT_TRAINED'} />}
      </div>

      <p className="mt-4 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500 dark:text-slate-400">
        {certification.description || 'Mentor-managed certification profile for template-scoped certificate intelligence.'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <div className="rounded-2xl bg-slate-900/5 p-3 dark:bg-white/10">
          <p>Category</p>
          <p className="mt-1 text-slate-950 dark:text-white">{pretty(certification.category, CATEGORY_LABELS)}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/5 p-3 dark:bg-white/10">
          <p>Difficulty</p>
          <p className="mt-1 text-slate-950 dark:text-white">{pretty(certification.difficultyLevel, DIFFICULTY_LABELS)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(certification.skills || []).slice(0, 4).map((skill) => (
          <span key={skill} className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-900/10 pt-4 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <VerificationIcon size={15} className="text-cyber-cyan" />
          {pretty(certification.verificationType, VERIFICATION_LABELS)}
          {!certification.templateReady && <ShieldAlert size={15} className="text-cyber-amber" />}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="min-h-10 px-3" onClick={onDetails}>
            Details
          </Button>
          <Button className="min-h-10 px-3" onClick={onSelect}>
            <BadgeCheck size={15} />
            Select
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

