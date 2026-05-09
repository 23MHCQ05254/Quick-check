import { useCallback, useEffect, useState } from 'react';

export function useAsync(task, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await task();
      setData(result);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Request failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
}

