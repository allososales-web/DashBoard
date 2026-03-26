/**
 * 실적 반영 매장 목록을 localStorage에 저장/관리하는 훅
 * storage 이벤트로 탭 간 동기화
 */
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'hq_metrics_store_ids';

function loadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useMetricsStores() {
  const [includedIds, setIncludedIds] = useState<Set<string>>(loadIds);

  useEffect(() => {
    setIncludedIds(loadIds());
  }, []);

  useEffect(() => {
    const handler = () => { setIncludedIds(loadIds()); };
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    window.addEventListener('metrics-stores-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
      window.removeEventListener('metrics-stores-changed', handler);
    };
  }, []);

  const notify = () => window.dispatchEvent(new CustomEvent('metrics-stores-changed'));

  const toggle = useCallback((storeId: string) => {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId); else next.add(storeId);
      saveIds(next);
      notify();
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    const empty = new Set<string>();
    setIncludedIds(empty);
    saveIds(empty);
    notify();
  }, []);

  const selectAll = useCallback((storeIds: string[]) => {
    const next = new Set(storeIds);
    setIncludedIds(next);
    saveIds(next);
    notify();
  }, []);

  const isIncluded = useCallback((storeId: string) => includedIds.has(storeId), [includedIds]);

  return { includedIds, toggle, isIncluded, clearAll, selectAll, count: includedIds.size };
}
