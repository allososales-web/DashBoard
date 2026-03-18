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

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div style={{ color: '#e53e3e' }}>데이터를 불러올 수 없습니다.</div>;

  const m = data?.metrics;
  const g = data?.goal;

  const cardStyle: React.CSSProperties = { background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
  const labelStyle: React.CSSProperties = { fontSize: 13, color: '#6b7280', marginBottom: 4 };
  const valueStyle: React.CSSProperties = { fontSize: 24, fontWeight: 700 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>대시보드</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db' }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db' }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
          <button onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}
            style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            {recalcMutation.isPending ? '계산 중...' : 'KPI 재계산'}
          </button>
        </div>
      </div>

      {recalcMutation.isError && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          KPI 재계산 실패: {(recalcMutation.error as any)?.response?.data?.message || '서버 오류가 발생했습니다.'}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>견적 수</div>
          <div style={valueStyle}>{m?.quoteCount ?? 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>계약 수</div>
          <div style={valueStyle}>{m?.contractCount ?? 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>계약 매출</div>
          <div style={valueStyle}>{Number(m?.contractAmount ?? 0).toLocaleString()}원</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>전환율</div>
          <div style={valueStyle}>{(Number(m?.conversionRate ?? 0) * 100).toFixed(1)}%</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>평균 주문</div>
          <div style={valueStyle}>{Number(m?.avgOrderValue ?? 0).toLocaleString()}원</div>
        </div>
      </div>

      {/* Goal Achievement */}
      {g && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>목표 달성률</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <div style={labelStyle}>매출 달성률</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: g.achievementRate.amountRate >= 100 ? '#10b981' : '#f59e0b' }}>
                {g.achievementRate.amountRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>목표: {Number(g.targetAmount).toLocaleString()}원</div>
            </div>
            <div>
              <div style={labelStyle}>계약 달성률</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: g.achievementRate.contractRate >= 100 ? '#10b981' : '#f59e0b' }}>
                {g.achievementRate.contractRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>목표: {g.targetContracts}건</div>
            </div>
            <div>
              <div style={labelStyle}>상담 달성률</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: g.achievementRate.consultRate >= 100 ? '#10b981' : '#f59e0b' }}>
                {g.achievementRate.consultRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>목표: {g.targetConsults}건</div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Breakdown */}
      {m?.collectionBreakdown && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>컬렉션별 매출</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13 }}>컬렉션</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 13 }}>계약 수</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 13 }}>아이템 수</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 13 }}>매출</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(COLLECTION_LABELS).map(([key, label]) => {
                const item = m.collectionBreakdown[key as Collection];
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 12px', fontSize: 14 }}>{label}</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14 }}>{item?.contractCount ?? 0}</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14 }}>{item?.itemCount ?? 0}</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14 }}>{Number(item?.totalAmount ?? 0).toLocaleString()}원</td>
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
