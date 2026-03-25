import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { useMetricsStores } from '../../../hooks/useMetricsStores';
import DataModeSelector from '../../../components/DataModeSelector';
import { DataMode } from '../../../types/dashboard.types';

type PeriodType = 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'year' | 'custom';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'month', label: '이달' }, { value: 'q1', label: '1분기' },
  { value: 'q2', label: '2분기' }, { value: 'q3', label: '3분기' },
  { value: 'q4', label: '4분기' }, { value: 'h1', label: '상반기' },
  { value: 'h2', label: '하반기' }, { value: 'year', label: '연간' },
  { value: 'custom', label: '직접 설정' },
];

function getPeriodMonth(period: PeriodType, now: Date): number {
  if (period === 'q1') return 3;
  if (period === 'q2') return 6;
  if (period === 'q3') return 9;
  if (period === 'q4' || period === 'h2' || period === 'year') return 12;
  if (period === 'h1') return 6;
  return now.getMonth() + 1;
}

function ExpandableRankCard({ title, items, getValue, format, sub }: {
  title: string; items: any[];
  getValue: (item: any) => number;
  format: (v: number, item: any) => string;
  sub?: (item: any) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 5);
  const maxVal = Math.max(...items.map(getValue), 1);
  return (
    <div className="glass" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        {items.length > 5 && (
          <button onClick={() => setExpanded(e => !e)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 8,
            border: '1px solid var(--glass-border)', background: '#f4f6f1',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>{expanded ? '접기 ▲' : `+${items.length - 5}개 더보기 ▼`}</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((item, i) => {
          const val = getValue(item);
          const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const rc = i === 0 ? '#d97706' : i === 1 ? '#8b7cf8' : i === 2 ? '#5ec4a0' : 'var(--text-muted)';
          return (
            <div key={item.storeId ?? item.series ?? i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: rc, minWidth: 22, textAlign: 'center' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.storeName ?? item.series ?? '-'}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{format(val, item)}</div>
                  {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub(item)}</div>}
                </div>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--bg)', boxShadow: 'inset 1px 1px 3px rgba(150,158,145,0.35), inset -1px -1px 2px rgba(255,255,255,0.75)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${rc}88, ${rc})`, transition: 'width 0.6s' }} />
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>}
      </div>
    </div>
  );
}

function SeriesStoreCard({ seriesName, stores, dataMode }: {
  seriesName: string;
  stores: { storeId: string; storeName: string; amount: number; count: number }[];
  dataMode: DataMode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? stores : stores.slice(0, 5);
  const maxAmt = Math.max(...stores.map(s => s.amount), 1);
  return (
    <div className="glass" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            {dataMode === 'SALES' ? '매출' : '수주'} TOP
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{seriesName}</div>
        </div>
        {stores.length > 5 && (
          <button onClick={() => setExpanded(e => !e)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 8,
            border: '1px solid var(--glass-border)', background: '#f4f6f1',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>{expanded ? '접기 ▲' : `+${stores.length - 5}개 ▼`}</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((s, i) => {
          const barPct = maxAmt > 0 ? (s.amount / maxAmt) * 100 : 0;
          const rc = i === 0 ? '#d97706' : i === 1 ? '#8b7cf8' : i === 2 ? '#5ec4a0' : 'var(--text-muted)';
          return (
            <div key={s.storeId}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: rc, minWidth: 22, textAlign: 'center' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{s.storeName}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                    {s.amount >= 10000 ? `${Math.round(s.amount / 10000).toLocaleString()}만원` : `${s.amount.toLocaleString()}원`}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.count}건</div>
                </div>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--bg)', boxShadow: 'inset 1px 1px 3px rgba(150,158,145,0.35), inset -1px -1px 2px rgba(255,255,255,0.75)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${rc}88, ${rc})`, transition: 'width 0.6s' }} />
              </div>
            </div>
          );
        })}
        {stores.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>}
      </div>
    </div>
  );
}

export default function HqStoreStatusTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [dataMode, setDataMode] = useState<DataMode>('ORDER');
  const { includedIds, count: metricsCount } = useMetricsStores();

  const { data: adminStores = [] } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => api.get('/stores/admin/all').then(r => r.data).catch(() => []),
  });

  const activeStoreIds = useMemo(() => {
    const ids = new Set<string>();
    (adminStores as any[]).forEach((s: any) => { if (s.showOnLogin !== false) ids.add(s.id); });
    return ids;
  }, [adminStores]);

  const primaryMonth = period === 'custom' ? now.getMonth() + 1 : getPeriodMonth(period, now);

  const { data: allMetrics = [], isLoading } = useQuery({
    queryKey: ['hq-all-metrics', year, primaryMonth, dataMode],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${primaryMonth}&dataMode=${dataMode}`).then(r => r.data).catch(() => []),
  });

  const { data: seriesTopRaw = [] } = useQuery({
    queryKey: ['series-top', year, primaryMonth, dataMode],
    queryFn: () => api.get(`/dashboard/series-top?year=${year}&month=${primaryMonth}&dataMode=${dataMode}`).then(r => r.data).catch(() => []),
  });

  const { data: seriesBreakdownRaw = [] } = useQuery({
    queryKey: ['series-store-breakdown', year, primaryMonth, dataMode],
    queryFn: () => api.get(`/dashboard/series-store-breakdown?year=${year}&month=${primaryMonth}&dataMode=${dataMode}`).then(r => r.data).catch(() => []),
  });

  const stores = useMemo(() => {
    const all = allMetrics as any[];
    const active = activeStoreIds.size > 0 ? all.filter((s: any) => activeStoreIds.has(s.storeId)) : all;
    if (metricsCount > 0) return active.filter((s: any) => includedIds.has(s.storeId));
    return active;
  }, [allMetrics, includedIds, metricsCount, activeStoreIds]);

  const getAmt = (s: any) => dataMode === 'SALES' ? Number(s.salesAmount ?? 0) : Number(s.orderAmount ?? s.contractAmount ?? 0);
  const getCnt = (s: any) => dataMode === 'SALES' ? Number(s.salesCount ?? s.orderCount ?? 0) : Number(s.orderCount ?? s.contractCount ?? 0);

  const totalAmount = stores.reduce((s: number, st: any) => s + getAmt(st), 0);
  const sortedByAmount = useMemo(() => [...stores].sort((a, b) => getAmt(b) - getAmt(a)), [stores, dataMode]);
  const sortedByCount = useMemo(() => [...stores].sort((a, b) => getCnt(b) - getCnt(a)), [stores, dataMode]);
  const sortedByQuote = useMemo(() => [...stores].sort((a, b) => (b.quoteCount ?? 0) - (a.quoteCount ?? 0)), [stores]);
  const sortedByConsult = useMemo(() => [...stores].sort((a, b) => (b.consultCount ?? 0) - (a.consultCount ?? 0)), [stores]);

  const seriesData: { series: string; amount: number; count: number; avgPrice: number }[] = seriesTopRaw as any[];
  const sortedBySeriesAmount = useMemo(() => [...seriesData].sort((a, b) => b.amount - a.amount), [seriesData]);
  const sortedBySeriesCount = useMemo(() => [...seriesData].sort((a, b) => b.count - a.count), [seriesData]);
  const sortedBySeriesAvg = useMemo(() => [...seriesData].sort((a, b) => b.avgPrice - a.avgPrice), [seriesData]);

  const topSeriesNames = sortedBySeriesAmount.slice(0, 5).map(d => d.series);
  const breakdownMap: Record<string, { storeId: string; storeName: string; amount: number; count: number }[]> = {};
  (seriesBreakdownRaw as any[]).forEach((item: any) => { breakdownMap[item.series] = item.stores ?? []; });

  const modeLabel = dataMode === 'SALES' ? '매출' : '수주';

  const insights: string[] = [];
  if (stores.length >= 2) {
    const top = sortedByAmount[0];
    const bottom = sortedByAmount[sortedByAmount.length - 1];
    if (top) insights.push(`${modeLabel} 1위 ${top.storeName ?? '매장'}이 전체의 ${totalAmount > 0 ? ((getAmt(top) / totalAmount) * 100).toFixed(1) : 0}%를 차지합니다.`);
    if (bottom && bottom.storeName !== top?.storeName) insights.push(`${bottom.storeName ?? '하위 매장'}의 ${modeLabel}이 가장 낮습니다. 원인 파악이 필요합니다.`);
    const quoteTop = sortedByQuote[0];
    const amountRank = sortedByAmount.findIndex((s: any) => s.storeId === quoteTop?.storeId) + 1;
    if (quoteTop && amountRank > 2) insights.push(`${quoteTop.storeName ?? '매장'}은 견적 1위이나 ${modeLabel} ${amountRank}위입니다. 전환율 개선이 필요합니다.`);
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? 'var(--accent)' : '#f4f6f1',
    color: active ? '#ffffff' : '#3a3d36',
    fontWeight: active ? 700 : 500,
    boxShadow: active ? '0 2px 8px rgba(139,124,248,0.35)' : '3px 3px 7px rgba(160,168,155,0.45), -2px -2px 5px rgba(255,255,255,0.85)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 'auto', minWidth: 90, fontSize: 13 }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)} style={btnStyle(period === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ fontSize: 12 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>~</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ fontSize: 12 }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <DataModeSelector value={dataMode} onChange={setDataMode} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {metricsCount > 0 ? `실적 반영 ${metricsCount}개 매장 기준` : `운영 매장 ${stores.length}개`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>매장별 TOP — {modeLabel} 기준</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <ExpandableRankCard title={`${modeLabel} TOP`} items={sortedByAmount}
                getValue={s => getAmt(s)}
                format={v => v >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만원` : `${v.toLocaleString()}원`}
                sub={s => `${getCnt(s)}건`} />
              <ExpandableRankCard title={`${modeLabel}건수 TOP`} items={sortedByCount}
                getValue={s => getCnt(s)} format={v => `${v}건`}
                sub={s => getAmt(s) >= 10000 ? `${Math.round(getAmt(s) / 10000).toLocaleString()}만원` : `${getAmt(s).toLocaleString()}원`} />
              <ExpandableRankCard title="견적 TOP" items={sortedByQuote}
                getValue={s => s.quoteCount ?? 0} format={v => `${v}건`} />
              <ExpandableRankCard title="상담 TOP" items={sortedByConsult}
                getValue={s => s.consultCount ?? 0} format={v => `${v}건`} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>품목별 TOP — {modeLabel} 기준</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <ExpandableRankCard title={`품목별 ${modeLabel} TOP`} items={sortedBySeriesAmount}
                getValue={d => d.amount}
                format={v => v >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만원` : `${v.toLocaleString()}원`}
                sub={d => `${d.count}건`} />
              <ExpandableRankCard title={`품목별 ${modeLabel}건수 TOP`} items={sortedBySeriesCount}
                getValue={d => d.count} format={v => `${v}건`}
                sub={d => d.amount >= 10000 ? `${Math.round(d.amount / 10000).toLocaleString()}만원` : `${d.amount.toLocaleString()}원`} />
              <ExpandableRankCard title="품목별 평균단가 TOP" items={sortedBySeriesAvg}
                getValue={d => d.avgPrice}
                format={v => v >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만원` : `${v.toLocaleString()}원`}
                sub={d => `${d.count}건`} />
            </div>
          </div>

          {topSeriesNames.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
                품목별 매장 상세 분석 — {modeLabel} TOP 5 품목
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {topSeriesNames.map(sn => (
                  <SeriesStoreCard key={sn} seriesName={sn} stores={breakdownMap[sn] ?? []} dataMode={dataMode} />
                ))}
              </div>
            </div>
          )}

          {insights.length > 0 && (
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>인사이트</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(139,124,248,0.06)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                    💡 {ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              매장별 핵심 수치 — {modeLabel} 기준
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>매장</th>
                    <th style={{ textAlign: 'right' }}>{modeLabel}</th>
                    <th style={{ textAlign: 'right' }}>{modeLabel}건수</th>
                    <th style={{ textAlign: 'right' }}>견적</th>
                    <th style={{ textAlign: 'right' }}>전환율</th>
                    <th style={{ textAlign: 'right' }}>비중</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByAmount.map((s: any) => {
                    const pct = totalAmount > 0 ? ((getAmt(s) / totalAmount) * 100).toFixed(1) : '0.0';
                    const conv = s.quoteCount > 0 ? ((s.contractCount / s.quoteCount) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={s.storeId}>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{s.storeName ?? '-'}</td>
                        <td style={{ textAlign: 'right' }}>{Math.round(getAmt(s) / 10000).toLocaleString()}만원</td>
                        <td style={{ textAlign: 'right' }}>{getCnt(s)}건</td>
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
