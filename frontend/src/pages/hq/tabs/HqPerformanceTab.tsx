import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { useMetricsStores } from '../../../hooks/useMetricsStores';
import DataModeSelector from '../../../components/DataModeSelector';
import { DataMode } from '../../../types/dashboard.types';

type Period = 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'year' | 'custom';
type ChartView = 'annual' | 'quarterly' | 'recent3';

const PERIOD_LABELS: { id: Period; label: string }[] = [
  { id: 'month', label: '이달' }, { id: 'q1', label: '1분기' }, { id: 'q2', label: '2분기' },
  { id: 'q3', label: '3분기' }, { id: 'q4', label: '4분기' }, { id: 'h1', label: '상반기' },
  { id: 'h2', label: '하반기' }, { id: 'year', label: '연간' }, { id: 'custom', label: '직접 설정' },
];

const CHANNEL_FILTERS = [
  { value: 'ROAD',       label: '로드',    color: '#6b8f71' },
  { value: 'DEPARTMENT', label: '백화점',  color: '#8a7f6e' },
  { value: 'MALL',       label: '몰',      color: '#7a8f8a' },
  { value: 'STARFIELD',  label: '스타필드', color: '#6e7a8a' },
  { value: 'POPUP',      label: '팝업',    color: '#8a7a6e' },
  { value: 'OTHER',      label: '기타',    color: '#9a9a92' },
];

function getPrimaryMonth(period: Period, now: Date): number {
  switch (period) {
    case 'q1': return 3; case 'q2': return 6; case 'q3': return 9; case 'q4': return 12;
    case 'h1': return 6; case 'h2': return 12; case 'year': return 12;
    default: return now.getMonth() + 1;
  }
}

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

// ── 채널별 매출 비중 도넛 차트 ────────────────────────────────────────────────
function ChannelDonutChart({
  channelAmounts, activeChannels, toggleChannel, channelMap, metricsFiltered,
}: {
  channelAmounts: Record<string, number>;
  activeChannels: Set<string>;
  toggleChannel: (ch: string) => void;
  channelMap: Record<string, string>;
  metricsFiltered: any[];
}) {
  const SIZE = 220;
  const R = 80;
  const STROKE = 32;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * R;

  // 체크된 채널 기준 합계
  const activeTotal = CHANNEL_FILTERS
    .filter((ch) => activeChannels.has(ch.value))
    .reduce((sum, ch) => sum + (channelAmounts[ch.value] ?? 0), 0);

  // arc 계산 (체크된 채널만)
  let offset = 0;
  const arcs = CHANNEL_FILTERS
    .filter((ch) => activeChannels.has(ch.value))
    .map((ch) => {
      const amt = channelAmounts[ch.value] ?? 0;
      const pct = activeTotal > 0 ? amt / activeTotal : 0;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const arc = { ch, pct, dash, gap, offset, amt };
      offset += dash;
      return arc;
    })
    .filter((a) => a.pct > 0);

  // 가장 큰 채널 (중앙 표시)
  const topArc = arcs.length > 0 ? arcs.reduce((a, b) => (a.pct > b.pct ? a : b)) : null;

  return (
    <div className="glass" style={{ padding: 20 }}>
      {/* 헤더: 제목 + 채널 체크박스 가로 나열 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Channel Mix</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>채널별 매출 비중</div>
        </div>
        {/* 채널 체크박스 태그 — 가로 나열 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {CHANNEL_FILTERS.map((ch) => {
            const active = activeChannels.has(ch.value);
            return (
              <label
                key={ch.value}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                  padding: '5px 12px', borderRadius: 20,
                  fontSize: 12, fontWeight: active ? 700 : 400,
                  background: active ? ch.color : 'rgba(0,0,0,0.04)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: `1.5px solid ${active ? ch.color : 'var(--glass-border)'}`,
                  userSelect: 'none',
                  transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: active ? `0 2px 8px ${ch.color}44` : 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleChannel(ch.value)}
                  style={{ display: 'none' }}
                />
                {active && <span style={{ fontSize: 10 }}>✓</span>}
                {ch.label}
              </label>
            );
          })}
        </div>
      </div>

      {/* 도넛 차트 중앙 배치 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
        {/* SVG 도넛 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            {/* 배경 링 */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={STROKE} />
            {arcs.length === 0 ? null : arcs.map((a, i) => (
              <circle
                key={a.ch.value}
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke={a.ch.color}
                strokeWidth={STROKE}
                strokeDasharray={`${a.dash} ${a.gap}`}
                strokeDashoffset={-a.offset}
                strokeLinecap="butt"
                style={{
                  transition: `stroke-dasharray 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s, stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s`,
                }}
              />
            ))}
          </svg>
          {/* 중앙 텍스트 */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            {topArc ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 900, color: topArc.ch.color, lineHeight: 1 }}>
                  {(topArc.pct * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                  {topArc.ch.label}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>데이터 없음</div>
            )}
          </div>
        </div>

        {/* 범례: 체크된 채널만 표시 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 160 }}>
          {CHANNEL_FILTERS.filter((ch) => activeChannels.has(ch.value)).map((ch) => {
            const amt = channelAmounts[ch.value] ?? 0;
            const pct = activeTotal > 0 ? (amt / activeTotal) * 100 : 0;
            const storeCount = metricsFiltered.filter((s: any) => (channelMap[s.storeId] ?? 'ROAD') === ch.value).length;
            return (
              <div key={ch.value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ch.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {storeCount > 0 ? `${storeCount}개 매장` : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: ch.color }}>{pct.toFixed(1)}%</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {amt > 0 ? `${(amt / 10000).toFixed(0)}만` : '—'}
                  </div>
                </div>
              </div>
            );
          })}
          {arcs.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>채널을 선택하세요</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 진척율 그래프 컴포넌트 ──────────────────────────────────────────────────
interface BarItem { label: string; rate: number; actual: number; goal: number; color: string; }

function AnimatedBar({ rate, color, delay }: { rate: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0);
  const capped = Math.min(rate, 100);
  const over = rate > 100;

  useEffect(() => {
    const t = setTimeout(() => setWidth(capped), 80 + delay);
    return () => clearTimeout(t);
  }, [capped, delay]);

  return (
    <div style={{ position: 'relative', height: 10, background: 'rgba(0,0,0,0.06)', borderRadius: 5, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: `${width}%`,
        background: over ? 'var(--success)' : rate > 0 ? color : 'rgba(0,0,0,0.1)',
        borderRadius: 5,
        transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${delay * 0.001}s`,
        boxShadow: over ? `0 0 8px ${color}60` : 'none',
      }} />
      {over && (
        <div style={{
          position: 'absolute', right: 0, top: 0, height: '100%', width: 3,
          background: 'var(--success)', borderRadius: 2,
          boxShadow: '0 0 6px rgba(90,122,90,0.6)',
        }} />
      )}
    </div>
  );
}

function GoalProgressChart({
  chartYear, includedIds, channelMap,
}: { chartYear: number; includedIds: Set<string>; channelMap: Record<string, string> }) {
  const now = new Date();
  const [view, setView] = useState<ChartView>('annual');
  const [animated, setAnimated] = useState(false);
  const mountRef = useRef(false);

  // 탭 진입 시 애니메이션 트리거
  useEffect(() => {
    if (!mountRef.current) {
      mountRef.current = true;
      const t = setTimeout(() => setAnimated(true), 100);
      return () => clearTimeout(t);
    }
  }, []);

  // view 변경 시 재애니메이션
  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, [view]);

  // 연간 목표 (12개월)
  const { data: annualGoals = {} } = useQuery({
    queryKey: ['hq-annual-goals', chartYear],
    queryFn: () => api.get(`/hq/goals/annual?year=${chartYear}`).then((r) => r.data).catch(() => ({})),
  });

  // 월별 실적 — 필요한 달만 fetch
  const monthsNeeded: number[] = (() => {
    if (view === 'annual') return [1,2,3,4,5,6,7,8,9,10,11,12];
    if (view === 'quarterly') return [3,6,9,12];
    // recent3: 직전 3개월
    const m = now.getMonth() + 1;
    return [
      m - 2 <= 0 ? m - 2 + 12 : m - 2,
      m - 1 <= 0 ? m - 1 + 12 : m - 1,
      m,
    ];
  })();

  const metricsQueries = useQuery({
    queryKey: ['hq-chart-metrics', chartYear, view],
    queryFn: async () => {
      const results: Record<number, number> = {};
      await Promise.all(monthsNeeded.map(async (m) => {
        const yr = (view === 'recent3' && m > (now.getMonth() + 1)) ? chartYear - 1 : chartYear;
        const data = await api.get(`/dashboard/all?year=${yr}&month=${m}`).then((r) => r.data).catch(() => []);
        const filtered = (data as any[]).filter((s: any) => includedIds.has(s.storeId));
        results[m] = filtered.reduce((sum: number, s: any) => sum + Number(s.contractAmount ?? 0), 0);
      }));
      return results;
    },
    enabled: includedIds.size > 0,
  });

  const actualByMonth: Record<number, number> = metricsQueries.data ?? {};

  // 뷰별 바 데이터 생성
  const bars: BarItem[] = (() => {
    const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const getGoal = (m: number) => {
      const key = `${chartYear}-${String(m).padStart(2,'0')}`;
      return Number((annualGoals as any)[key]?.targetAmount ?? 0);
    };
    const getActual = (m: number) => actualByMonth[m] ?? 0;

    if (view === 'annual') {
      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const goal = getGoal(m);
        const actual = getActual(m);
        const rate = goal > 0 ? (actual / goal) * 100 : 0;
        const isFuture = m > now.getMonth() + 1 && chartYear === now.getFullYear();
        return { label: MONTH_LABELS[i], rate: isFuture ? 0 : rate, actual, goal, color: 'var(--accent)' };
      });
    }

    if (view === 'quarterly') {
      return [
        { label: 'Q1', months: [1,2,3] }, { label: 'Q2', months: [4,5,6] },
        { label: 'Q3', months: [7,8,9] }, { label: 'Q4', months: [10,11,12] },
      ].map(({ label, months }) => {
        const goal = months.reduce((s, m) => s + getGoal(m), 0);
        const actual = months.reduce((s, m) => s + getActual(m), 0);
        const rate = goal > 0 ? (actual / goal) * 100 : 0;
        const colors = ['#6b8f71','#7a8f8a','#8a7f6e','#6e7a8a'];
        return { label, rate, actual, goal, color: colors[['Q1','Q2','Q3','Q4'].indexOf(label)] };
      });
    }

    // recent3
    const m = now.getMonth() + 1;
    return [-2,-1,0].map((offset, i) => {
      const mo = m + offset <= 0 ? m + offset + 12 : m + offset;
      const goal = getGoal(mo);
      const actual = getActual(mo);
      const rate = goal > 0 ? (actual / goal) * 100 : 0;
      return { label: MONTH_LABELS[mo - 1], rate, actual, goal, color: ['#8a7f6e','#7a8f8a','#6b8f71'][i] };
    });
  })();

  const maxRate = Math.max(...bars.map(b => b.rate), 100);

  return (
    <div className="glass" style={{ padding: 24 }}>
      {/* 헤더 */}
      <div className="goal-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Goal Progress</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>목표 매출 진척율</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>기간 설정과 무관 — {chartYear}년 기준</div>
        </div>
        <div className="goal-chart-btns" style={{ display: 'flex', gap: 4 }}>
          {([['annual','연도별'],['quarterly','분기별'],['recent3','직전 3개월']] as [ChartView, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)',
              background: view === v ? 'var(--accent)' : 'var(--surface)',
              color: view === v ? '#fff' : 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', fontWeight: view === v ? 600 : 400,
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* 그래프 영역 */}
      {metricsQueries.isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>불러오는 중...</div>
      ) : includedIds.size === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>⚠ 실적 반영 매장을 먼저 설정하세요</div>
      ) : (
        <>
          {/* 막대 그래프 */}
          <div style={{ display: 'flex', gap: view === 'annual' ? 6 : 16, alignItems: 'flex-end', height: 140, marginBottom: 8 }}>
            {bars.map((bar, i) => {
              const heightPct = maxRate > 0 ? (bar.rate / maxRate) * 100 : 0;
              const animH = animated ? heightPct : 0;
              const over = bar.rate > 100;
              return (
                <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  {/* 달성률 레이블 */}
                  <div style={{
                    fontSize: view === 'annual' ? 9 : 11, fontWeight: 700,
                    color: over ? 'var(--success)' : bar.rate > 0 ? 'var(--accent)' : 'var(--text-light)',
                    opacity: animated ? 1 : 0,
                    transition: `opacity 0.4s ease ${0.3 + i * 0.05}s`,
                    whiteSpace: 'nowrap',
                  }}>
                    {bar.rate > 0 ? `${bar.rate.toFixed(0)}%` : '—'}
                  </div>
                  {/* 막대 */}
                  <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', height: 110 }}>
                    {/* 목표선 (100% 위치) */}
                    <div style={{
                      position: 'absolute', left: 0, right: 0,
                      bottom: `${Math.min((100 / maxRate) * 100, 100)}%`,
                      height: 1, background: 'rgba(0,0,0,0.12)',
                      borderTop: '1px dashed rgba(0,0,0,0.15)',
                    }} />
                    <div style={{
                      width: '100%',
                      height: `${animH}%`,
                      minHeight: bar.rate > 0 ? 3 : 0,
                      background: over
                        ? `linear-gradient(180deg, var(--success) 0%, ${bar.color} 100%)`
                        : bar.rate > 0
                          ? `linear-gradient(180deg, ${bar.color}cc 0%, ${bar.color} 100%)`
                          : 'rgba(0,0,0,0.06)',
                      borderRadius: '4px 4px 2px 2px',
                      transition: `height 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 0.04}s`,
                      boxShadow: over ? `0 -2px 8px ${bar.color}50` : 'none',
                      position: 'relative',
                    }}>
                      {over && (
                        <div style={{
                          position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--success)',
                          boxShadow: '0 0 6px rgba(90,122,90,0.8)',
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X축 레이블 */}
          <div style={{ display: 'flex', gap: view === 'annual' ? 6 : 16 }}>
            {bars.map((bar) => (
              <div key={bar.label} style={{ flex: 1, textAlign: 'center', fontSize: view === 'annual' ? 9 : 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                {bar.label}
              </div>
            ))}
          </div>

          {/* 범례 + 요약 */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <div style={{ width: 20, height: 3, background: 'rgba(0,0,0,0.15)', borderTop: '1px dashed rgba(0,0,0,0.3)' }} />
              목표 100%
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }} />
              진행 중
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)' }} />
              목표 초과 달성
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
              {bars.filter(b => b.rate >= 100).length > 0 && (
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                  {bars.filter(b => b.rate >= 100).length}개 기간 목표 달성 ✓
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── 메인 탭 컴포넌트 ──────────────────────────────────────────────────────────
export default function HqPerformanceTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set(CHANNEL_FILTERS.map(c => c.value)));
  const [dataMode, setDataMode] = useState<DataMode>('ORDER');
  const { includedIds, count: metricsCount } = useMetricsStores();

  const primaryMonth = period === 'custom'
    ? (customEnd ? Number(customEnd.split('-')[1]) : now.getMonth() + 1)
    : getPrimaryMonth(period, now);

  const { data: allStores = [], isLoading } = useQuery({
    queryKey: ['hq-all-metrics', year, primaryMonth, dataMode],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${primaryMonth}&dataMode=${dataMode}`).then((r) => r.data).catch(() => []),
  });

  const { data: adminStores = [] } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => api.get('/stores/admin/all').then((r) => r.data).catch(() => []),
  });

  const { data: hqGoal } = useQuery({
    queryKey: ['hq-goal', year, primaryMonth],
    queryFn: () => api.get(`/hq/goal?year=${year}&month=${primaryMonth}`).then((r) => r.data).catch(() => null),
  });

  const channelMap: Record<string, string> = {};
  (adminStores as any[]).forEach((s: any) => { channelMap[s.id] = s.defaultChannel ?? 'ROAD'; });

  const toggleChannel = (ch: string) => {
    setActiveChannels((prev) => { const next = new Set(prev); if (next.has(ch)) next.delete(ch); else next.add(ch); return next; });
  };

  const metricsFiltered = (allStores as any[]).filter((s: any) => includedIds.has(s.storeId));
  const filteredList = metricsFiltered.filter((s: any) => activeChannels.has(channelMap[s.storeId] ?? 'ROAD'));

  const getDisplayAmount = (s: any) => {
    if (dataMode === 'SALES' && s.salesAmount != null) return Number(s.salesAmount);
    if (dataMode === 'ORDER' && s.orderAmount != null) return Number(s.orderAmount);
    return Number(s.contractAmount ?? 0);
  };

  const totalAmount = filteredList.reduce((sum: number, st: any) => sum + getDisplayAmount(st), 0);
  const totalContracts = filteredList.reduce((sum: number, st: any) => sum + Number(st.contractCount ?? 0), 0);
  const totalQuotes = filteredList.reduce((sum: number, st: any) => sum + Number(st.quoteCount ?? 0), 0);
  const sortedByAmount = [...filteredList].sort((a, b) => getDisplayAmount(b) - getDisplayAmount(a));

  const channelAmounts: Record<string, number> = {};
  filteredList.forEach((s: any) => {
    const ch = channelMap[s.storeId] ?? 'ROAD';
    channelAmounts[ch] = (channelAmounts[ch] ?? 0) + Number(s.contractAmount ?? 0);
  });

  const goalAmount = Number(hqGoal?.targetAmount ?? 0);
  const goalContracts = Number(hqGoal?.targetContracts ?? 0);
  const goalQuotes = Number(hqGoal?.targetQuotes ?? 0);
  const amountRate = goalAmount > 0 ? Math.min((totalAmount / goalAmount) * 100, 999) : 0;
  const contractRate = goalContracts > 0 ? Math.min((totalContracts / goalContracts) * 100, 999) : 0;
  const quoteRate = goalQuotes > 0 ? Math.min((totalQuotes / goalQuotes) * 100, 999) : 0;

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
        <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
          <DataModeSelector value={dataMode} onChange={setDataMode} />
          {metricsCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>실적 반영 {metricsCount}개 매장 기준</span>}
          {metricsCount === 0 && <span style={{ fontSize: 11, color: 'var(--warning)' }}>⚠ 실적 반영 매장 미설정 — 관리자 탭에서 설정하세요</span>}
        </div>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {[
          { label: 'REVENUE', title: '매출 달성률', value: `${(totalAmount / 10000).toFixed(0)}만원`, rate: amountRate, goal: goalAmount > 0 ? `목표 ${(goalAmount / 10000).toFixed(0)}만원` : '목표 미설정' },
          { label: 'ORDERS', title: '판매 달성률', value: `${totalContracts}건`, rate: contractRate, goal: goalContracts > 0 ? `목표 ${goalContracts}건` : '목표 미설정' },
          { label: 'VISITORS', title: '방문 달성률', value: `${totalQuotes}건`, rate: quoteRate, goal: goalQuotes > 0 ? `목표 ${goalQuotes}건` : '목표 미설정' },
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
              <span>{c.goal}</span><span>▽ 이달</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 목표 진척율 그래프 (기간 설정 무관) ── */}
      <GoalProgressChart chartYear={now.getFullYear()} includedIds={includedIds} channelMap={channelMap} />

      {/* 채널별 매출 비중 — 도넛 차트 */}
      <ChannelDonutChart
        channelAmounts={channelAmounts}
        activeChannels={activeChannels}
        toggleChannel={toggleChannel}
        channelMap={channelMap}
        metricsFiltered={metricsFiltered}
      />

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
