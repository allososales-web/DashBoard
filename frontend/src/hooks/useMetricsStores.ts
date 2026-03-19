/**
 * 실적 반영 매장 목록을 localStorage에 저장/관리하는 훅
 * 백엔드 마이그레이션 없이 즉시 동작
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'hq_metrics_store_ids';

function loadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useMetricsStores() {
  const [includedIds, setIncludedIds] = useState<Set<string>>(loadIds);

  const toggle = useCallback((storeId: string) => {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      saveIds(next);
      return next;
    });
  }, []);

  const isIncluded = useCallback((storeId: string) => includedIds.has(storeId), [includedIds]);

  return { includedIds, toggle, isIncluded, count: includedIds.size };
}
