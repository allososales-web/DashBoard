import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../services/dashboard';
import api from '../../services/api';

const COLLECTION_LABELS: Record<string, string> = {
  SATI: 'SATI', QUERENCIA: 'QUERENCIA', MILO: 'MILO',
  BONUM: 'BONUM', VARD: 'VARD', ELMER: 'ELMER',
};
const COLLECTION_COLORS = ['#c8956c', '#a07850', '#d4a574', '#8b6340', '#e8c4a0', '#6b4c2a'];

type PeriodType = 'month' | '3m' | '6m' | 'year' | 'custom';
const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'month', label: '이달' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: 'year', label: '연간' },
  { value: 'custom', label: '커스텀' },
];

function DonutChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>데이터 없음</span>
    </div>
  );
  const r = size / 2 - 16;
  const cx = size / 2, cy = size / 2;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map(d => {
    const pct = d.value / total;
    const seg = { ...d, pct, dashArray: pct * circumference, dashOffset: -offset * circumference };
    offset += pct;
    return seg;
  });
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={seg.color} strokeWidth={strokeWidth}
          strokeDasharray={`${seg.dashArray} ${circumference}`}
          strokeDashoffset={seg.dashOffset}
          style={{ transition: 'stroke-dasharray 0.5s' }}
        />
      ))}
    </svg>
  );
}

interface SeriesItem { series: string; amount: number; count: number; avgPrice: number; }
interface SeriesKpiResponse {
  series: SeriesItem[];
  orderAmount: number; salesAmount: number;
  orderCount: number; salesCount: number;
}

export default function StoreAnalysisPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['metrics', storeId, year, month],
    queryFn: () => dashboardApi.getMetricsByMonth(storeId!, year, month),
    enabled: !!storeId,
  });

  const { data: seriesKpi } = useQuery<SeriesKpiResponse>({
    queryKey: ['store-series-kpi', storeId, year, month],
    queryFn: () =>
      api.get(`/stores/${storeId}/series-kpi?year=${year}&month=${month}&dataMode=ORDER`).then(r => r.data),
    enabled: !!storeId,
  });

  const m = data?.metrics;
  const conversionRate = (m?.quoteCount ?? 0) > 0 ? ((m?.contractCount ?? 0) / (m?.quoteCount ?? 1)) * 100 : 0;

  // 수주금액: series-kpi의 orderAmount 사용 (백엔드에서 distinct orderNumber 기준 합산)
  // 이 값이 DashboardPage의 수주금액과 일치해야 함
  const totalSeriesAmount = seriesKpi?.orderAmount ?? 0;
  const totalSeriesCount = seriesKpi?.orderCount ?? 0;
  const avgOrderValue = totalSeriesCount > 0 ? Math.round(totalSeriesAmount / totalSeriesCount) : 0;

  // 시리즈별 breakdown (비중 계산용 — 행 단위 합산이므로 금액 합계는 참고용)
  const seriesList = seriesKpi?.series ?? [];
  const seriesMap = Object.fromEntries(seriesList.map(s => [s.series.toUpperCase(), s]));

  const breakdown: Record<string, { contractCount: number; totalAmount: number }> = {};
  for (const [key] of Object.entries(COLLECTION_LABELS)) {
    const match = seriesMap[key] ?? seriesList.find(s => s.series.toUpperCase().includes(key));
    breakdown[key] = { contractCount: match?.count ?? 0, totalAmount: match?.amount ?? 0 };
  }

  const totalMyContracts = Object.values(breakdown).reduce((sum, v) => sum + v.contractCount, 0);
  const totalMyAmount = Object.values(breakdown).reduce((sum, v) => sum + v.totalAmount, 0);

  const donutData = Object.entries(COLLECTION_LABELS).map(([key, label], i) => ({
    label, value: breakdown[key]?.contractCount ?? 0, color: COLLECTION_COLORS[i],
  }));
  const amountDonutData = Object.entries(COLLECTION_LABELS).map(([key, label], i) => ({
    label, value: breakdown[key]?.totalAmount ?? 0, color: COLLECTION_COLORS[i],
  }));

  // 인사이트 — 사업부 평균 비교 제거 (단일 매장 시 의미 없음)
  const collectionInsights = useMemo(() => {
    const insights: { col: string; text: string; type: 'good' | 'warn' | 'info' }[] = [];
    if (conversionRate >= 60) insights.push({ col: 'conv', text: `견적→계약 전환율 ${conversionRate.toFixed(1)}%로 우수합니다.`, type: 'good' });
    else if (conversionRate > 0 && conversionRate < 30) insights.push({ col: 'conv', text: `전환율 ${conversionRate.toFixed(1)}%로 낮습니다. 팔로업 강화가 필요합니다.`, type: 'warn' });
    if (avgOrderValue > 4000000) insights.push({ col: 'avg', text: `평균 수주단가 ${Math.round(avgOrderValue / 10000)}만원으로 프리미엄 고객 비중이 높습니다.`, type: 'good' });
    // 시리즈별 비중 인사이트 (내부 비교만)
    const topSeries = Object.entries(breakdown).sort((a, b) => b[1].contractCount - a[1].contractCount)[0];
    if (topSeries && totalMyContracts > 0) {
      const pct = (topSeries[1].contractCount / totalMyContracts * 100).toFixed(1);
      insights.push({ col: topSeries[0], text: `${COLLECTION_LABELS[topSeries[0]] ?? topSeries[0]}이 전체 판매의 ${pct}%로 가장 높습니다.`, type: 'info' });
    }
    return insights;
  }, [breakdown, totalMyContracts, conversionRate, avgOrderValue]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>매장 분석</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 'auto', minWidth: 90, fontSize: 13 }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 'auto', minWidth: 70, fontSize: 13 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => <option key={mo} value={mo}>{mo}월</option>)}
          </select>
        </div>
      </div>

      {/* 기간 설정 */}
      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: period === opt.value ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
              color: period === opt.value ? '#fff' : 'var(--text-muted)',
              fontWeight: period === opt.value ? 700 : 400,
            }}>{opt.label}</button>
          ))}
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>~</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
            </div>
          )}
        </div>
      </div>

      {/* KPI 카드 — 수주금액은 series-kpi.orderAmount (distinct orderNumber 기준) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: '수주 금액', value: totalSeriesAmount >= 10000 ? `${Math.round(totalSeriesAmount / 10000).toLocaleString()}만원` : `${totalSeriesAmount.toLocaleString()}원`, sub: '수주일자 기준', color: 'var(--accent)' },
          { label: '수주 건수', value: `${totalSeriesCount}건`, sub: '주문번호 기준', color: '#10b981' },
          { label: '방문 고객', value: `${m?.consultCount ?? 0}명`, sub: '상담 기준', color: '#f59e0b' },
          { label: '평균 수주단가', value: avgOrderValue >= 10000 ? `${Math.round(avgOrderValue / 10000).toLocaleString()}만원` : `${avgOrderValue.toLocaleString()}원`, sub: '수주금액÷건수', color: '#a78bfa' },
          { label: '전환율', value: `${conversionRate.toFixed(1)}%`, sub: '견적→계약', color: conversionRate >= 50 ? '#10b981' : '#f59e0b' },
          { label: '매출 금액', value: (seriesKpi?.salesAmount ?? 0) >= 10000 ? `${Math.round((seriesKpi?.salesAmount ?? 0) / 10000).toLocaleString()}만원` : `${(seriesKpi?.salesAmount ?? 0).toLocaleString()}원`, sub: '확정납기 기준', color: '#c8956c' },
        ].map(card => (
          <div key={card.label} className="glass" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: card.color, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 인사이트 */}
      {collectionInsights.length > 0 && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>💡 분석 인사이트</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {collectionInsights.map((ins, i) => (
              <div key={i} style={{
                padding: '10px 14px',
                background: ins.type === 'good' ? 'rgba(16,185,129,0.08)' : ins.type === 'warn' ? 'rgba(239,68,68,0.08)' : 'rgba(200,149,108,0.08)',
                borderRadius: 8,
                borderLeft: `3px solid ${ins.type === 'good' ? '#10b981' : ins.type === 'warn' ? '#ef4444' : 'var(--accent)'}`,
              }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  {ins.type === 'good' ? '✅' : ins.type === 'warn' ? '⚠️' : '💡'} {ins.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : (
        <>
          {/* 시리즈별 판매 비중 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="donut-grid">
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>시리즈별 판매 비중 (건수)</div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutChart data={donutData} size={160} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{totalMyContracts}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>총 판매건</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(COLLECTION_LABELS).map(([key, label], i) => {
                    const val = breakdown[key]?.contractCount ?? 0;
                    const pct = totalMyContracts > 0 ? (val / totalMyContracts * 100).toFixed(1) : '0.0';
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLLECTION_COLORS[i], flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: COLLECTION_COLORS[i] }}>{pct}%</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{val}건</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="glass" style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>시리즈별 금액 비중</div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutChart data={amountDonutData} size={160} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{totalMyAmount >= 10000 ? `${Math.round(totalMyAmount / 10000)}만` : totalMyAmount.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>시리즈 합계</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(COLLECTION_LABELS).map(([key, label], i) => {
                    const amt = breakdown[key]?.totalAmount ?? 0;
                    const pct = totalMyAmount > 0 ? (amt / totalMyAmount * 100).toFixed(1) : '0.0';
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLLECTION_COLORS[i], flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 12, flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: COLLECTION_COLORS[i] }}>{pct}%</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>{amt >= 10000 ? `${Math.round(amt / 10000)}만` : amt.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 시리즈별 평균 단가 */}
          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>시리즈별 평균 단가</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {Object.entries(COLLECTION_LABELS).map(([key, label], i) => {
                const contracts = breakdown[key]?.contractCount ?? 0;
                const amount = breakdown[key]?.totalAmount ?? 0;
                const avgPrice = contracts > 0 ? Math.round(amount / contracts) : 0;
                const maxAvg = Math.max(...Object.values(breakdown).map(v => v.contractCount > 0 ? v.totalAmount / v.contractCount : 0), 1);
                const barWidth = avgPrice > 0 ? Math.min((avgPrice / maxAvg) * 100, 100) : 0;
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: COLLECTION_COLORS[i], fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{avgPrice > 0 ? `${Math.round(avgPrice / 10000)}만원` : '—'}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: COLLECTION_COLORS[i], borderRadius: 3, opacity: 0.8, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{contracts}건</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
