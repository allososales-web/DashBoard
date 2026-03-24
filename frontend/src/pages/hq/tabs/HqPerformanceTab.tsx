import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  { value: 'ROAD',       label: '로드',    color: '#a8c5a0' },
  { value: 'DEPARTMENT', label: '백화점',  color: '#b5a8d4' },
  { value: 'MALL',       label: '몰',      color: '#a8c4d4' },
  { value: 'STARFIELD',  label: '스타필드', color: '#d4c4a8' },
  { value: 'POPUP',      label: '팝업',    color: '#d4a8b5' },
  { value: 'OTHER',      label: '기타',    color: '#c4c4b8' },
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
  const SIZE = 240;
  const R = 88;
  const STROKE = 36;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * R;

  const activeTotal = CHANNEL_FILTERS
    .filter((ch) => activeChannels.has(ch.value))
    .reduce((sum, ch) => sum + (channelAmounts[ch.value] ?? 0), 0);

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

  const topArc = arcs.length > 0 ? arcs.reduce((a, b) => (a.pct > b.pct ? a : b)) : null;

  return (
    <div className="glass" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Channel Mix</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>채널별 매출 비중</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {CHANNEL_FILTERS.map((ch) => {
            const active = activeChannels.has(ch.value);
            return (
              <label key={ch.value} style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                padding: '5px 12px', borderRadius: 20,
                fontSize: 12, fontWeight: active ? 700 : 400,
                background: active ? ch.color : 'rgba(0,0,0,0.04)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: `1.5px solid ${active ? ch.color : 'var(--glass-border)'}`,
                userSelect: 'none', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: active ? `0 2px 12px ${ch.color}55, 0 0 0 1px ${ch.color}33` : 'none',
              }}>
                <input type="checkbox" checked={active} onChange={() => toggleChannel(ch.value)} style={{ display: 'none' }} />
                {active && <span style={{ fontSize: 10 }}>✓</span>}
                {ch.label}
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
        {/* SVG 도넛 — 글로우 효과 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', display: 'block', filter: 'drop-shadow(0 0 12px rgba(139,124,248,0.15))' }}>
            <defs>
              {CHANNEL_FILTERS.map((ch) => (
                <filter key={ch.value} id={`glow-${ch.value}`}>
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              ))}
            </defs>
            {/* 배경 링 */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={STROKE} />
            {/* 글로우 레이어 (블러) */}
            {arcs.map((a) => (
              <circle key={`glow-${a.ch.value}`} cx={cx} cy={cy} r={R} fill="none"
                stroke={a.ch.color} strokeWidth={STROKE + 8} opacity={0.25}
                strokeDasharray={`${a.dash} ${a.gap}`} strokeDashoffset={-a.offset}
                strokeLinecap="butt"
                style={{ filter: `blur(6px)` }}
              />
            ))}
            {/* 실제 아크 */}
            {arcs.map((a, i) => (
              <circle key={a.ch.value} cx={cx} cy={cy} r={R} fill="none"
                stroke={a.ch.color} strokeWidth={STROKE}
                strokeDasharray={`${a.dash} ${a.gap}`} strokeDashoffset={-a.offset}
                strokeLinecap="butt"
                style={{ transition: `stroke-dasharray 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s, stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s` }}
              />
            ))}
          </svg>
          {/* 중앙 텍스트 */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {topArc ? (
              <>
                <div style={{ fontSize: 32, fontWeight: 900, color: topArc.ch.color, lineHeight: 1, textShadow: `0 0 20px ${topArc.ch.color}88` }}>
                  {(topArc.pct * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>{topArc.ch.label}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>데이터 없음</div>
            )}
          </div>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 180 }}>
          {CHANNEL_FILTERS.filter((ch) => activeChannels.has(ch.value)).map((ch) => {
            const amt = channelAmounts[ch.value] ?? 0;
            const pct = activeTotal > 0 ? (amt / activeTotal) * 100 : 0;
            const storeCount = metricsFiltered.filter((s: any) => (channelMap[s.storeId] ?? 'ROAD') === ch.value).length;
            const barW = pct;
            return (
              <div key={ch.value}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ch.color, flexShrink: 0, boxShadow: `0 0 8px ${ch.color}88` }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ch.label}</span>
                    {storeCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{storeCount}개 매장</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: ch.color, textShadow: `0 0 12px ${ch.color}66` }}>{pct.toFixed(1)}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{amt > 0 ? `${(amt / 10000).toFixed(0)}만` : '—'}</div>
                  </div>
                </div>
                {/* 글로우 바 */}
                <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'visible', position: 'relative' }}>
                  <div style={{
                    height: '100%', width: `${barW}%`, borderRadius: 2,
                    background: `linear-gradient(90deg, ${ch.color}99, ${ch.color})`,
                    boxShadow: `0 0 8px ${ch.color}66`,
                    transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                </div>
              </div>
            );
          })}
          {arcs.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>채널을 선택하세요</div>}
        </div>
      </div>
    </div>
  );
}


// ── 링 게이지 단일 아이템 ────────────────────────────────────────────────────
interface GaugeItem { label: string; rate: number; actual: number; goal: number; color: string; }

function RingGauge({ item, size = 120, stroke = 14, delay = 0 }: { item: GaugeItem; size?: number; stroke?: number; delay?: number }) {
  const [progress, setProgress] = useState(0);
  const R = (size - stroke) / 2;
  const circumference = 2 * Math.PI * R;
  const cx = size / 2;
  const cy = size / 2;
  const capped = Math.min(Math.max(item.rate, 0), 100);
  const over = item.rate > 100;
  const noGoal = item.rate === -1;

  useEffect(() => {
    const t = setTimeout(() => setProgress(noGoal ? 60 : capped), 80 + delay);
    return () => clearTimeout(t);
  }, [capped, noGoal, delay]);

  const dashOffset = circumference - (progress / 100) * circumference;
  const ringColor = over ? 'var(--success)' : noGoal ? '#b0b8a8' : item.rate > 0 ? item.color : 'rgba(0,0,0,0.12)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          {/* 배경 링 */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
          {/* 진척 링 */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: `stroke-dashoffset 1.0s cubic-bezier(0.22,1,0.36,1) ${delay * 0.001}s` }}
          />
        </svg>
        {/* 중앙 텍스트 */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {noGoal ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>실적</div>
          ) : item.rate === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-light)' }}>—</div>
          ) : (
            <>
              <div style={{ fontSize: size >= 120 ? 22 : 16, fontWeight: 900, color: over ? 'var(--success)' : item.color, lineHeight: 1 }}>
                {item.rate.toFixed(0)}%
              </div>
              {over && <div style={{ fontSize: 14 }}>🔥</div>}
            </>
          )}
        </div>
      </div>
      {/* 레이블 */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {item.goal > 0
            ? `목표 ${(item.goal / 10000).toFixed(0)}만`
            : item.actual > 0
              ? `${(item.actual / 10000).toFixed(0)}만`
              : '목표 미설정'}
        </div>
      </div>
    </div>
  );
}

// ── 목표 진척율 링 게이지 차트 ───────────────────────────────────────────────
function GoalProgressChart({
  chartYear, includedIds, channelMap, dataMode,
}: { chartYear: number; includedIds: Set<string>; channelMap: Record<string, string>; dataMode: DataMode }) {
  const now = new Date();
  const [view, setView] = useState<ChartView>('annual');
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [view]);

  const { data: annualGoals = {} } = useQuery({
    queryKey: ['hq-annual-goals', chartYear],
    queryFn: () => api.get(`/hq/goals/annual?year=${chartYear}`).then((r) => r.data).catch(() => ({})),
  });

  const monthsNeeded: number[] = (() => {
    if (view === 'annual') return [1,2,3,4,5,6,7,8,9,10,11,12];
    if (view === 'quarterly') return [1,2,3,4,5,6,7,8,9,10,11,12];
    const m = now.getMonth() + 1;
    return [
      m - 2 <= 0 ? m - 2 + 12 : m - 2,
      m - 1 <= 0 ? m - 1 + 12 : m - 1,
      m,
    ];
  })();

  const metricsQueries = useQuery({
    queryKey: ['hq-chart-metrics', chartYear, view, dataMode],
    queryFn: async () => {
      const results: Record<number, number> = {};
      await Promise.all(monthsNeeded.map(async (m) => {
        const yr = (view === 'recent3' && m > (now.getMonth() + 1)) ? chartYear - 1 : chartYear;
        const data = await api.get(`/dashboard/all?year=${yr}&month=${m}&dataMode=${dataMode}`).then((r) => r.data).catch(() => []);
        const filtered = (data as any[]).filter((s: any) => includedIds.has(s.storeId));
        results[m] = filtered.reduce((sum: number, s: any) => {
          if (dataMode === 'SALES') return sum + Number(s.salesAmount ?? 0);
          return sum + Number(s.orderAmount ?? s.contractAmount ?? 0);
        }, 0);
      }));
      return results;
    },
    enabled: includedIds.size > 0,
  });

  const actualByMonth: Record<number, number> = metricsQueries.data ?? {};

  const getGoal = (m: number) => {
    const key = `${chartYear}-${String(m).padStart(2,'0')}`;
    return Number((annualGoals as any)[key]?.targetAmount ?? 0);
  };
  const getActual = (m: number) => actualByMonth[m] ?? 0;

  const gauges: GaugeItem[] = (() => {
    const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const GAUGE_COLORS = ['#8b7cf8','#a8c5a0','#b5a8d4','#a8c4d4','#d4c4a8','#d4a8b5','#c4c4b8','#7a8f8a','#6b8f71','#8a7f6e','#6e7a8a','#9a8fb5'];

    if (view === 'annual') {
      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const goal = getGoal(m);
        const actual = getActual(m);
        const isFuture = m > now.getMonth() + 1 && chartYear === now.getFullYear();
        const rate = isFuture ? 0 : goal > 0 ? (actual / goal) * 100 : actual > 0 ? -1 : 0;
        return { label: MONTH_LABELS[i], rate, actual, goal, color: GAUGE_COLORS[i] };
      });
    }

    if (view === 'quarterly') {
      return [
        { label: 'Q1', months: [1,2,3] }, { label: 'Q2', months: [4,5,6] },
        { label: 'Q3', months: [7,8,9] }, { label: 'Q4', months: [10,11,12] },
      ].map(({ label, months }, i) => {
        const goal = months.reduce((s, m) => s + getGoal(m), 0);
        const actual = months.reduce((s, m) => s + getActual(m), 0);
        const rate = goal > 0 ? (actual / goal) * 100 : actual > 0 ? -1 : 0;
        return { label, rate, actual, goal, color: GAUGE_COLORS[i * 3] };
      });
    }

    // recent3
    const m = now.getMonth() + 1;
    return [-2,-1,0].map((offset, i) => {
      const mo = m + offset <= 0 ? m + offset + 12 : m + offset;
      const goal = getGoal(mo);
      const actual = getActual(mo);
      const rate = goal > 0 ? (actual / goal) * 100 : actual > 0 ? -1 : 0;
      return { label: MONTH_LABELS[mo - 1], rate, actual, goal, color: GAUGE_COLORS[i + 2] };
    });
  })();

  const gaugeSize = view === 'annual' ? 90 : view === 'quarterly' ? 140 : 130;
  const gaugeStroke = view === 'annual' ? 10 : 16;

  return (
    <div className="glass" style={{ padding: 24 }}>
      {/* 헤더 */}
      <div className="goal-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Goal Progress</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>목표 {dataMode === 'SALES' ? '매출' : '수주'} 진척율</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>기간 설정과 무관 — {chartYear}년 기준 · {dataMode === 'SALES' ? '확정납기 기준' : '수주일자 기준'}</div>
        </div>
        <div className="goal-chart-btns" style={{ display: 'flex', gap: 4 }}>
          {([['annual','연도별'],['quarterly','분기별'],['recent3','직전 3개월']] as [ChartView, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setView(v as ChartView)} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)',
              background: view === v ? 'var(--accent)' : 'var(--surface)',
              color: view === v ? '#fff' : 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', fontWeight: view === v ? 600 : 400,
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* 게이지 영역 */}
      {metricsQueries.isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>불러오는 중...</div>
      ) : includedIds.size === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>⚠ 실적 반영 매장을 먼저 설정하세요</div>
      ) : (
        <div key={animKey} style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: view === 'annual' ? 16 : 24,
          justifyContent: view === 'annual' ? 'space-between' : 'center',
          alignItems: 'flex-start',
        }}>
          {gauges.map((g, i) => (
            <RingGauge key={g.label} item={g} size={gaugeSize} stroke={gaugeStroke} delay={i * 60} />
          ))}
        </div>
      )}

      {/* 달성 요약 */}
      {gauges.filter(g => g.rate >= 100).length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--success)', fontWeight: 600, textAlign: 'right' }}>
          {gauges.filter(g => g.rate >= 100).length}개 기간 목표 달성 🔥
        </div>
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
  const [syncMsg, setSyncMsg] = useState('');
  const { includedIds, count: metricsCount } = useMetricsStores();

  const primaryMonth = period === 'custom'
    ? (customEnd ? Number(customEnd.split('-')[1]) : now.getMonth() + 1)
    : getPrimaryMonth(period, now);

  const { data: allStores = [], isLoading } = useQuery({
    queryKey: ['hq-all-metrics', year, primaryMonth, dataMode],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${primaryMonth}&dataMode=${dataMode}`).then((r) => r.data).catch(() => []),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/app-config/sync-sales-sheet').then((r) => r.data),
    onSuccess: (data) => {
      setSyncMsg(`동기화 완료 — ${data.savedRows}건 저장, ${data.skippedRows}건 스킵`);
      setTimeout(() => setSyncMsg(''), 5000);
    },
    onError: (e: any) => {
      setSyncMsg(`오류: ${e?.response?.data?.message ?? e?.message ?? '동기화 실패'}`);
      setTimeout(() => setSyncMsg(''), 5000);
    },
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

  const metricsFiltered = includedIds.size === 0
    ? (allStores as any[]).filter((s: any) => (adminStores as any[]).some((a: any) => a.id === s.storeId && a.showOnLogin))
    : (allStores as any[]).filter((s: any) => includedIds.has(s.storeId));
  const filteredList = metricsFiltered.filter((s: any) => activeChannels.has(channelMap[s.storeId] ?? 'ROAD'));

  const getDisplayAmount = (s: any) => {
    if (dataMode === 'SALES' && s.salesAmount != null) return Number(s.salesAmount);
    if (dataMode === 'ORDER' && s.orderAmount != null) return Number(s.orderAmount);
    return Number(s.contractAmount ?? 0);
  };

  const getDisplayCount = (s: any) => {
    if (dataMode === 'SALES') return Number(s.salesCount ?? s.orderCount ?? s.contractCount ?? 0);
    return Number(s.orderCount ?? s.contractCount ?? 0);
  };

  const totalAmount = filteredList.reduce((sum: number, st: any) => sum + getDisplayAmount(st), 0);
  const totalContracts = filteredList.reduce((sum: number, st: any) => sum + getDisplayCount(st), 0);
  const sortedByAmount = [...filteredList].sort((a, b) => getDisplayAmount(b) - getDisplayAmount(a));

  const channelAmounts: Record<string, number> = {};
  filteredList.forEach((s: any) => {
    const ch = channelMap[s.storeId] ?? 'ROAD';
    channelAmounts[ch] = (channelAmounts[ch] ?? 0) + getDisplayAmount(s);
  });

  const goalAmount = Number(hqGoal?.targetAmount ?? 0);
  const goalContracts = Number(hqGoal?.targetContracts ?? 0);
  const amountRate = goalAmount > 0 ? Math.min((totalAmount / goalAmount) * 100, 999) : 0;
  const contractRate = goalContracts > 0 ? Math.min((totalContracts / goalContracts) * 100, 999) : 0;

  const { data: weeklyKpi = [] } = useQuery({
    queryKey: ['hq-weekly-kpi', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => api.get(`/dashboard/weekly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`).then((r) => r.data).catch(() => []),
  });

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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {syncMsg && <span style={{ fontSize: 11, color: syncMsg.startsWith('오류') ? '#ef4444' : '#059669' }}>{syncMsg}</span>}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap' }}
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              title="관리자 탭에서 설정한 매출 실적 URL(구글 시트)에서 데이터를 가져옵니다"
            >
              {syncMutation.isPending ? '동기화 중...' : '📊 매출 실적 동기화'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI 카드 — 글로우 링 게이지 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {[
          {
            label: 'REVENUE', title: `${dataMode === 'SALES' ? '매출' : '수주'} 달성률`,
            value: `${Math.round(totalAmount / 10000).toLocaleString()}만원`,
            rate: amountRate, goal: goalAmount > 0 ? `목표 ${Math.round(goalAmount / 10000).toLocaleString()}만원` : '목표 미설정',
            color: amountRate >= 100 ? 'var(--success)' : amountRate > 0 ? 'var(--accent)' : '#b0b8a8',
          },
          {
            label: 'ORDERS', title: `${dataMode === 'SALES' ? '매출' : '수주'} 판매 달성률`,
            value: `${totalContracts}건`,
            rate: contractRate, goal: goalContracts > 0 ? `목표 ${goalContracts}건` : '목표 미설정',
            color: contractRate >= 100 ? 'var(--success)' : contractRate > 0 ? '#b5a8d4' : '#b0b8a8',
          },
        ].map((c) => {
          const SIZE = 120; const STROKE = 13; const R = (SIZE - STROKE) / 2;
          const circ = 2 * Math.PI * R; const cx = SIZE / 2; const cy = SIZE / 2;
          const capped = Math.min(Math.max(c.rate, 0), 100);
          const dashOffset = circ - (capped / 100) * circ;
          // 끝점 도트 좌표
          const endAngle = -Math.PI / 2 + (capped / 100) * 2 * Math.PI;
          const dotX = cx + R * Math.cos(endAngle);
          const dotY = cy + R * Math.sin(endAngle);
          return (
            <div key={c.label} className="glass" style={{ padding: 24, display: 'flex', gap: 20, alignItems: 'center' }}>
              {/* 링 게이지 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', display: 'block', filter: `drop-shadow(0 0 10px ${c.color}44)` }}>
                  <defs>
                    <filter id={`kpi-glow-${c.label}`}>
                      <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {/* 배경 링 */}
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={STROKE} />
                  {/* 글로우 레이어 */}
                  {capped > 0 && (
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke={c.color} strokeWidth={STROKE + 6}
                      strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                      opacity={0.22} style={{ filter: 'blur(5px)' }} />
                  )}
                  {/* 진척 링 */}
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke={c.color} strokeWidth={STROKE}
                    strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.0s cubic-bezier(0.22,1,0.36,1)' }} />
                  {/* 끝점 도트 */}
                  {capped > 2 && (
                    <circle cx={dotX} cy={dotY} r={STROKE / 2 - 1} fill={c.color}
                      style={{ filter: `drop-shadow(0 0 4px ${c.color})` }} />
                  )}
                </svg>
                {/* 중앙 텍스트 */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: c.color, lineHeight: 1, textShadow: `0 0 16px ${c.color}66` }}>
                    {c.rate > 0 ? `${c.rate.toFixed(0)}%` : '—'}
                  </div>
                  {c.rate >= 100 && <div style={{ fontSize: 14, marginTop: 2 }}>🔥</div>}
                </div>
              </div>
              {/* 텍스트 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', lineHeight: 1, marginBottom: 10 }}>{c.value}</div>
                {/* 글로우 바 */}
                <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'visible', position: 'relative', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', width: `${Math.min(capped, 100)}%`, borderRadius: 2,
                    background: `linear-gradient(90deg, ${c.color}88, ${c.color})`,
                    boxShadow: `0 0 8px ${c.color}66`,
                    transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.goal}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 목표 진척율 그래프 (기간 설정 무관) ── */}
      <GoalProgressChart chartYear={now.getFullYear()} includedIds={includedIds} channelMap={channelMap} dataMode={dataMode} />

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
        {weeklyKpi.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>데이터 없음</div>
        ) : (() => {
          const maxAmt = Math.max(...(weeklyKpi as any[]).map((w: any) => Math.max(Number(w.orderAmount ?? 0), Number(w.salesAmount ?? 0))), 1);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(weeklyKpi as any[]).map((w: any, i: number) => {
                const orderAmt = Number(w.orderAmount ?? 0);
                const salesAmt = Number(w.salesAmount ?? 0);
                const displayAmt = dataMode === 'SALES' ? salesAmt : orderAmt;
                const barPct = maxAmt > 0 ? (displayAmt / maxAmt) * 100 : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {w.week}주차 ({now.getMonth() + 1}/{w.startDay}~{now.getMonth() + 1}/{w.endDay})
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        {displayAmt >= 10000
                          ? `${Math.round(displayAmt / 10000).toLocaleString()}만원`
                          : `${displayAmt.toLocaleString()}원`}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 10, color: 'var(--text-muted)' }}>
                      <span>수주 {orderAmt >= 10000 ? `${(orderAmt/10000).toFixed(0)}만` : orderAmt.toLocaleString()}원</span>
                      <span>매출 {salesAmt >= 10000 ? `${(salesAmt/10000).toFixed(0)}만` : salesAmt.toLocaleString()}원</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
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
                <th style={{ textAlign: 'right' }}>{dataMode === 'SALES' ? '매출건수' : '수주건수'}</th>
                <th style={{ textAlign: 'right' }}>수주금액</th>
                <th style={{ textAlign: 'right' }}>매출금액</th>
                <th style={{ textAlign: 'right' }}>비중</th>
              </tr>
            </thead>
            <tbody>
              {sortedByAmount.map((s: any) => {
                const orderAmt = Number(s.orderAmount ?? s.contractAmount ?? 0);
                const salesAmt = Number(s.salesAmount ?? 0);
                const displayAmt = getDisplayAmount(s);
                const displayCnt = getDisplayCount(s);
                const ratio = totalAmount > 0 ? ((displayAmt / totalAmount) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={s.storeId}>
                    <td style={{ fontWeight: 500 }}>{s.storeName}</td>
                    <td style={{ textAlign: 'right' }}>{displayCnt}건</td>
                    <td style={{ textAlign: 'right' }}>{orderAmt >= 10000 ? `${(orderAmt/10000).toFixed(0)}만` : orderAmt.toLocaleString()}원</td>
                    <td style={{ textAlign: 'right' }}>{salesAmt >= 10000 ? `${(salesAmt/10000).toFixed(0)}만` : salesAmt.toLocaleString()}원</td>
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
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
