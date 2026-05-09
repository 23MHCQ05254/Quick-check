import { SearchX } from 'lucide-react';
import { Button } from '../common/Button.jsx';

export function EmptyCatalogState({ onReset }) {
  return (
    <div className="glass-panel grid min-h-[280px] place-items-center rounded-2xl p-8 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-900/5 text-slate-500 dark:bg-white/10 dark:text-slate-300">
          <SearchX size={24} />
        </div>
        <h3 className="mt-5 text-lg font-black text-slate-950 dark:text-white">No certifications found</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          Refine the search or clear filters to return to the full certification catalog.
        </p>
        <Button className="mt-5" variant="secondary" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

