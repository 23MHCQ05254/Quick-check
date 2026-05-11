import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useDebouncedValue } from './useDebouncedValue.js';

const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));

export function useCatalog(initialFilters = {}) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    organization: '',
    category: '',
    difficultyLevel: '',
    verificationType: '',
    templateStatus: '',
    ...initialFilters
  });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [facets, setFacets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const debouncedSearch = useDebouncedValue(search);

  const params = useMemo(
    () => cleanParams({ search: debouncedSearch, page, limit: 12, ...filters }),
    [debouncedSearch, filters, page]
  );

  const load = useCallback(async () => {
    // Cancel previous request if still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    if (!isMountedRef.current) return;

    setLoading(true);
    setError('');
    try {
      const [catalogResponse, facetResponse] = await Promise.all([
        api.get('/catalog/certifications', { params }),
        facets ? Promise.resolve({ data: facets }) : api.get('/catalog/facets')
      ]);

      // Only update state if component is still mounted and request wasn't aborted
      if (isMountedRef.current && !currentAbortController.signal.aborted) {
        setItems(catalogResponse.data.items || []);
        setPagination(catalogResponse.data.pagination || { page: 1, limit: 12, total: catalogResponse.data.items?.length || 0, pages: 1 });
        setFacets(facetResponse.data);
      }
    } catch (err) {
      // Ignore aborted requests
      if (err.name === 'AbortError') {
        return;
      }
      // Only update state if component is still mounted
      if (isMountedRef.current && !currentAbortController.signal.aborted) {
        setError(err.response?.data?.message || err.message || 'Catalog request failed');
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current && !currentAbortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [params, facets]);

  useEffect(() => {
    isMountedRef.current = true;
    load();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [load]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ organization: '', category: '', difficultyLevel: '', verificationType: '', templateStatus: '' });
    setSearch('');
    setPage(1);
  };

  return {
    search,
    setSearch,
    filters,
    updateFilter,
    resetFilters,
    page,
    setPage,
    items,
    pagination,
    facets,
    loading,
    error,
    reload: load
  };
}

