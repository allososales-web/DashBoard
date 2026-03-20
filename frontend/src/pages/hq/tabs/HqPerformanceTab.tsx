import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { useMetricsStores } from '../../../hooks/useMetricsStores';

type Period = 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'year' | 'custom';

const PERIOD_LABELS: { id: Period; label: string }[] = [
  { id: 'month', label: '이달' },
  { id: 'q1', label: '1분기' },
  { id: 'q2', label: '2분기' },
  { id: 'q3', label: '3분기' },
  { id: 'q4', label: '4분기' },
  { id: 'h1', label: '상반기' },
  { id: 'h2', label: '하반기' },
  { id: 'year', label: '연간' },
  { id: 'custom', label: '직접 설정' },
];

const CHANNEL_FILTERS = [
  { value: 'ROAD', label: '로드', color: '#f0a070' },
  { value: 'DEPARTMENT', label: '백화점', color: '#b8a4f0' },
  { value: 'MALL', label: '몰', color: '#7dd8b8' },
  { value: 'STARFIELD', label: '스타필드', color: '#fcd080' },
  { value: 'POPUP', label: '팝업', color: '#f9a0a0' },
  { value: 'OTHER', label: '기타', color: '#b0bec5' },
];

function getPrimaryMonth(period: Period, now: Date): number {
  switch (period) {
    case 'q1': return 3; case 'q2': return 6; case 'q3': return 9; case 'q4': return 12;
    case 'h1': return 6; case 'h2': return 12; case 'year': return 12;
    default: return now.getMonth() + 1;
  }
}

// 당월 주차 계산
function getWeeksInMonth(year: number, month: number) {
  const weeks: { label: string; start: number; end: number }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekNum = 1, start = 1;
  while (start <= daysInMonth) {
    let end = start;
    while (end < daysInMonth && new Date(year, month - 1, end + 1).getDay() !== 0) end++;
    weeks.push({ label: `${weekNum}주차`, start, end });
    weekNum++; start = end + 1;
  }
  return weeks;
}

export default function HqPerformanceTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set(CHANNEL_FILTERS.map(c => c.value)));
  const { includedIds, count: metricsCount } = useMetricsStores();

  const primaryMonth = period === 'custom'
    ? (customEnd ? Number(customEnd.split('-')[1]) : now.getMonth() + 1)
    : getPrimaryMonth(period, now);

  const { data: allStores = [], isLoading } = useQuery({
    queryKey: ['hq-all-metrics', year, primaryMonth],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${primaryMonth}`).then((r) => r.data).catch(() => []),
  });

  const { data: adminStores = [] } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => api.get('/stores/admin/all').then((r) => r.data).catch(() => []),
  });

  // 사업부 목표 (goals API에서 가져오기 — 없으면 0)
  const { data: hqGoal } = useQuery({
    queryKey: ['hq-goal', year, primaryMonth],
    queryFn: () => api.get(`/hq/goal?year=${year}&month=${primaryMonth}`).then((r) => r.data).catch(() => null),
  });

  const channelMap: Record<string, string> = {};
  (adminStores as any[]).forEach((s: any) => { channelMap[s.id] = s.defaultChannel ?? 'ROAD'; });

  const toggleChannel = (ch: string) => {
    setActiveChannels((prev) => { const next = new Set(prev); if (next.has(ch)) next.delete(ch); else next.add(ch); return next; });
  };

  const metricsFiltered = metricsCount > 0
    ? (allStores as any[]).filter((s: any) => includedIds.has(s.storeId))
    : (allStores as any[]);

  const filteredList = metricsFiltered.filter((s: any) => {
    const ch = channelMap[s.storeId] ?? 'ROAD';
    return activeChannels.has(ch);
  });

  const totalAmount = filteredList.reduce((sum: number, st: any) => sum + Number(st.contractAmount ?? 0), 0);
  const totalContracts = filteredList.reduce((sum: number, st: any) => sum + Number(st.contractCount ?? 0), 0);
  const totalQuotes = filteredList.reduce((sum: number, st: any) => sum + Number(st.quoteCount ?? 0), 0);
  const sortedByAmount = [...filteredList].sort((a, b) => Number(b.contractAmount) - Number(a.contractAmount));

  // 채널별 매출 비중
  const channelAmounts: Record<string, number> = {};
  filteredList.forEach((s: any) => {
    const ch = channelMap[s.storeId] ?? 'ROAD';
    channelAmounts[ch] = (channelAmounts[ch] ?? 0) + Number(s.contractAmount ?? 0);
  });

  // 목표 달성률
  const goalAmount = Number(hqGoal?.targetAmount ?? 0);
  const goalContracts = Number(hqGoal?.targetContracts ?? 0);
  const goalQuotes = Number(hqGoal?.targetQuotes ?? 0);
  const amountRate = goalAmount > 0 ? Math.min((totalAmount / goalAmount) * 100, 999) : 0;
  const contractRate = goalContracts > 0 ? Math.min((totalContracts / goalContracts) * 100, 999) : 0;
  const quoteRate = goalQuotes > 0 ? Math.min((totalQuotes / goalQuotes) * 100, 999) : 0;

  // 당월 주차
  const weeks = getWeeksInMonth(now.getFullYear(), now.getMonth() + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 기간 선택 */}
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {period !== 'year' && (
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 'auto', minWidth: 90 }}>
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
          )}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PERIOD_LABELS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: period === p.id ? 'var(--accent)' : 'var(--glass)', color: period === p.id ? '#fff' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: period === p.id ? 600 : 400 }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ fontSize: 12 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>~</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ fontSize: 12 }} />
          </div>
        )}
        {/* 채널 필터 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>채널:</span>
          {CHANNEL_FILTERS.map((ch) => {
            const active = activeChannels.has(ch.value);
            return (
              <label key={ch.value} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400, background: active ? `${ch.color}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? ch.color : 'var(--glass-border)'}`, userSelect: 'none' }}>
                <input type="checkbox" checked={active} onChange={() => toggleChannel(ch.value)} style={{ accentColor: ch.color, width: 12, height: 12 }} />
                {ch.label}
              </label>
            );
          })}
          {metricsCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>실적 반영 {metricsCount}개 매장 기준</span>}
          {metricsCount === 0 && <span style={{ fontSize: 11, color: 'var(--warning)', marginLeft: 8 }}>⚠ 실적 반영 매장 미설정 — 관리자 탭에서 설정하세요</span>}
        </div>
      </div>

      {/* KPI 카드 — 진척율 포함 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {[
          { label: 'REVENUE', title: '매출 달성률', value: `${(totalAmount / 10000).toFixed(0)}만원`, rate: amountRate, goal: goalAmount > 0 ? `목표 ${(goalAmount / 10000).toFixed(0)}만원` : '목표 미설정', period: '이달' },
          { label: 'ORDERS', title: '판매 달성률', value: `${totalContracts}건`, rate: contractRate, goal: goalContracts > 0 ? `목표 ${goalContracts}건` : '목표 미설정', period: '이달' },
          { label: 'VISITORS', title: '방문 달성률', value: `${totalQuotes}건`, rate: quoteRate, goal: goalQuotes > 0 ? `목표 ${goalQuotes}건` : '목표 미설정', period: '이달' },
        ].map((c) => (
          <div key={c.label} className="glass" style={{ padding: 20, borderLeft: `3px solid ${c.rate >= 100 ? 'var(--success)' : c.rate > 0 ? 'var(--accent)' : 'var(--glass-border)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.title}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.rate >= 100 ? 'var(--success)' : c.rate > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                {c.rate > 0 ? `${c.rate.toFixed(1)}%` : '-'}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{c.value}</div>
            <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${Math.min(c.rate, 100)}%`, background: c.rate >= 100 ? 'var(--success)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{c.goal}</span>
              <span>▽ {c.period}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 채널별 매출 비중 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Channel Mix</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>채널별 매출 비중</div>
        {/* 전체 바 */}
        <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
          {CHANNEL_FILTERS.map((ch) => {
            const amt = channelAmounts[ch.value] ?? 0;
            const pct = totalAmount > 0 ? (amt / totalAmount) * 100 : 0;
            return pct > 0 ? (
              <div key={ch.value} style={{ width: `${pct}%`, background: ch.color, transition: 'width 0.5s' }} title={`${ch.label}: ${pct.toFixed(1)}%`} />
            ) : null;
          })}
          {totalAmount === 0 && <div style={{ width: '100%', background: 'rgba(0,0,0,0.07)' }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CHANNEL_FILTERS.map((ch) => {
            const amt = channelAmounts[ch.value] ?? 0;
            const pct = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : '0.0';
            const storeCount = filteredList.filter((s: any) => (channelMap[s.storeId] ?? 'ROAD') === ch.value).length;
            return (
              <div key={ch.value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={activeChannels.has(ch.value)} onChange={() => toggleChannel(ch.value)} style={{ accentColor: ch.color, width: 14, height: 14, flexShrink: 0 }} />
                <div style={{ width: 12, height: 12, borderRadius: 2, background: ch.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ch.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{storeCount > 0 ? `${storeCount}개 매장` : '—'}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 당월 주차별 섹터 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>당월 주차별 실적</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>기간 설정과 무관 — 항상 당월 기준</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {weeks.map((w, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{w.label} ({now.getMonth() + 1}/{w.start}~{now.getMonth() + 1}/{w.end})</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>전년비 데이터 준비 중</span>
              </div>
              <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${20 * (i + 1)}%`, background: 'var(--accent)', borderRadius: 3, opacity: 0.7 }} />
              </div>
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
              {sortedByAmount.map((s: any) => {
                const amt = Number(s.contractAmount ?? 0);
                const ratio = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : '0.0';
                const conv = s.quoteCount > 0 ? ((s.contractCount / s.quoteCount) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={s.storeId}>
                    <td style={{ fontWeight: 500 }}>{s.storeName}</td>
                    <td style={{ textAlign: 'right' }}>{s.contractCount ?? 0}건</td>
                    <td style={{ textAlign: 'right' }}>{amt.toLocaleString()}원</td>
                    <td style={{ textAlign: 'right' }}>{s.quoteCount ?? 0}건</td>
                    <td style={{ textAlign: 'right' }}>{conv}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <div style={{ width: 60, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(Number(ratio), 100)}%`, background: 'var(--accent)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{ratio}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
