import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

type Period = 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'year';

const PERIOD_LABELS: { id: Period; label: string }[] = [
  { id: 'month', label: '이달' },
  { id: 'q1', label: '1분기' },
  { id: 'q2', label: '2분기' },
  { id: 'q3', label: '3분기' },
  { id: 'q4', label: '4분기' },
  { id: 'h1', label: '상반기' },
  { id: 'h2', label: '하반기' },
  { id: 'year', label: '연간' },
];

function getPrimaryMonth(period: Period): number {
  const now = new Date();
  switch (period) {
    case 'q1': return 3;
    case 'q2': return 6;
    case 'q3': return 9;
    case 'q4': return 12;
    case 'h1': return 6;
    case 'h2': return 12;
    case 'year': return 12;
    default: return now.getMonth() + 1;
  }
}

export default function HqPerformanceTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<Period>('month');

  const primaryMonth = period === 'month' ? now.getMonth() + 1 : getPrimaryMonth(period);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['hq-all-metrics', year, primaryMonth],
    queryFn: () =>
      api.get(`/dashboard/all?year=${year}&month=${primaryMonth}`).then((r) => r.data).catch(() => []),
  });

  const storeList = stores as any[];
  const totalAmount = storeList.reduce((s: number, st: any) => s + Number(st.contractAmount ?? 0), 0);
  const totalContracts = storeList.reduce((s: number, st: any) => s + Number(st.contractCount ?? 0), 0);
  const totalQuotes = storeList.reduce((s: number, st: any) => s + Number(st.quoteCount ?? 0), 0);

  const sortedByAmount = [...storeList].sort((a, b) => Number(b.contractAmount) - Number(a.contractAmount));

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
        </div>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: '전체 매출', value: `${(totalAmount / 10000).toFixed(0)}만원`, sub: `${totalAmount.toLocaleString()}원` },
          { label: '전체 계약', value: `${totalContracts}건`, sub: `전환율 ${totalQuotes > 0 ? ((totalContracts / totalQuotes) * 100).toFixed(1) : 0}%` },
          { label: '전체 견적', value: `${totalQuotes}건`, sub: `매장 ${storeList.length}개` },
        ].map((c) => (
          <div key={c.label} className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent2)' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
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
                        <div style={{ width: 60, height: 4, background: 'rgba(255,245,235,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(Number(ratio), 100)}%`, background: 'var(--accent)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{ratio}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {storeList.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
