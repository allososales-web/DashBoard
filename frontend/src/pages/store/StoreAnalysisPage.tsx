import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

type DataMode = 'ORDER' | 'SALES';

interface SeriesItem {
  series: string;
  amount: number;
  count: number;
  avgPrice: number;
}

interface SeriesKpiResponse {
  series: SeriesItem[];
  orderAmount: number;
  salesAmount: number;
  orderCount: number;
  salesCount: number;
}

const SERIES_COLORS = [
  '#c8956c', '#a07850', '#d4a574', '#8b6340',
  '#e8c4a0', '#6b4c2a', '#b8860b', '#cd853f',
];

function fmt만원(v: number) {
  if (v === 0) return '0';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.round(v / 10000).toLocaleString()}만`;
  return v.toLocaleString();
}

export default function StoreAnalysisPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dataMode, setDataMode] = useState<DataMode>('ORDER');

  const { data, isLoading } = useQuery<SeriesKpiResponse>({
    queryKey: ['store-series-kpi', storeId, year, month, dataMode],
    queryFn: () =>
      api
        .get(`/stores/${storeId}/series-kpi?year=${year}&month=${month}&dataMode=${dataMode}`)
        .then((r) => r.data),
    enabled: !!storeId,
  });

  const totalAmount = dataMode === 'ORDER' ? (data?.orderAmount ?? 0) : (data?.salesAmount ?? 0);
  const totalCount = dataMode === 'ORDER' ? (data?.orderCount ?? 0) : (data?.salesCount ?? 0);
  const seriesList = data?.series ?? [];
  const maxAmount = seriesList.length > 0 ? seriesList[0].amount : 1;

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>매장 분석</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 'auto', minWidth: 90, fontSize: 13 }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 'auto', minWidth: 70, fontSize: 13 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
              <option key={mo} value={mo}>{mo}월</option>
            ))}
          </select>
        </div>
      </div>

      {/* 수주/매출 모드 선택 */}
      <div className="glass" style={{ padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>기준:</span>
        {(['ORDER', 'SALES'] as DataMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setDataMode(mode)}
            style={{
              fontSize: 12, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: dataMode === mode ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
              color: dataMode === mode ? '#fff' : 'var(--text-muted)',
              fontWeight: dataMode === mode ? 700 : 400,
            }}
          >
            {mode === 'ORDER' ? '수주' : '매출'}
          </button>
        ))}
      </div>

      {/* KPI 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          {
            label: dataMode === 'ORDER' ? '수주 금액' : '매출 금액',
            value: `${fmt만원(totalAmount)}원`,
            color: 'var(--accent)',
          },
          {
            label: dataMode === 'ORDER' ? '수주 건수' : '매출 건수',
            value: `${totalCount}건`,
            color: '#10b981',
          },
          {
            label: '시리즈 수',
            value: `${seriesList.length}종`,
            color: '#a78bfa',
          },
          {
            label: '평균 단가',
            value: totalCount > 0 ? `${fmt만원(Math.round(totalAmount / totalCount))}원` : '-',
            color: '#f59e0b',
          },
        ].map((card) => (
          <div key={card.label} className="glass" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : seriesList.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          {year}년 {month}월 데이터가 없습니다.
        </div>
      ) : (
        <>
          {/* 시리즈별 바 차트 */}
          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
              시리즈별 {dataMode === 'ORDER' ? '수주' : '매출'} 현황
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {seriesList.map((item, i) => {
                const barPct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                const totalPct = totalAmount > 0 ? (item.amount / totalAmount * 100).toFixed(1) : '0.0';
                const color = SERIES_COLORS[i % SERIES_COLORS.length];
                return (
                  <div key={item.series}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color }}>{item.series}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.count}건</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt만원(item.amount)}원</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{totalPct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 4, opacity: 0.85, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      평균 단가: {fmt만원(item.avgPrice)}원
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 시리즈별 상세 테이블 */}
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>시리즈별 상세</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>시리즈</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>금액</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>건수</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>평균단가</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>비중</th>
                  </tr>
                </thead>
                <tbody>
                  {seriesList.map((item, i) => {
                    const color = SERIES_COLORS[i % SERIES_COLORS.length];
                    const pct = totalAmount > 0 ? (item.amount / totalAmount * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={item.series} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            <span style={{ fontWeight: 600, color }}>{item.series}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt만원(item.amount)}원</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.count}건</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmt만원(item.avgPrice)}원</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
