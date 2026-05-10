import { AnimatePresence } from 'framer-motion';
import { ArrowRight, BadgeCheck, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { CatalogSearchBar } from '../components/catalog/CatalogSearchBar.jsx';
import { CertificationCard } from '../components/catalog/CertificationCard.jsx';
import { CertificationDetailsModal } from '../components/catalog/CertificationDetailsModal.jsx';
import { EmptyCatalogState } from '../components/catalog/EmptyCatalogState.jsx';
import { FilterSidebar } from '../components/catalog/FilterSidebar.jsx';
import { OrganizationExplorer } from '../components/catalog/OrganizationExplorer.jsx';
import { useCertificationSelection } from '../context/CertificationSelectionContext.jsx';
import { useCatalog } from '../hooks/useCatalog.js';
import { useState } from 'react';

export default function CertificationCatalogPage() {
  const catalog = useCatalog();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const { selectedCertification, selectCertification } = useCertificationSelection();

  const selectedId = selectedCertification?._id || selectedCertification?.id;

  const selectAndHold = (certification) => {
    selectCertification(certification);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Certification catalog</p>
          <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950 dark:text-white">Choose the analysis template</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Search, filter, and select the exact certification before upload. QuickCheck uses this selection to load the matching mentor-trained template profile.
          </p>
        </div>
        <Button as={Link} to="/dashboard/upload" disabled={!selectedCertification}>
          <BadgeCheck size={17} />
          Continue to upload
          <ArrowRight size={17} />
        </Button>
      </div>

      {selectedCertification && (
        <GlassPanel className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-cyber-green">
                <Layers3 size={19} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">Selected for upload</p>
                <p className="font-black text-slate-950 dark:text-white">{selectedCertification.name || selectedCertification.certificateName}</p>
              </div>
            </div>
            <Button as={Link} to="/dashboard/upload" className="self-start sm:self-auto">
              Upload certificate
            </Button>
          </div>
        </GlassPanel>
      )}

      <CatalogSearchBar
        search={catalog.search}
        onSearch={catalog.setSearch}
        resultCount={catalog.pagination.total}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
      />

      <OrganizationExplorer
        organizations={catalog.facets?.organizations || []}
        activeOrganization={catalog.filters.organization}
        onSelect={(value) => catalog.updateFilter('organization', value)}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          facets={catalog.facets}
          filters={catalog.filters}
          updateFilter={catalog.updateFilter}
          resetFilters={catalog.resetFilters}
          open={filtersOpen}
        />

        <section className="min-w-0 space-y-4">
          {catalog.error && <GlassPanel className="p-4 text-sm font-semibold text-rose-600 dark:text-rose-300">{catalog.error}</GlassPanel>}

          {catalog.loading && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-80" />
              ))}
            </div>
          )}

          {!catalog.loading && catalog.items.length === 0 && <EmptyCatalogState onReset={catalog.resetFilters} />}

          {!catalog.loading && catalog.items.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {catalog.items.map((certification, index) => {
                    const id = certification._id || certification.id;
                    return (
                      <CertificationCard
                        key={id}
                        certification={certification}
                        selected={selectedId === id}
                        index={index}
                        onSelect={() => selectAndHold(certification)}
                        onDetails={() => setDetails(certification)}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-900/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <Button variant="secondary" disabled={catalog.pagination.page <= 1} onClick={() => catalog.setPage(catalog.pagination.page - 1)}>
                  Previous
                </Button>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Page {catalog.pagination.page} of {catalog.pagination.pages}
                </p>
                <Button variant="secondary" disabled={catalog.pagination.page >= catalog.pagination.pages} onClick={() => catalog.setPage(catalog.pagination.page + 1)}>
                  Next
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      <CertificationDetailsModal
        certification={details}
        onClose={() => setDetails(null)}
        onSelect={() => details && selectAndHold(details)}
        selected={selectedId === (details?._id || details?.id)}
      />
    </div>
  );
}

