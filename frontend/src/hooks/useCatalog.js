import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const debouncedSearch = useDebouncedValue(search);

  const params = useMemo(
    () => cleanParams({ search: debouncedSearch, page, limit: 12, ...filters }),
    [debouncedSearch, filters, page]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [catalogResponse, facetResponse] = await Promise.all([
        api.get('/catalog/certifications', { params }),
        facets ? Promise.resolve({ data: facets }) : api.get('/catalog/facets')
      ]);
      setItems(catalogResponse.data.items || []);
      setPagination(catalogResponse.data.pagination || { page: 1, limit: 12, total: catalogResponse.data.items?.length || 0, pages: 1 });
      setFacets(facetResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Catalog request failed');
    } finally {
      setLoading(false);
    }
  }, [params, facets]);

  useEffect(() => {
    load();
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

