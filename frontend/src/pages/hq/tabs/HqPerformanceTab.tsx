import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

type Period = 'week' | 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'year' | 'custom';

const PERIOD_LABELS: { id: Period; label: string }[] = [
  { id: 'week', label: '이번 주' },
  { id: 'month', label: '이달' },
  { id: 'q1', label: '1분기' },
  { id: 'q2', label: '2분기' },
  { id: 'q3', label: '3분기' },
  { id: 'q4', label: '4분기' },
  { id: 'h1', label: '상반기' },
  { id: 'h2', label: '하반기' },
  { id: 'year', label: '연간' },
  { id: 'custom', label: '기간설정' },
];

const CHANNELS = ['직영', '온라인', '제휴', '기타'];
const CHANNEL_COLORS = ['#c8956c', '#e8b89a', '#a07050', '#d4a843'];

function getPeriodMonths(period: Period, year: number): number[] {
  const now = new Date();
  switch (period) {
    case 'week': return [now.getMonth() + 1];
    case 'month': return [now.getMonth() + 1];
    case 'q1': return [1, 2, 3];
    case 'q2': return [4, 5, 6];
    case 'q3': return [7, 8, 9];
    case 'q4': return [10, 11, 12];
    case 'h1': return [1, 2, 3, 4, 5, 6];
    case 'h2': return [7, 8, 9, 10, 11, 12];
    case 'year': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    default: return [now.getMonth() + 1];
  }
}

const MOCK_TRENDS = [
  { title: '2024 소파 시장 트렌드: 모듈형 소파 수요 급증', source: '가구신문', date: '2025-10', summary: '모듈형·조합형 소파가 1인 가구 증가와 함께 시장 점유율 32% 달성. 특히 패브릭 소재 선호도 상승.' },
  { title: '가구업계 온라인 채널 비중 40% 돌파', source: '리빙트렌드', date: '2025-11', summary: '온라인 가구 구매 비중이 처음으로 40%를 넘어섰으며, 모바일 구매가 전체의 65%를 차지.' },
  { title: '프리미엄 소파 시장 성장세 지속', source: '인테리어투데이', date: '2025-12', summary: '300만원 이상 프리미엄 소파 판매량 전년 대비 18% 증가. 소비자 가치 소비 트렌드 반영.' },
  { title: '가구 리폼·업사이클링 시장 확대', source: '그린리빙', date: '2026-01', summary: '환경 의식 소비자 증가로 가구 리폼 서비스 수요 급증. 소파 커버 교체 서비스 인기.' },
  { title: '2026 리빙 트렌드: 내추럴 브라운톤 강세', source: '디자인하우스', date: '2026-02', summary: '올해 인테리어 키워드는 내추럴·웜톤. 베이지·브라운 계열 소파 판매 전년 대비 25% 증가.' },
];

export default function HqPerformanceTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const months = getPeriodMonths(period, year);
  const primaryMonth = months[months.length - 1];

  const { data: stores = [] } = useQuery({
    queryKey: ['hq-stores'],
    queryFn: () => api.get('/stores?limit=100').then((r) => r.data.data ?? r.data),
  });

  const { data: metricsMap = {}, isLoading } = useQuery({
    queryKey: ['hq-metrics', year, primaryMonth],
    queryFn: async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        (stores as any[]).map(async (s: any) => {
          try {
            const r = await api.get(`/dashboard/${s.id}/metrics?year=${year}&month=${primaryMonth}`);
            results[s.id] = r.data;
          } catch { results[s.id] = null; }
        })
      );
      return results;
    },
    enabled: (stores as any[]).length > 0,
  });

  const totalAmount = Object.values(metricsMap).reduce((sum: number, d: any) => sum + Number(d?.metrics?.contractAmount ?? 0), 0);
  const totalContracts = Object.values(metricsMap).reduce((sum: number, d: any) => sum + Number(d?.metrics?.contractCount ?? 0), 0);
  const totalQuotes = Object.values(metricsMap).reduce((sum: number, d: any) => sum + Number(d?.metrics?.quoteCount ?? 0), 0);

  // 채널별 mock 비중 (실제 데이터 없으면 mock)
  const channelData = CHANNELS.map((ch, i) => ({
    name: ch,
    amount: Math.round(totalAmount * [0.45, 0.30, 0.15, 0.10][i]),
    ratio: [45, 30, 15, 10][i],
    color: CHANNEL_COLORS[i],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 기간 선택 */}
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 90 }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PERIOD_LABELS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: period === p.id ? 'var(--accent)' : 'var(--glass)', color: period === p.id ? '#fff' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: period === p.id ? 600 : 400 }}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ width: 140 }} />
              <span style={{ color: 'var(--text-muted)' }}>~</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ width: 140 }} />
            </div>
          )}
        </div>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: '전체 매출', value: `${(totalAmount / 10000).toFixed(0)}만원`, sub: `${totalAmount.toLocaleString()}원` },
          { label: '전체 계약', value: `${totalContracts}건`, sub: `전환율 ${totalQuotes > 0 ? ((totalContracts / totalQuotes) * 100).toFixed(1) : 0}%` },
          { label: '전체 견적', value: `${totalQuotes}건`, sub: `매장 ${(stores as any[]).length}개` },
        ].map((c) => (
          <div key={c.label} className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent2)' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 채널별 비중 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>채널별 매출 비중</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {channelData.map((ch) => (
            <div key={ch.name} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{ch.name}</div>
              <div style={{ position: 'relative', width: 70, height: 70, margin: '0 auto', marginBottom: 8 }}>
                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,245,235,0.08)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={ch.color} strokeWidth="3"
                    strokeDasharray={`${ch.ratio} ${100 - ch.ratio}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{ch.ratio}%</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{(ch.amount / 10000).toFixed(0)}만원</div>
            </div>
          ))}
        </div>
      </div>

      {/* 매장별 실적 테이블 */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: 14, fontWeight: 700 }}>매장별 실적</div>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>불러오는 중...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>매장</th>
                <th style={{ textAlign: 'right' }}>계약</th>
                <th style={{ textAlign: 'right' }}>매출</th>
                <th style={{ textAlign: 'right' }}>견적</th>
                <th style={{ textAlign: 'right' }}>전환율</th>
                <th style={{ textAlign: 'right' }}>비중</th>
              </tr>
            </thead>
            <tbody>
              {(stores as any[]).map((s: any) => {
                const m = metricsMap[s.id]?.metrics;
                const amt = Number(m?.contractAmount ?? 0);
                const ratio = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ textAlign: 'right' }}>{m?.contractCount ?? 0}건</td>
                    <td style={{ textAlign: 'right' }}>{amt.toLocaleString()}원</td>
                    <td style={{ textAlign: 'right' }}>{m?.quoteCount ?? 0}건</td>
                    <td style={{ textAlign: 'right' }}>{(Number(m?.conversionRate ?? 0) * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <div style={{ width: 60, height: 4, background: 'rgba(255,245,235,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(Number(ratio), 100)}%`, background: 'var(--accent)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{ratio}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 트렌드 인사이트 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>소파·가구 시장 트렌드 인사이트</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>직전 6개월 주요 기사 요약</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_TRENDS.map((t, i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,245,235,0.04)', borderRadius: 10, borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{t.source} · {t.date}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{t.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
