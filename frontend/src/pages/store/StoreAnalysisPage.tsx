import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../services/dashboard';
import api from '../../services/api';

const COLLECTION_LABELS: Record<string, string> = {
  SATI: 'SATI', QUERENCIA: 'QUERENCIA', MILO: 'MILO',
  BONUM: 'BONUM', VARD: 'VARD', ELMER: 'ELMER',
};

const COLLECTION_COLORS = ['#c8956c', '#a07850', '#d4a574', '#8b6340', '#e8c4a0', '#6b4c2a'];

// 로컬 뉴스 mock (실제 API 연동 시 교체)
const LOCAL_NEWS = [
  { title: '강남구 가구 인테리어 트렌드 2026 — 미니멀 & 내추럴 소재 급부상', date: '2026-03-10', summary: '강남 지역 인테리어 시장에서 천연 소재 소파와 미니멀 디자인 수요가 전년 대비 32% 증가. 특히 패브릭 소파 선호도 상승.' },
  { title: '분당·판교 신규 아파트 입주 물량 증가로 가구 수요 확대 전망', date: '2026-02-28', summary: '2026년 상반기 판교·분당 신규 입주 단지 1만 2천 세대 예정. 소파·거실 가구 수요 동반 상승 기대.' },
  { title: '소파 시장 프리미엄화 가속 — 200만원 이상 제품 비중 40% 돌파', date: '2026-02-15', summary: '국내 소파 시장에서 200만원 이상 프리미엄 제품 비중이 처음으로 40%를 넘어섰다. 소비자 품질 중시 트렌드 반영.' },
  { title: '가구업계 온라인 전환 가속 — 오프라인 쇼룸 체험 중요성 재부각', date: '2026-01-20', summary: '온라인 가구 구매 증가에도 불구하고 소파 등 대형 가구는 직접 체험 후 구매 비율 78%로 오프라인 쇼룸 경쟁력 유지.' },
];

export default function StoreAnalysisPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ['metrics', storeId, year, month],
    queryFn: () => dashboardApi.getMetricsByMonth(storeId!, year, month),
    enabled: !!storeId,
  });

  // 전체 매장 데이터 (비중 비교용)
  const { data: allMetrics } = useQuery({
    queryKey: ['all-metrics', year, month],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${month}`).then(r => r.data).catch(() => []),
  });

  const m = data?.metrics;
  const allStores: any[] = allMetrics ?? [];
  const totalAmount = allStores.reduce((sum: number, s: any) => sum + Number(s.contractAmount ?? 0), 0);
  const myAmount = Number(m?.contractAmount ?? 0);

  const breakdown = (m?.collectionBreakdown ?? {}) as Record<string, any>;
  const totalMyContracts = Object.values(breakdown).reduce((sum: number, v: any) => sum + (v?.contractCount ?? 0), 0);

  // 전체 사업부 컬렉션 비중 (mock)
  const hqBreakdown: Record<string, number> = {
    SATI: 28, QUERENCIA: 22, MILO: 18, BONUM: 14, VARD: 10, ELMER: 8,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>매장 분석</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => <option key={mo} value={mo}>{mo}월</option>)}
          </select>
        </div>
      </div>

      {/* 지역 뉴스 & 트렌드 */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>지역 가구 트렌드 & 뉴스</div>
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

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : (
        <>
          {/* 컬렉션별 판매 추이 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>컬렉션별 판매 건수</div>
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
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${hqPct}%`, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }} />
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${myPct}%`, background: COLLECTION_COLORS[i], borderRadius: 3, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>막대: 우리 매장 / 배경: 사업부 평균</div>
            </div>

            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>컬렉션별 판매 단가</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(COLLECTION_LABELS).map(([key, label], i) => {
                  const contracts = breakdown[key]?.contractCount ?? 0;
                  const amount = Number(breakdown[key]?.totalAmount ?? 0);
                  const avgPrice = contracts > 0 ? amount / contracts : 0;
                  const hqAvg = [3200000, 4500000, 2800000, 3800000, 2200000, 1900000][i];
                  const ratio = hqAvg > 0 ? (avgPrice / hqAvg) * 100 : 0;
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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

          {/* 사업부 비중 비교 */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>사업부 매출 비중 비교</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {allStores.map((s: any, i: number) => {
                const pct = totalAmount > 0 ? ((Number(s.contractAmount) / totalAmount) * 100) : 0;
                const isMe = s.storeId === storeId;
                return (
                  <div key={s.storeId} style={{ background: isMe ? 'rgba(200,149,108,0.15)' : 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', border: isMe ? '1px solid var(--accent)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: isMe ? 700 : 400 }}>{s.storeName ?? `매장 ${i + 1}`} {isMe ? '(우리)' : ''}</span>
                      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isMe ? 'var(--accent)' : 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{Number(s.contractAmount ?? 0).toLocaleString()}원</div>
                  </div>
                );
              })}
              {allStores.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>비교 데이터 없음</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
