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

// ── 채널별 매출 비중 — 동심원 버블 차트 (라이트 뉴모피즘) ──────────────────
function ChannelDonutChart({
  channelAmounts, activeChannels, toggleChannel, channelMap, metricsFiltered,
}: {
  channelAmounts: Record<string, number>;
  activeChannels: Set<string>;
  toggleChannel: (ch: string) => void;
  channelMap: Record<string, string>;
  metricsFiltered: any[];
}) {
  const activeTotal = CHANNEL_FILTERS
    .filter((ch) => activeChannels.has(ch.value))
    .reduce((sum, ch) => sum + (channelAmounts[ch.value] ?? 0), 0);

  const activeData = CHANNEL_FILTERS
    .filter((ch) => activeChannels.has(ch.value))
    .map((ch) => ({
      ch,
      amt: channelAmounts[ch.value] ?? 0,
      pct: activeTotal > 0 ? (channelAmounts[ch.value] ?? 0) / activeTotal : 0,
    }))
    .sort((a, b) => b.amt - a.amt);

  const maxAmt = Math.max(...activeData.map((d) => d.amt), 1);

  // 동심원 버블 차트 — 이미지 2 스타일 (라이트 뉴모피즘)
  const BUBBLE_COLORS = [
    { bg: 'rgba(139,124,248,0.18)', border: 'rgba(139,124,248,0.45)', text: '#6c5ce7' },
    { bg: 'rgba(168,196,212,0.22)', border: 'rgba(100,160,200,0.45)', text: '#4a90b8' },
    { bg: 'rgba(168,197,160,0.22)', border: 'rgba(100,170,120,0.45)', text: '#3a8a5a' },
    { bg: 'rgba(212,196,168,0.22)', border: 'rgba(180,150,100,0.45)', text: '#8a6a30' },
    { bg: 'rgba(212,168,181,0.22)', border: 'rgba(190,120,140,0.45)', text: '#a04060' },
    { bg: 'rgba(196,196,184,0.22)', border: 'rgba(150,150,130,0.45)', text: '#606050' },
  ];

  return (
    <div className="glass" style={{ padding: 24 }}>
      {/* 헤더 */}
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
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 400,
                background: active ? ch.color : 'rgba(0,0,0,0.04)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: `1.5px solid ${active ? ch.color : 'var(--glass-border)'}`,
                userSelect: 'none', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: active ? `0 2px 12px ${ch.color}55` : 'none',
              }}>
                <input type="checkbox" checked={active} onChange={() => toggleChannel(ch.value)} style={{ display: 'none' }} />
                {active && <span style={{ fontSize: 10 }}>✓</span>}
                {ch.label}
              </label>
            );
          })}
        </div>
      </div>

      {/* 동심원 버블 차트 영역 */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* 버블 차트 */}
        <div style={{
          position: 'relative', flexShrink: 0,
          width: 280, height: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
        }}>
          {activeData.slice(0, 6).map((d, i) => {
            const radius = 40 + (d.amt / maxAmt) * 100;
            const bColor = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
            const leftOffset = i * 28;
            return (
              <div key={d.ch.value} style={{
                position: 'absolute',
                bottom: 0,
                left: leftOffset,
                width: radius * 2,
                height: radius * 2,
                borderRadius: '50%',
                background: `radial-gradient(circle at 38% 35%, ${bColor.bg.replace('0.18', '0.32')}, ${bColor.bg})`,
                border: `1.5px solid ${bColor.border}`,
                boxShadow: `4px 4px 14px rgba(160,168,155,0.35), -2px -2px 8px rgba(255,255,255,0.80), inset 0 0 20px ${bColor.bg}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)',
                zIndex: 6 - i,
              }}>
                <div style={{ fontSize: Math.max(10, radius * 0.18), fontWeight: 800, color: bColor.text, lineHeight: 1 }}>
                  {(d.pct * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: Math.max(9, radius * 0.13), color: bColor.text, opacity: 0.8, marginTop: 2, fontWeight: 600 }}>
                  {d.ch.label}
                </div>
                {radius > 60 && (
                  <div style={{ fontSize: 9, color: bColor.text, opacity: 0.65, marginTop: 1 }}>
                    {d.amt > 0 ? `${(d.amt / 10000).toFixed(0)}만` : '—'}
                  </div>
                )}
              </div>
            );
          })}
          {activeData.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>채널을 선택하세요</div>
          )}
        </div>

        {/* 범례 + 바 목록 */}
        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeData.map((d, i) => {
            const pct = d.pct * 100;
            const bColor = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
            const storeCount = metricsFiltered.filter((s: any) => (channelMap[s.storeId] ?? 'ROAD') === d.ch.value).length;
            return (
              <div key={d.ch.value}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: d.ch.color,
                    boxShadow: `0 0 6px ${d.ch.color}88`,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{d.ch.label}</span>
                  {storeCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{storeCount}개</span>}
                  <span style={{ fontSize: 14, fontWeight: 800, color: bColor.text, minWidth: 44, textAlign: 'right' }}>
                    {pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 48, textAlign: 'right' }}>
                    {d.amt > 0 ? `${(d.amt / 10000).toFixed(0)}만` : '—'}
                  </span>
                </div>
                {/* 뉴모피즘 바 */}
                <div style={{
                  height: 6, borderRadius: 3,
                  background: 'var(--bg)',
                  boxShadow: 'inset 2px 2px 4px rgba(150,158,145,0.40), inset -1px -1px 3px rgba(255,255,255,0.75)',
                  overflow: 'visible', position: 'relative',
                }}>
                  <div style={{
                    height: '100%', width: `${(d.amt / maxAmt) * 100}%`, borderRadius: 3,
                    background: `linear-gradient(90deg, ${d.ch.color}88, ${d.ch.color})`,
                    boxShadow: `0 0 8px ${d.ch.color}55`,
                    transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)',
                      width: 8, height: 8, borderRadius: '50%',
                      background: d.ch.color, boxShadow: `0 0 6px ${d.ch.color}`,
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
          {activeData.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>채널을 선택하세요</div>}
        </div>
      </div>
    </div>
  );
}


// ── 뉴모피즘 글로우 Arc 게이지 ──────────────────────────────────────────────
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

  // 끝점 도트 좌표
  const endAngle = -Math.PI / 2 + (progress / 100) * 2 * Math.PI;
  const dotX = cx + R * Math.cos(endAngle);
  const dotY = cy + R * Math.sin(endAngle);

  // 뉴모피즘 배경 그라디언트 (어두운 오목 효과)
  const neuBg = `radial-gradient(circle at 35% 35%, #d8dbd4, #c8cbc4)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        position: 'relative', width: size, height: size,
        borderRadius: '50%',
        background: neuBg,
        boxShadow: `${size * 0.06}px ${size * 0.06}px ${size * 0.18}px rgba(150,158,145,0.65), -${size * 0.04}px -${size * 0.04}px ${size * 0.12}px rgba(255,255,255,0.90)`,
      }}>
        {/* 내부 오목 링 */}
        <div style={{
          position: 'absolute',
          inset: stroke * 0.6,
          borderRadius: '50%',
          background: `radial-gradient(circle at 40% 40%, #cdd0c8, #bfc2bb)`,
          boxShadow: `inset 3px 3px 8px rgba(140,148,135,0.55), inset -2px -2px 6px rgba(255,255,255,0.75)`,
        }} />

        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          {/* 트랙 */}
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke="rgba(0,0,0,0.10)" strokeWidth={stroke} />
          {/* 글로우 레이어 */}
          {progress > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke={ringColor} strokeWidth={stroke + 6}
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" opacity={0.25}
              style={{ filter: 'blur(5px)', transition: `stroke-dashoffset 1.0s cubic-bezier(0.22,1,0.36,1) ${delay * 0.001}s` }} />
          )}
          {/* 메인 arc */}
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke={ringColor} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: `stroke-dashoffset 1.0s cubic-bezier(0.22,1,0.36,1) ${delay * 0.001}s` }} />
          {/* 끝점 글로우 도트 */}
          {progress > 3 && (
            <circle cx={dotX} cy={dotY} r={stroke / 2 - 0.5} fill={ringColor}
              style={{ filter: `drop-shadow(0 0 ${stroke * 0.4}px ${ringColor})`, transition: `all 1.0s cubic-bezier(0.22,1,0.36,1) ${delay * 0.001}s` }} />
          )}
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
              <div style={{ fontSize: size >= 120 ? 20 : 14, fontWeight: 900, color: over ? 'var(--success)' : item.color, lineHeight: 1, textShadow: `0 0 12px ${ringColor}66` }}>
                {item.rate.toFixed(0)}%
              </div>
              {over && <div style={{ fontSize: 12, marginTop: 2 }}>🔥</div>}
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

// ── 목표 진척율 — 파동형 에리어 + 바 차트 (이미지 1 스타일, 라이트 뉴모피즘) ──
function GoalProgressChart({
  chartYear, includedIds, channelMap, dataMode,
}: { chartYear: number; includedIds: Set<string>; channelMap: Record<string, string>; dataMode: DataMode }) {
  const now = new Date();
  const [view, setView] = useState<ChartView>('annual');
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => { setAnimKey((k) => k + 1); }, [view]);

  const { data: annualGoals = {} } = useQuery({
    queryKey: ['hq-annual-goals', chartYear],
    queryFn: () => api.get(`/hq/goals/annual?year=${chartYear}`).then((r) => r.data).catch(() => ({})),
  });

  const monthsNeeded: number[] = (() => {
    if (view === 'annual') return [1,2,3,4,5,6,7,8,9,10,11,12];
    if (view === 'quarterly') return [1,2,3,4,5,6,7,8,9,10,11,12];
    const m = now.getMonth() + 1;
    return [m-2<=0?m-2+12:m-2, m-1<=0?m-1+12:m-1, m];
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
  const getGoal = (m: number) => Number((annualGoals as any)[`${chartYear}-${String(m).padStart(2,'0')}`]?.targetAmount ?? 0);
  const getActual = (m: number) => actualByMonth[m] ?? 0;

  const gauges: GaugeItem[] = (() => {
    const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const GAUGE_COLORS = ['#8b7cf8','#a8c5a0','#b5a8d4','#a8c4d4','#d4c4a8','#d4a8b5','#c4c4b8','#7a8f8a','#6b8f71','#8a7f6e','#6e7a8a','#9a8fb5'];
    if (view === 'annual') {
      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const goal = getGoal(m); const actual = getActual(m);
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
    const m = now.getMonth() + 1;
    return [-2,-1,0].map((offset, i) => {
      const mo = m + offset <= 0 ? m + offset + 12 : m + offset;
      const goal = getGoal(mo); const actual = getActual(mo);
      const rate = goal > 0 ? (actual / goal) * 100 : actual > 0 ? -1 : 0;
      return { label: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'][mo-1], rate, actual, goal, color: ['#8b7cf8','#a8c5a0','#b5a8d4','#a8c4d4','#d4c4a8','#d4a8b5'][i+2] };
    });
  })();

  // 파동형 에리어 차트 SVG 생성 (라이트 배경)
  const W = 600; const H = 140;
  const maxActual = Math.max(...gauges.map(g => g.actual), 1);
  const maxGoal = Math.max(...gauges.map(g => g.goal), 1);
  const maxVal = Math.max(maxActual, maxGoal, 1);

  function makeAreaPath(values: number[], W: number, H: number, padding = 20): string {
    if (values.length === 0) return '';
    const step = (W - padding * 2) / Math.max(values.length - 1, 1);
    const pts = values.map((v, i) => {
      const x = padding + i * step;
      const y = H - padding - (v / maxVal) * (H - padding * 2);
      return [x, Math.max(padding, y)] as [number, number];
    });
    // 스무딩 (cubic bezier)
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = pts[i-1][0] + step * 0.4;
      const cp1y = pts[i-1][1];
      const cp2x = pts[i][0] - step * 0.4;
      const cp2y = pts[i][1];
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    }
    return d;
  }

  const actualLinePath = makeAreaPath(gauges.map(g => g.actual), W, H);
  const goalLinePath = makeAreaPath(gauges.map(g => g.goal), W, H);

  // 에리어 패스 (라인 + 닫기)
  function makeFilledPath(linePath: string, W: number, H: number, padding = 20): string {
    if (!linePath) return '';
    return `${linePath} L ${W - padding} ${H - padding} L ${padding} ${H - padding} Z`;
  }

  const step = (W - 40) / Math.max(gauges.length - 1, 1);

  return (
    <div className="glass" style={{ padding: 24 }}>
      {/* 헤더 */}
      <div className="goal-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Goal Progress</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>목표 {dataMode === 'SALES' ? '매출' : '수주'} 진척율</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>기간 설정과 무관 — {chartYear}년 기준</div>
        </div>
        <div className="goal-chart-btns" style={{ display: 'flex', gap: 4 }}>
          {([['annual','연도별'],['quarterly','분기별'],['recent3','직전 3개월']] as [ChartView, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setView(v as ChartView)} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)',
              background: view === v ? 'var(--accent)' : 'var(--surface)',
              color: view === v ? '#fff' : 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', fontWeight: view === v ? 600 : 400, transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {metricsQueries.isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>불러오는 중...</div>
      ) : includedIds.size === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>⚠ 실적 반영 매장을 먼저 설정하세요</div>
      ) : (
        <div key={animKey}>
          {/* ── 파동형 에리어 차트 (라이트 뉴모피즘) ── */}
          <div style={{
            borderRadius: 16, overflow: 'hidden', marginBottom: 20,
            background: 'linear-gradient(160deg, #eef0eb 0%, #e8ebe4 60%, #eef0eb 100%)',
            boxShadow: 'inset 3px 3px 8px rgba(150,158,145,0.35), inset -2px -2px 6px rgba(255,255,255,0.80)',
            position: 'relative',
          }}>
            {/* 미세 파티클 (라이트 톤) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {[...Array(14)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
                  borderRadius: '50%',
                  background: `rgba(139,124,248,${0.12 + (i % 4) * 0.06})`,
                  left: `${(i * 7 + 3) % 100}%`,
                  top: `${(i * 9 + 8) % 80}%`,
                  boxShadow: `0 0 ${3 + (i % 3) * 2}px rgba(139,124,248,0.3)`,
                }} />
              ))}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ display: 'block', minHeight: 100 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="goal-area-actual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b7cf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8b7cf8" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="goal-area-goal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a8c5a0" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#a8c5a0" stopOpacity={0.03} />
                </linearGradient>
                <filter id="line-glow-actual">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="line-glow-goal">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* 수평 그리드 라인 */}
              {[0.25, 0.5, 0.75].map((y) => (
                <line key={y} x1={20} y1={20 + y * (H - 40)} x2={W - 20} y2={20 + y * (H - 40)}
                  stroke="rgba(139,124,248,0.08)" strokeWidth={1} strokeDasharray="4 4" />
              ))}

              {/* 목표 에리어 (연한 민트) */}
              {goalLinePath && (
                <>
                  <path d={makeFilledPath(goalLinePath, W, H)} fill="url(#goal-area-goal)" />
                  <path d={goalLinePath} fill="none" stroke="#a8c5a0" strokeWidth={1.5}
                    opacity={0.7} filter="url(#line-glow-goal)" strokeDasharray="5 3" />
                </>
              )}

              {/* 실적 에리어 (퍼플) */}
              {actualLinePath && (
                <>
                  <path d={makeFilledPath(actualLinePath, W, H)} fill="url(#goal-area-actual)" />
                  {/* 글로우 레이어 */}
                  <path d={actualLinePath} fill="none" stroke="#8b7cf8" strokeWidth={4}
                    opacity={0.18} filter="url(#line-glow-actual)" />
                  {/* 메인 라인 */}
                  <path d={actualLinePath} fill="none" stroke="#8b7cf8" strokeWidth={2}
                    opacity={0.9} filter="url(#line-glow-actual)" />
                </>
              )}

              {/* 데이터 포인트 + 바 */}
              {gauges.map((g, i) => {
                const x = 20 + i * step;
                const barH = maxVal > 0 ? ((g.actual / maxVal) * (H - 40)) : 0;
                const barY = H - 20 - barH;
                const dotY = maxVal > 0 ? (20 + (1 - g.actual / maxVal) * (H - 40)) : H - 20;
                const capped = Math.min(Math.max(g.rate, 0), 100);
                const barColor = g.rate >= 100 ? '#5ec4a0' : g.rate >= 70 ? '#8b7cf8' : '#f87171';
                return (
                  <g key={g.label}>
                    {/* 바 */}
                    <rect x={x - 6} y={barY} width={12} height={barH}
                      fill={barColor} opacity={0.22} rx={3} />
                    {/* 데이터 포인트 */}
                    {g.actual > 0 && (
                      <>
                        <circle cx={x} cy={dotY} r={4} fill="#8b7cf8"
                          style={{ filter: 'drop-shadow(0 0 4px rgba(139,124,248,0.7))' }} />
                        <circle cx={x} cy={dotY} r={2} fill="#fff" />
                      </>
                    )}
                  </g>
                );
              })}

              {/* X축 레이블 */}
              {gauges.map((g, i) => {
                const x = 20 + i * step;
                return (
                  <text key={g.label} x={x} y={H - 4} textAnchor="middle"
                    fontSize={view === 'annual' ? 8 : 10} fill="rgba(90,100,88,0.7)" fontWeight={600}>
                    {g.label}
                  </text>
                );
              })}
            </svg>

            {/* 범례 */}
            <div style={{ position: 'absolute', top: 10, right: 14, display: 'flex', gap: 12, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 16, height: 2, background: '#8b7cf8', display: 'inline-block', borderRadius: 1 }} />
                <span style={{ color: 'var(--text-muted)' }}>실적</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 16, height: 2, background: '#a8c5a0', display: 'inline-block', borderRadius: 1, borderTop: '1px dashed #a8c5a0' }} />
                <span style={{ color: 'var(--text-muted)' }}>목표</span>
              </span>
            </div>
          </div>

          {/* ── 뉴모피즘 게이지 그리드 ── */}
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: view === 'annual' ? 12 : 20,
            justifyContent: view === 'annual' ? 'space-between' : 'center',
            alignItems: 'flex-start',
          }}>
            {gauges.map((g, i) => (
              <RingGauge key={g.label} item={g}
                size={view === 'annual' ? 90 : view === 'quarterly' ? 140 : 130}
                stroke={view === 'annual' ? 10 : 16}
                delay={i * 60} />
            ))}
          </div>
        </div>
      )}

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
          <div className="table-wrap">
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
          </div>
        )}
      </div>
    </div>
  );
}