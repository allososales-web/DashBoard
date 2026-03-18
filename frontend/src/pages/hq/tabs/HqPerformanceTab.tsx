import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export default function HqPerformanceTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['hq-stores'],
    queryFn: () => api.get('/stores?limit=100').then((r) => r.data.data ?? r.data),
  });

  const { data: metricsMap = {}, isLoading: metricsLoading } = useQuery({
    queryKey: ['hq-metrics', year, month],
    queryFn: async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        (stores as any[]).map(async (s: any) => {
          try {
            const r = await api.get(`/dashboard/${s.id}/metrics?year=${year}&month=${month}`);
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

  return (
    <div>
      {/* 기간 선택 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      {/* 전체 합계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>전체 매출</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{totalAmount.toLocaleString()}원</div>
        </div>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>전체 계약</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{totalContracts}건</div>
        </div>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>운영 매장</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{(stores as any[]).length}개</div>
        </div>
      </div>

      {/* 매장별 실적 테이블 */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: 14, fontWeight: 600 }}>
          매장별 실적
        </div>
        {isLoading || metricsLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>불러오는 중...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>매장</th>
                <th style={{ textAlign: 'right' }}>계약 수</th>
                <th style={{ textAlign: 'right' }}>매출</th>
                <th style={{ textAlign: 'right' }}>전환율</th>
                <th style={{ textAlign: 'right' }}>평균 주문</th>
              </tr>
            </thead>
            <tbody>
              {(stores as any[]).map((s: any) => {
                const m = metricsMap[s.id]?.metrics;
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ textAlign: 'right' }}>{m?.contractCount ?? 0}건</td>
                    <td style={{ textAlign: 'right' }}>{Number(m?.contractAmount ?? 0).toLocaleString()}원</td>
                    <td style={{ textAlign: 'right' }}>{(Number(m?.conversionRate ?? 0) * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>{Number(m?.avgOrderValue ?? 0).toLocaleString()}원</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
