import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../../services/dashboard';
import { Collection } from '../../types/common.types';

const COLLECTION_LABELS: Record<Collection, string> = {
  [Collection.SATI]: 'SATI',
  [Collection.QUERENCIA]: 'QUERENCIA',
  [Collection.MILO]: 'MILO',
  [Collection.BONUM]: 'BONUM',
  [Collection.VARD]: 'VARD',
  [Collection.ELMER]: 'ELMER',
};

export default function DashboardPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['metrics', storeId, year, month],
    queryFn: () => dashboardApi.getMetricsByMonth(storeId!, year, month),
    enabled: !!storeId,
  });

  const recalcMutation = useMutation({
    mutationFn: () => dashboardApi.recalculate(storeId!, year, month),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metrics', storeId, year, month] }),
  });

  if (isLoading) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>불러오는 중...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: 20 }}>데이터를 불러올 수 없습니다.</div>;

  const m = data?.metrics;
  const g = data?.goal;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>대시보드</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 14px' }} onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
            {recalcMutation.isPending ? '계산 중...' : 'KPI 재계산'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: '견적 수', value: `${m?.quoteCount ?? 0}건` },
          { label: '계약 수', value: `${m?.contractCount ?? 0}건` },
          { label: '계약 매출', value: `${Number(m?.contractAmount ?? 0).toLocaleString()}원` },
          { label: '전환율', value: `${(Number(m?.conversionRate ?? 0) * 100).toFixed(1)}%` },
          { label: '평균 주문', value: `${Number(m?.avgOrderValue ?? 0).toLocaleString()}원` },
        ].map((card) => (
          <div key={card.label} className="glass" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Goal Achievement */}
      {g && (
        <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)' }}>목표 달성률</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: '매출', rate: g.achievementRate.amountRate, target: `${Number(g.targetAmount).toLocaleString()}원` },
              { label: '계약', rate: g.achievementRate.contractRate, target: `${g.targetContracts}건` },
              { label: '상담', rate: g.achievementRate.consultRate, target: `${g.targetConsults}건` },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: item.rate >= 100 ? 'var(--success)' : 'var(--warning)' }}>
                  {item.rate.toFixed(1)}%
                </div>
                <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(item.rate, 100)}%`, background: item.rate >= 100 ? 'var(--success)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>목표: {item.target}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collection Breakdown */}
      {m?.collectionBreakdown && (
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: 13, fontWeight: 600 }}>컬렉션별 매출</div>
          <table>
            <thead>
              <tr>
                <th>컬렉션</th>
                <th style={{ textAlign: 'right' }}>계약 수</th>
                <th style={{ textAlign: 'right' }}>아이템</th>
                <th style={{ textAlign: 'right' }}>매출</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(COLLECTION_LABELS).map(([key, label]) => {
                const item = m.collectionBreakdown[key as Collection];
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 500 }}>{label}</td>
                    <td style={{ textAlign: 'right' }}>{item?.contractCount ?? 0}</td>
                    <td style={{ textAlign: 'right' }}>{item?.itemCount ?? 0}</td>
                    <td style={{ textAlign: 'right' }}>{Number(item?.totalAmount ?? 0).toLocaleString()}원</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
