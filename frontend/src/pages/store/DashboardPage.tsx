import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboard";
import api from "../../services/api";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n: number) { return String(n).padStart(2, "0"); }

function getDefaultDeliveryStatus(year: number, month: number, day: number): string {
  const dow = new Date(year, month - 1, day).getDay();
  const KR_HOLIDAYS = ["01-01","03-01","05-05","06-06","08-15","10-03","10-09","12-25"];
  const key = `${pad2(month)}-${pad2(day)}`;
  if (dow === 0 || KR_HOLIDAYS.includes(key)) return "unavailable";
  return "available";
}

const DELIVERY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  available: { bg: "rgba(16,185,129,0.12)", color: "#059669", label: "가능" },
  unavailable: { bg: "rgba(239,68,68,0.10)", color: "#dc2626", label: "불가" },
  partial: { bg: "rgba(245,158,11,0.12)", color: "#d97706", label: "일부" },
};

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const LOCAL_NEWS = [
  { title: '강남구 가구 인테리어 트렌드 2026 — 미니멀 & 내추럴 소재 급부상', date: '2026-03-10', summary: '강남 지역 인테리어 시장에서 천연 소재 소파와 미니멀 디자인 수요가 전년 대비 32% 증가.', url: 'https://search.naver.com/search.naver?query=가구+인테리어+트렌드+2026' },
  { title: '분당·판교 신규 아파트 입주 물량 증가로 가구 수요 확대 전망', date: '2026-02-28', summary: '2026년 상반기 판교·분당 신규 입주 단지 1만 2천 세대 예정. 소파·거실 가구 수요 동반 상승 기대.', url: 'https://search.naver.com/search.naver?query=판교+분당+아파트+입주+가구' },
  { title: '소파 시장 프리미엄화 가속 — 200만원 이상 제품 비중 40% 돌파', date: '2026-02-15', summary: '국내 소파 시장에서 200만원 이상 프리미엄 제품 비중이 처음으로 40%를 넘어섰다.', url: 'https://search.naver.com/search.naver?query=소파+프리미엄+시장+트렌드' },
  { title: '가구업계 온라인 전환 가속 — 오프라인 쇼룸 체험 중요성 재부각', date: '2026-01-20', summary: '온라인 가구 구매 증가에도 불구하고 소파 등 대형 가구는 직접 체험 후 구매 비율 78%로 오프라인 쇼룸 경쟁력 유지.', url: 'https://search.naver.com/search.naver?query=가구+쇼룸+오프라인+온라인' },
];

// ── 카운트업 훅 ──────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

// ── SVG 원형 게이지 ──────────────────────────────────────────
function ArcGauge({ pct, size = 80, stroke = 8, color = "var(--accent)", label, sublabel }: {
  pct: number; size?: number; stroke?: number; color?: string; label: string; sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ marginTop: -size * 0.55, textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 900, color, lineHeight: 1 }}>{label}</div>
        {sublabel && <div style={{ fontSize: size * 0.14, color: "var(--text-muted)", marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

// ── 반원 스피드미터 ──────────────────────────────────────────
function Speedometer({ pct, size = 90, color = "var(--accent)" }: { pct: number; size?: number; color?: string }) {
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const halfCirc = Math.PI * r;
  const dash = (pct / 100) * halfCirc;
  // needle angle: -180deg(0%) to 0deg(100%)
  const angle = -180 + (pct / 100) * 180;
  const needleLen = r * 0.7;
  const rad = (angle * Math.PI) / 180;
  const nx = cx + needleLen * Math.cos(rad);
  const ny = cy + needleLen * Math.sin(rad);
  return (
    <svg width={size} height={size / 2 + stroke} viewBox={`0 0 ${size} ${size / 2 + stroke}`}>
      {/* track */}
      <path d={`M ${stroke/2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke/2} ${cy}`}
        fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} strokeLinecap="round" />
      {/* fill */}
      <path d={`M ${stroke/2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke/2} ${cy}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${halfCirc}`}
        style={{ transition: "stroke-dasharray 1s ease" }} />
      {/* needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2} strokeLinecap="round"
        style={{ transition: "all 1s ease" }} />
      <circle cx={cx} cy={cy} r={4} fill={color} />
    </svg>
  );
}

// ── 미니 도넛 ────────────────────────────────────────────────
function MiniDonut({ pct, size = 56, color = "var(--accent)" }: { pct: number; size?: number; color?: string }) {
  const stroke = size * 0.18;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

// ── 랭킹 배지 ────────────────────────────────────────────────
function RankBadge({ rank, total }: { rank: number; total: number }) {
  const isTop = rank === 1;
  const isPodium = rank <= 3;
  const badgeColor = isTop ? "#d97706" : isPodium ? "var(--accent)" : "var(--text-muted)";
  const bgColor = isTop ? "rgba(217,119,6,0.12)" : isPodium ? "rgba(124,106,247,0.12)" : "rgba(0,0,0,0.06)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: bgColor, border: `3px solid ${badgeColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: isPodium ? `0 0 16px ${badgeColor}40` : "none",
        transition: "all 0.5s",
      }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: badgeColor, lineHeight: 1 }}>
          {rank > 0 ? rank : "-"}
        </span>
      </div>
      {isTop && <span style={{ fontSize: 18 }}>🏆</span>}
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{total}개 매장 중</span>
    </div>
  );
}

export default function DashboardPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["metrics", storeId, year, month],
    queryFn: () => dashboardApi.getMetricsByMonth(storeId!, year, month),
    enabled: !!storeId,
  });

  const { data: allMetrics } = useQuery({
    queryKey: ["all-metrics", year, month],
    queryFn: () => api.get(`/dashboard/all?year=${year}&month=${month}`).then(r => r.data).catch(() => []),
  });

  const { data: notices = [] } = useQuery({
    queryKey: ["hq-notices"],
    queryFn: () => api.get("/hq/notices").then(r => r.data).catch(() => []),
  });

  const { data: hqGoal } = useQuery({
    queryKey: ["hq-goal", year, month],
    queryFn: () => api.get(`/hq/goal?year=${year}&month=${month}`).then(r => r.data).catch(() => null),
  });

  const recalcMutation = useMutation({
    mutationFn: () => dashboardApi.recalculate(storeId!, year, month),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metrics", storeId, year, month] }),
  });

  const m = data?.metrics;
  const g = data?.goal;

  const allStores: any[] = allMetrics ?? [];
  const totalAmount = allStores.reduce((sum: number, s: any) => sum + Number(s.contractAmount ?? 0), 0);
  const myAmount = Number(m?.contractAmount ?? 0);
  const myShare = totalAmount > 0 ? ((myAmount / totalAmount) * 100) : 0;
  const sortedByAmount = [...allStores].sort((a, b) => Number(b.contractAmount) - Number(a.contractAmount));
  const myRank = sortedByAmount.findIndex((s: any) => s.storeId === storeId) + 1;

  const amountRate = g && Number(g.targetAmount) > 0 ? Math.min((myAmount / Number(g.targetAmount)) * 100, 100) : 0;
  const contractRate = g && g.targetContracts > 0 ? Math.min(((m?.contractCount ?? 0) / g.targetContracts) * 100, 100) : 0;
  const consultRate = g && g.targetConsults > 0 ? Math.min(((m?.consultCount ?? 0) / g.targetConsults) * 100, 100) : 0;
  const hqAmountRate = hqGoal && hqGoal.targetAmount > 0 ? Math.min((totalAmount / hqGoal.targetAmount) * 100, 100) : 0;
  const conversionPct = Number(m?.conversionRate ?? 0) * 100;

  const countedAmount = useCountUp(myAmount, 1400);

  const delMonths = useMemo(() => {
    const result = [];
    for (let offset = 0; offset <= 2; offset++) {
      let y = year, mo = month + offset;
      if (mo > 12) { y++; mo -= 12; }
      result.push({ year: y, month: mo });
    }
    return result;
  }, [year, month]);

  const delQueries = delMonths.map(({ year: y, month: mo }) =>
    useQuery({
      queryKey: ["delivery-calendar", y, mo],
      queryFn: () => api.get(`/hq/delivery-calendar?year=${y}&month=${mo}`).then(r => r.data).catch(() => ({})),
    })
  );

  const priorityColor = (p: string) => p === "URGENT" ? "#ef4444" : p === "IMPORTANT" ? "#f59e0b" : "#6b7280";
  const priorityLabel = (p: string) => p === "URGENT" ? "긴급" : p === "IMPORTANT" ? "중요" : "일반";

  if (isLoading) return <div style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}>불러오는 중...</div>;

  const amountColor = amountRate >= 100 ? "var(--success)" : amountRate >= 70 ? "var(--accent)" : "#f87171";
  const convColor = conversionPct >= 50 ? "var(--success)" : "var(--accent)";

  return (
    <div>
      {/* 헤더 */}
      <div className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>매장 대시보드</div>
        <div className="dashboard-header-controls" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {/* 연도 네비게이터 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.80)", border: "1.5px solid var(--border)", borderRadius: 99, padding: "5px 12px" }}>
            <button onClick={() => setYear(y => y - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", minWidth: 44, textAlign: "center", whiteSpace: "nowrap" }}>{year}년</span>
            <button onClick={() => setYear(y => y + 1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>›</button>
          </div>
          {/* 월 네비게이터 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.80)", border: "1.5px solid var(--border)", borderRadius: 99, padding: "5px 12px" }}>
            <button onClick={() => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", minWidth: 28, textAlign: "center", whiteSpace: "nowrap" }}>{month}월</span>
            <button onClick={() => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>›</button>
          </div>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: "7px 14px", whiteSpace: "nowrap" }} onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
            {recalcMutation.isPending ? "계산 중..." : "KPI 재계산"}
          </button>
        </div>
      </div>

      {/* 핵심 KPI 카드 */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>

        {/* 전체 순위 — 랭킹 배지 */}
        <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, alignSelf: "flex-start" }}>전체 순위</div>
          <RankBadge rank={myRank} total={allStores.length} />
        </div>

        {/* 매출 진척율 — 원형 게이지 */}
        <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, alignSelf: "flex-start" }}>매출 진척율</div>
          <ArcGauge pct={amountRate} size={84} stroke={9} color={amountColor}
            label={`${amountRate.toFixed(0)}%`}
            sublabel={amountRate >= 100 ? "달성 ✅" : amountRate >= 70 ? "순항 🔥" : "미달 ⚠️"} />
        </div>

        {/* 사업부 매출 비중 — 미니 도넛 */}
        <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, alignSelf: "flex-start" }}>사업부 매출 비중</div>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <MiniDonut pct={Math.min(myShare, 100)} size={84} color="var(--accent)" />
            <div style={{ position: "absolute", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{myShare.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>전체 {(totalAmount / 10000).toFixed(0)}만원</div>
        </div>

        {/* 이달 매출 — 카운트업 */}
        <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "flex-start" }}>이달 매출</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>
            {countedAmount >= 10000
              ? `${Math.round(countedAmount / 10000).toLocaleString()}만`
              : countedAmount.toLocaleString()}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)", marginLeft: 2 }}>원</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>계약 {m?.contractCount ?? 0}건</div>
        </div>

        {/* 견적→계약 전환율 — 스피드미터 */}
        <div className="glass" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, alignSelf: "flex-start" }}>견적→계약 전환율</div>
          <Speedometer pct={conversionPct} size={88} color={convColor} />
          <div style={{ fontSize: 20, fontWeight: 900, color: convColor, marginTop: -4 }}>{conversionPct.toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>견적 {m?.quoteCount ?? 0}건</div>
        </div>
      </div>

      {/* 목표 달성 현황 — 3개 원형 게이지 */}
      {g && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>목표 달성 현황</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, textAlign: "center" }} className="goal-grid">
            {[
              { label: "매출 목표", rate: amountRate, current: `${myAmount >= 10000 ? Math.round(myAmount/10000).toLocaleString()+"만" : myAmount.toLocaleString()}원`, target: `${Number(g.targetAmount) >= 10000 ? Math.round(Number(g.targetAmount)/10000).toLocaleString()+"만" : Number(g.targetAmount).toLocaleString()}원`, color: amountColor },
              { label: "계약 목표", rate: contractRate, current: `${m?.contractCount ?? 0}건`, target: `${g.targetContracts}건`, color: contractRate >= 100 ? "var(--success)" : contractRate >= 70 ? "var(--accent)" : "#f87171" },
              { label: "상담 목표", rate: consultRate, current: `${m?.consultCount ?? 0}건`, target: `${g.targetConsults}건`, color: consultRate >= 100 ? "var(--success)" : consultRate >= 70 ? "var(--accent)" : "#f87171" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ArcGauge pct={item.rate} size={96} stroke={10} color={item.color}
                  label={`${item.rate.toFixed(0)}%`}
                  sublabel={item.rate >= 100 ? "✅" : item.rate >= 70 ? "🔥" : "⚠️"} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.current} / {item.target}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사업부 목표 */}
      {hqGoal && (
        <div className="glass" style={{ padding: 20, marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>사업부 월간 목표</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{year}년 {month}월</div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>사업부 매출 목표</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>{Number(hqGoal.targetAmount).toLocaleString()}원</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>달성률</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: hqAmountRate >= 100 ? "var(--success)" : "var(--accent)" }}>{hqAmountRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* 전체 공지 알림 */}
      {(notices as any[]).length > 0 && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📢 전체 공지</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(notices as any[]).slice(0, 3).map((n: any) => (
              <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(124,106,247,0.04)", borderRadius: 8, borderLeft: `3px solid ${priorityColor(n.priority)}` }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor(n.priority), background: `${priorityColor(n.priority)}20`, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap", marginTop: 1 }}>{priorityLabel(n.priority)}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{n.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 매장 주변 상권 & 가구 트렌드 뉴스 */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>매장 주변 상권 & 가구 트렌드 뉴스</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>매장 주변 반경 10km 기준 · 최근 6개월</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LOCAL_NEWS.map((news, i) => (
            <a key={i} href={news.url} target="_blank" rel="noopener noreferrer"
              style={{ background: 'rgba(124,106,247,0.04)', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid var(--accent)', display: 'block', textDecoration: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,106,247,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,106,247,0.04)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'keep-all', overflowWrap: 'break-word', lineHeight: 1.5, flex: 1 }}>{news.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 12, flexShrink: 0 }}>{news.date}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{news.summary}</div>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>기사 보기 →</div>
            </a>
          ))}
        </div>
      </div>

      {/* 납기 일정 캘린더 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>납기 일정 캘린더</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>당월 기준 익월·익익월 · 수정 불가</div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            {Object.entries(DELIVERY_COLORS).map(([k, v]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: v.bg, border: `1px solid ${v.color}`, display: "inline-block" }} />
                <span style={{ color: "var(--text-muted)" }}>{v.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="delivery-calendar-grid">
          {delMonths.map(({ year: y, month: mo }, qi) => {
            const deliveryMap = (delQueries[qi].data ?? {}) as Record<number, string>;
            const cells = buildCalendar(y, mo);
            const isCurrent = y === year && mo === month;
            return (
              <div key={`${y}-${mo}`} style={{ background: isCurrent ? "rgba(200,149,108,0.06)" : "rgba(0,0,0,0.02)", borderRadius: 10, padding: 12, border: isCurrent ? "1px solid rgba(200,149,108,0.3)" : "1px solid var(--glass-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>{y}년 {mo}월 {isCurrent && <span style={{ fontSize: 10, color: "var(--accent)" }}>당월</span>}{!isCurrent && qi === 1 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>익월</span>}{!isCurrent && qi === 2 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>익익월</span>}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
                  {WEEKDAYS.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 9, color: i===0?"#f87171":i===6?"#60a5fa":"var(--text-muted)", padding: "2px 0" }}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
                  {cells.map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const dow = new Date(y, mo-1, day).getDay();
                    const status = deliveryMap[day] ?? getDefaultDeliveryStatus(y, mo, day);
                    const dStyle = DELIVERY_COLORS[status] ?? DELIVERY_COLORS.available;
                    return (
                      <div key={idx} style={{ borderRadius: 4, padding: "4px 1px", textAlign: "center", background: dStyle.bg, border: `1px solid ${dStyle.color}20`, userSelect: "none" }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: dow===0?"#ef4444":dow===6?"#3b82f6":"var(--text)" }}>{day}</div>
                        <div style={{ fontSize: 8, color: dStyle.color }}>{dStyle.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
