import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/http';
export function useResource(loader, dependencies = []) {
  const [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true), [version, setVersion] = useState(0);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(null); setData(null); loader(controller.signal).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [...dependencies, version]);
  const retry = useCallback(() => setVersion(v => v + 1), []);
  return { data, setData, error, loading, retry };
}
export default function usePackage(id) { return useResource(signal => api.package(id, signal), [id]); }
