import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { DIFFICULTY_LABELS, pretty, VERIFICATION_LABELS, CATEGORY_LABELS } from '../../lib/catalogMeta.js';

function FilterGroup({ label, value, options, onChange, labels }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`focus-ring rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${
            value === '' ? 'bg-ink text-white shadow-glow dark:bg-white dark:text-ink' : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
          }`}
        >
          All
        </button>
        {options.map((option) => (
          <button
            type="button"
            key={option.value || option}
            onClick={() => onChange(option.value || option)}
            className={`focus-ring rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${
              value === (option.value || option)
                ? 'bg-ink text-white shadow-glow dark:bg-white dark:text-ink'
                : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
            }`}
          >
            {option.label || pretty(option, labels)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterSidebar({ facets, filters, updateFilter, resetFilters, open = true }) {
  const panel = (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="glass-panel rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
            <SlidersHorizontal size={18} />
          </div>
          <p className="text-sm font-black text-slate-950 dark:text-white">Catalog filters</p>
        </div>
        <button className="focus-ring rounded-xl p-2 text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/10" onClick={resetFilters} aria-label="Reset filters" title="Reset filters">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <FilterGroup
          label="Organization"
          value={filters.organization}
          options={(facets?.organizations || []).map((org) => ({ value: org._id || org.id || org.slug, label: org.name }))}
          onChange={(value) => updateFilter('organization', value)}
        />
        <FilterGroup label="Category" value={filters.category} options={facets?.categories || []} labels={CATEGORY_LABELS} onChange={(value) => updateFilter('category', value)} />
        <FilterGroup label="Difficulty" value={filters.difficultyLevel} options={facets?.difficultyLevels || []} labels={DIFFICULTY_LABELS} onChange={(value) => updateFilter('difficultyLevel', value)} />
        <FilterGroup label="Verification" value={filters.verificationType} options={facets?.verificationTypes || []} labels={VERIFICATION_LABELS} onChange={(value) => updateFilter('verificationType', value)} />
      </div>
    </motion.aside>
  );

  return (
    <>
      <div className="hidden lg:block">{panel}</div>
      <AnimatePresence>{open && <div className="lg:hidden">{panel}</div>}</AnimatePresence>
    </>
  );
}

