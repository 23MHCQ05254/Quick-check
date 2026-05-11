import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync(task, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const run = useCallback(async () => {
    // Cancel previous request if still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    if (!isMountedRef.current) return;

    setLoading(true);
    setError('');
    try {
      const result = await task();
      // Only update state if component is still mounted and this request wasn't aborted
      if (isMountedRef.current && !currentAbortController.signal.aborted) {
        setData(result);
      }
      return result;
    } catch (err) {
      // Ignore aborted requests (cleanup from dependency change or unmount)
      if (err.name === 'AbortError') {
        return null;
      }
      // Only update state if component is still mounted
      if (isMountedRef.current && !currentAbortController.signal.aborted) {
        setError(err.response?.data?.message || err.message || 'Request failed');
      }
      return null;
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current && !currentAbortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    isMountedRef.current = true;
    run();

    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [run]);

  return { data, error, loading, reload: run, setData };
}

