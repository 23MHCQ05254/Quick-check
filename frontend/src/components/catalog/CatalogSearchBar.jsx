import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export function CatalogSearchBar({ search, onSearch, resultCount, onToggleFilters, filtersOpen }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 dark:border-white/10 dark:bg-white/[0.06]">
          <Search size={19} className="text-cyber-cyan" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
            placeholder="Search certifications, organizations, skills..."
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
          {search && (
            <button className="focus-ring rounded-xl p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white" onClick={() => onSearch('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{resultCount} results</p>
          <button
            type="button"
            onClick={onToggleFilters}
            className={`focus-ring inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition lg:hidden ${
              filtersOpen ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-200'
            }`}
          >
            <SlidersHorizontal size={17} />
            Filters
          </button>
        </div>
      </div>
    </motion.div>
  );
}

