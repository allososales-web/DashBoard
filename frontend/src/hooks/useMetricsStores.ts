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

  // 다른 컴포넌트(탭)에서 변경 시 동기화
  useEffect(() => {
    const handler = () => {
      setIncludedIds(loadIds());
    };
    window.addEventListener('storage', handler);
    // 탭 포커스 시에도 재동기화 (같은 탭 내 탭 전환 대응)
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  const toggle = useCallback((storeId: string) => {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      saveIds(next);
      // 같은 탭 내 다른 컴포넌트에 알림
      window.dispatchEvent(new Event('storage'));
      return next;
    });
  }, []);

  const isIncluded = useCallback((storeId: string) => includedIds.has(storeId), [includedIds]);

  return { includedIds, toggle, isIncluded, count: includedIds.size };
}
