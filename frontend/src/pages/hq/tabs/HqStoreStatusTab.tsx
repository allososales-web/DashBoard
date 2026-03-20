import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { useMetricsStores } from '../../../hooks/useMetricsStores';

const COLLECTION_LABELS: Record<string, string> = {
  SATI: 'SATI', QUERENCIA: 'QUERENCIA', MILO: 'MILO',
  BONUM: 'BONUM', VARD: 'VARD', ELMER: 'ELMER',
};

type PeriodType = 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'year' | 'custom';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'month', label: '이달' },
  { value: 'q1', label: '1분기' },
  { value: 'q2', label: '2분기' },
  { value: 'q3', label: '3분기' },
  { value: 'q4', label: '4분기' },
  { value: 'h1', label: '상반기' },
  { value: 'h2', label: '하반기' },
  { value: 'year', label: '연간' },
  { value: 'custom', label: '커스텀' },
];

function getPeriodMonth(period: PeriodType, now: Date): number {
  if (period === 'month') return now.getMonth() + 1;
  if (period === 'q1') return 3;
  if (period === 'q2') return 6;
  if (period === 'q3') return 9;
  if (period === 'q4' || period === 'h2' || period === 'year') return 12;
  if (period === 'h1') return 6;
  return now.getMonth() + 1;
}

export default function HqStoreStatusTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { includedIds, count: metricsCount } = useMetricsStores();

  const primaryMonth = period === 'custom' ? now.getMonth() + 1 : getPeriodMonth(period, now);

  const { data: allMetrics = [], isLoading } = useQuery({
    queryKey: ['hq-all-metrics', year, primaryMonth],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${primaryMonth}`).then(r => r.data).catch(() => []),
  });

  // 실적 반영 매장만 필터 (설정된 경우), 없으면 showOnLogin 매장 전체
  const stores = useMemo(() => {
    const all = allMetrics as any[];
    if (metricsCount > 0) return all.filter((s: any) => includedIds.has(s.storeId));
    return all;
  }, [allMetrics, includedIds, metricsCount]);

  const totalAmount = stores.reduce((s: number, st: any) => s + Number(st.contractAmount ?? 0), 0);
  const sortedByAmount = useMemo(() => [...stores].sort((a, b) => Number(b.contractAmount) - Number(a.contractAmount)), [stores]);
  const sortedByQuote = useMemo(() => [...stores].sort((a, b) => (b.quoteCount ?? 0) - (a.quoteCount ?? 0)), [stores]);
  const sortedByConsult = useMemo(() => [...stores].sort((a, b) => (b.consultCount ?? 0) - (a.consultCount ?? 0)), [stores]);

  // 품목별 TOP (컬렉션별 집계)
  const collectionTotals = useMemo(() => {
    const totals: Record<string, { amount: number; count: number }> = {};
    stores.forEach((s: any) => {
      const bd = s.collectionBreakdown ?? {};
      Object.entries(bd).forEach(([col, val]: [string, any]) => {
        if (!totals[col]) totals[col] = { amount: 0, count: 0 };
        totals[col].amount += Number(val?.totalAmount ?? 0);
        totals[col].count += Number(val?.contractCount ?? 0);
      });
    });
    return totals;
  }, [stores]);

  const sortedByColAmount = useMemo(() =>
    Object.entries(collectionTotals).sort((a, b) => b[1].amount - a[1].amount),
    [collectionTotals]
  );
  const sortedByColCount = useMemo(() =>
    Object.entries(collectionTotals).sort((a, b) => b[1].count - a[1].count),
    [collectionTotals]
  );
  const totalColAmount = sortedByColAmount.reduce((s, [, v]) => s + v.amount, 0);
  const totalColCount = sortedByColCount.reduce((s, [, v]) => s + v.count, 0);

  const insights: string[] = [];
  if (stores.length >= 2) {
    const top = sortedByAmount[0];
    const bottom = sortedByAmount[sortedByAmount.length - 1];
    if (top) insights.push(`매출 1위 ${top.storeName ?? '매장'}이 전체의 ${totalAmount > 0 ? ((Number(top.contractAmount) / totalAmount) * 100).toFixed(1) : 0}%를 차지합니다.`);
    if (bottom && bottom.storeName !== top?.storeName) insights.push(`${bottom.storeName ?? '하위 매장'}의 매출이 가장 낮습니다. 원인 파악이 필요합니다.`);
    const quoteTop = sortedByQuote[0];
    const amountRank = sortedByAmount.findIndex((s: any) => s.storeId === quoteTop?.storeId) + 1;
    if (quoteTop && amountRank > 2) insights.push(`${quoteTop.storeName ?? '매장'}은 견적 1위이나 매출 ${amountRank}위입니다. 구매 전환율 개선이 필요합니다.`);
  }

  return (
    <div>
      {/* 기간 설정 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90, fontSize: 13 }}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: period === opt.value ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
                color: period === opt.value ? '#fff' : 'var(--text-muted)', fontWeight: period === opt.value ? 700 : 400 }}>
              {opt.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>~</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
          </div>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>운영 매장 {stores.length}개</span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : (
        <>
          {/* 매장별 TOP */}
          <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>매장별 TOP</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { title: '판매 TOP', data: sortedByAmount, valueKey: 'contractAmount', format: (v: any) => `${Number(v).toLocaleString()}원` },
              { title: '견적 TOP', data: sortedByQuote, valueKey: 'quoteCount', format: (v: any) => `${v ?? 0}건` },
              { title: '상담 TOP', data: sortedByConsult, valueKey: 'consultCount', format: (v: any) => `${v ?? 0}건` },
            ].map(ranking => (
              <div key={ranking.title} className="glass" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{ranking.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ranking.data.slice(0, 5).map((s: any, i: number) => (
                    <div key={s.storeId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? '#d97706' : i === 1 ? 'var(--text-muted)' : 'rgba(0,0,0,0.3)', minWidth: 20 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12 }}>{s.storeName ?? `매장 ${i + 1}`}</span>
                      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{ranking.format(s[ranking.valueKey])}</span>
                    </div>
                  ))}
                  {ranking.data.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>데이터 없음</div>}
                </div>
              </div>
            ))}
          </div>

          {/* 품목별 TOP */}
          <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>품목별 TOP</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { title: '품목별 매출 TOP', data: sortedByColAmount, format: (v: any) => `${Number(v.amount).toLocaleString()}원`, pct: (v: any) => totalColAmount > 0 ? ((v.amount / totalColAmount) * 100).toFixed(1) : '0.0' },
              { title: '품목별 판매건수 TOP', data: sortedByColCount, format: (v: any) => `${v.count}건`, pct: (v: any) => totalColCount > 0 ? ((v.count / totalColCount) * 100).toFixed(1) : '0.0' },
              { title: '품목별 평균단가 TOP', data: [...sortedByColAmount].sort((a, b) => (b[1].count > 0 ? b[1].amount/b[1].count : 0) - (a[1].count > 0 ? a[1].amount/a[1].count : 0)), format: (v: any) => v.count > 0 ? `${Math.round(v.amount/v.count/10000)}만원` : '-', pct: () => '' },
            ].map(ranking => (
              <div key={ranking.title} className="glass" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{ranking.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ranking.data.slice(0, 5).map(([col, val], i) => (
                    <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? '#d97706' : i === 1 ? 'var(--text-muted)' : 'rgba(0,0,0,0.3)', minWidth: 20 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12 }}>{COLLECTION_LABELS[col] ?? col}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{ranking.format(val)}</div>
                        {ranking.pct(val) && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ranking.pct(val)}%</div>}
                      </div>
                    </div>
                  ))}
                  {ranking.data.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>데이터 없음</div>}
                </div>
              </div>
            ))}
          </div>

          {/* 인사이트 */}
          {insights.length > 0 && (
            <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>인사이트</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(200,149,108,0.08)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                    💡 {ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 매장별 핵심 수치 */}
          <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: 13, fontWeight: 700 }}>매장별 핵심 수치 (운영 매장)</div>
            <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>매장</th>
                  <th style={{ textAlign: 'right' }}>매출</th>
                  <th style={{ textAlign: 'right' }}>계약</th>
                  <th style={{ textAlign: 'right' }}>견적</th>
                  <th style={{ textAlign: 'right' }}>전환율</th>
                  <th style={{ textAlign: 'right' }}>매출 비중</th>
                </tr>
              </thead>
              <tbody>
                {sortedByAmount.map((s: any) => {
                  const pct = totalAmount > 0 ? ((Number(s.contractAmount) / totalAmount) * 100).toFixed(1) : '0.0';
                  const conv = s.quoteCount > 0 ? ((s.contractCount / s.quoteCount) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={s.storeId}>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{s.storeName ?? '-'}</td>
                      <td style={{ textAlign: 'right' }}>{Number(s.contractAmount ?? 0).toLocaleString()}원</td>
                      <td style={{ textAlign: 'right' }}>{s.contractCount ?? 0}건</td>
                      <td style={{ textAlign: 'right' }}>{s.quoteCount ?? 0}건</td>
                      <td style={{ textAlign: 'right', color: Number(conv) >= 50 ? 'var(--success)' : 'var(--warning)' }}>{conv}%</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent)' }}>{pct}%</td>
                    </tr>
                  );
                })}
                {stores.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>데이터 없음</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
