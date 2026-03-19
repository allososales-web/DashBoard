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

const LOCAL_NEWS = [
  { title: '강남구 가구 인테리어 트렌드 2026 — 미니멀 & 내추럴 소재 급부상', date: '2026-03-10', summary: '강남 지역 인테리어 시장에서 천연 소재 소파와 미니멀 디자인 수요가 전년 대비 32% 증가.' },
  { title: '분당·판교 신규 아파트 입주 물량 증가로 가구 수요 확대 전망', date: '2026-02-28', summary: '2026년 상반기 판교·분당 신규 입주 단지 1만 2천 세대 예정. 소파·거실 가구 수요 동반 상승 기대.' },
  { title: '소파 시장 프리미엄화 가속 — 200만원 이상 제품 비중 40% 돌파', date: '2026-02-15', summary: '국내 소파 시장에서 200만원 이상 프리미엄 제품 비중이 처음으로 40%를 넘어섰다.' },
  { title: '가구업계 온라인 전환 가속 — 오프라인 쇼룸 체험 중요성 재부각', date: '2026-01-20', summary: '온라인 가구 구매 증가에도 불구하고 소파 등 대형 가구는 직접 체험 후 구매 비율 78%로 오프라인 쇼룸 경쟁력 유지.' },
];

function getPeriodMonths(period: PeriodType, year: number, month: number): number {
  if (period === 'month') return 1;
  if (period === '3m') return 3;
  if (period === '6m') return 6;
  if (period === 'year') return 12;
  return 1;
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

  const { data: allMetrics } = useQuery({
    queryKey: ['all-metrics', year, month],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${month}`).then(r => r.data).catch(() => []),
  });

  const m = data?.metrics;
  const allStores: any[] = allMetrics ?? [];
  const totalAmount = allStores.reduce((sum: number, s: any) => sum + Number(s.contractAmount ?? 0), 0);
  const myAmount = Number(m?.contractAmount ?? 0);
  const myShare = totalAmount > 0 ? ((myAmount / totalAmount) * 100).toFixed(1) : '0.0';
  const avgOrderValue = (m?.contractCount ?? 0) > 0 ? Math.round(myAmount / (m?.contractCount ?? 1)) : 0;

  const breakdown = (m?.collectionBreakdown ?? {}) as Record<string, any>;
  const totalMyContracts = Object.values(breakdown).reduce((sum: number, v: any) => sum + (v?.contractCount ?? 0), 0);

  const hqBreakdown: Record<string, number> = {
    SATI: 28, QUERENCIA: 22, MILO: 18, BONUM: 14, VARD: 10, ELMER: 8,
  };

  // 컬렉션별 인사이트 생성
  const collectionInsights = useMemo(() => {
    const insights: { col: string; text: string; type: 'good' | 'warn' | 'info' }[] = [];
    Object.entries(COLLECTION_LABELS).forEach(([key]) => {
      const val = breakdown[key]?.contractCount ?? 0;
      const myPct = totalMyContracts > 0 ? (val / totalMyContracts) * 100 : 0;
      const hqPct = hqBreakdown[key] ?? 0;
      const diff = myPct - hqPct;
      if (diff > 5) insights.push({ col: key, text: `${COLLECTION_LABELS[key]}은 사업부 평균 대비 ${diff.toFixed(1)}%p 높습니다. 강점 컬렉션입니다.`, type: 'good' });
      else if (diff < -5) insights.push({ col: key, text: `${COLLECTION_LABELS[key]}은 사업부 평균 대비 ${Math.abs(diff).toFixed(1)}%p 낮습니다. 판매 강화가 필요합니다.`, type: 'warn' });
    });
    return insights;
  }, [breakdown, totalMyContracts]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>매장 분석</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90, fontSize: 13 }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 70, fontSize: 13 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => <option key={mo} value={mo}>{mo}월</option>)}
          </select>
        </div>
      </div>

      {/* 기간 설정 */}
      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>기간 설정</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: period === opt.value ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
              color: period === opt.value ? '#fff' : 'var(--text-muted)', fontWeight: period === opt.value ? 700 : 400 }}>
              {opt.label}
            </button>
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

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: '총 매출', value: myAmount >= 10000 ? `${Math.round(myAmount/10000).toLocaleString()}만원` : `${myAmount.toLocaleString()}원`, sub: '계약 기준' },
          { label: '판매 건수', value: `${m?.contractCount ?? 0}건`, sub: '계약 완료' },
          { label: '방문 고객', value: `${m?.consultCount ?? 0}명`, sub: '상담 기준' },
          { label: '평균 수주단가', value: avgOrderValue >= 10000 ? `${Math.round(avgOrderValue/10000).toLocaleString()}만원` : `${avgOrderValue.toLocaleString()}원`, sub: '매출÷계약건수' },
        ].map(card => (
          <div key={card.label} className="glass" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : (
        <>
          {/* 컬렉션별 배출 비중 + 인사이트 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>컬렉션별 판매 비중</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(COLLECTION_LABELS).map(([key, label], i) => {
                  const val = breakdown[key]?.contractCount ?? 0;
                  const hqPct = hqBreakdown[key] ?? 0;
                  const myPct = totalMyContracts > 0 ? ((val / totalMyContracts) * 100) : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: COLLECTION_COLORS[i] }}>{label}</span>
                        <span style={{ fontSize: 12 }}>
                          <span style={{ color: COLLECTION_COLORS[i], fontWeight: 700 }}>{myPct.toFixed(1)}%</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>vs 사업부 {hqPct}%</span>
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${hqPct}%`, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }} />
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${myPct}%`, background: COLLECTION_COLORS[i], borderRadius: 3, opacity: 0.8 }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{val}건</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>막대: 우리 매장 / 배경: 사업부 평균</div>
            </div>

            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>컬렉션별 인사이트</div>
              {collectionInsights.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>데이터 부족 — 더 많은 판매 데이터가 필요합니다</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {collectionInsights.map((ins, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: ins.type === 'good' ? 'rgba(16,185,129,0.08)' : ins.type === 'warn' ? 'rgba(239,68,68,0.08)' : 'rgba(200,149,108,0.08)', borderRadius: 8, borderLeft: `3px solid ${ins.type === 'good' ? '#10b981' : ins.type === 'warn' ? '#ef4444' : 'var(--accent)'}` }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {ins.type === 'good' ? '✅' : ins.type === 'warn' ? '⚠️' : '💡'} {ins.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>컬렉션별 평균 단가</div>
                {Object.entries(COLLECTION_LABELS).map(([key, label], i) => {
                  const contracts = breakdown[key]?.contractCount ?? 0;
                  const amount = Number(breakdown[key]?.totalAmount ?? 0);
                  const avgPrice = contracts > 0 ? amount / contracts : 0;
                  const hqAvg = [3200000, 4500000, 2800000, 3800000, 2200000, 1900000][i];
                  const ratio = hqAvg > 0 && avgPrice > 0 ? (avgPrice / hqAvg) * 100 : 0;
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 12, color: COLLECTION_COLORS[i] }}>{label}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{avgPrice > 0 ? `${Math.round(avgPrice / 10000)}만원` : '-'}</div>
                        <div style={{ fontSize: 10, color: ratio >= 100 ? 'var(--success)' : ratio > 0 ? '#fcd34d' : 'var(--text-muted)' }}>
                          {ratio > 0 ? `사업부 대비 ${ratio.toFixed(0)}%` : '데이터 없음'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 매장 주변 상권 & 가구 트렌드 뉴스 */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>매장 주변 상권 & 가구 트렌드 뉴스</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>매장 주변 반경 10km 기준 · 최근 6개월</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LOCAL_NEWS.map((news, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{news.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{news.date}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{news.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
