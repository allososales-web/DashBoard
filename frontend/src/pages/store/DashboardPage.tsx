import { useState, useMemo } from "react";
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
  available: { bg: "rgba(16,185,129,0.15)", color: "#6ee7b7", label: "가능" },
  unavailable: { bg: "rgba(239,68,68,0.15)", color: "#fca5a5", label: "불가" },
  partial: { bg: "rgba(245,158,11,0.15)", color: "#fcd34d", label: "일부" },
};

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
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
  const myShare = totalAmount > 0 ? ((myAmount / totalAmount) * 100).toFixed(1) : "0.0";
  const sortedByAmount = [...allStores].sort((a, b) => Number(b.contractAmount) - Number(a.contractAmount));
  const myRank = sortedByAmount.findIndex((s: any) => s.storeId === storeId) + 1;

  // 목표 달성률
  const amountRate = g && Number(g.targetAmount) > 0 ? Math.min((myAmount / Number(g.targetAmount)) * 100, 100) : 0;
  const contractRate = g && g.targetContracts > 0 ? Math.min(((m?.contractCount ?? 0) / g.targetContracts) * 100, 100) : 0;
  const consultRate = g && g.targetConsults > 0 ? Math.min(((m?.consultCount ?? 0) / g.targetConsults) * 100, 100) : 0;

  // 사업부 목표 달성률
  const hqAmountRate = hqGoal && hqGoal.targetAmount > 0 ? Math.min((totalAmount / hqGoal.targetAmount) * 100, 100) : 0;

  // 납기 3개월
  const delMonths = useMemo(() => {
    const result = [];
    for (let offset = -1; offset <= 1; offset++) {
      let y = year, mo = month + offset;
      if (mo < 1) { y--; mo += 12; }
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

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>대시보드</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90, fontSize: 13 }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 70, fontSize: 13 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => <option key={mo} value={mo}>{mo}월</option>)}
          </select>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: "7px 12px" }} onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
            {recalcMutation.isPending ? "계산 중..." : "KPI 재계산"}
          </button>
        </div>
      </div>

      {/* 핵심 KPI 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {/* 순위 카드 */}
        <div className="glass" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>전체 순위</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: myRank === 1 ? "#fcd34d" : myRank <= 3 ? "var(--accent)" : "#fff" }}>{myRank > 0 ? myRank : "-"}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>위</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{allStores.length}개 매장 중</div>
          {myRank === 1 && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 20 }}>🏆</div>}
        </div>

        {/* 진척율 카드 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>매출 진척율</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: amountRate >= 100 ? "var(--success)" : amountRate >= 70 ? "var(--accent)" : "#f87171" }}>{amountRate.toFixed(0)}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${amountRate}%`, background: amountRate >= 100 ? "var(--success)" : "var(--accent)", borderRadius: 2, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{amountRate >= 100 ? "✅ 달성" : amountRate >= 70 ? "🔥 순항 중" : "⚠️ 미달"}</div>
        </div>

        {/* 사업부 비중 카드 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>사업부 매출 비중</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)" }}>{myShare}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(Number(myShare), 100)}%`, background: "var(--accent)", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>전체 {Number(totalAmount).toLocaleString()}원</div>
        </div>

        {/* 이달 매출 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>이달 매출</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>{myAmount >= 10000 ? `${Math.round(myAmount/10000).toLocaleString()}만` : myAmount.toLocaleString()}원</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>계약 {m?.contractCount ?? 0}건</div>
        </div>

        {/* 전환율 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>견적→계약 전환율</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: Number(m?.conversionRate ?? 0) * 100 >= 50 ? "var(--success)" : "var(--accent)", marginBottom: 4 }}>
            {(Number(m?.conversionRate ?? 0) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>견적 {m?.quoteCount ?? 0}건</div>
        </div>
      </div>

      {/* 목표 달성 상세 */}
      {g && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>목표 달성 현황</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "매출 목표", rate: amountRate, current: `${myAmount.toLocaleString()}원`, target: `${Number(g.targetAmount).toLocaleString()}원` },
              { label: "계약 목표", rate: contractRate, current: `${m?.contractCount ?? 0}건`, target: `${g.targetContracts}건` },
              { label: "상담 목표", rate: consultRate, current: `${m?.consultCount ?? 0}건`, target: `${g.targetConsults}건` },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: item.rate >= 100 ? "var(--success)" : item.rate >= 70 ? "var(--accent)" : "#f87171" }}>
                    {item.rate.toFixed(1)}% {item.rate >= 100 ? "✅" : item.rate >= 70 ? "🔥" : "⚠️"}
                  </span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.rate}%`, background: item.rate >= 100 ? "var(--success)" : "var(--accent)", borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{item.current} / {item.target}</div>
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
              <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, borderLeft: `3px solid ${priorityColor(n.priority)}` }}>
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

      {/* 납기 일정 캘린더 (3개월, 읽기 전용) */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>납기 일정 캘린더</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>당월 기준 앞뒤 1개월 · 수정 불가</div>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {delMonths.map(({ year: y, month: mo }, qi) => {
            const deliveryMap = (delQueries[qi].data ?? {}) as Record<number, string>;
            const cells = buildCalendar(y, mo);
            const isCurrent = y === year && mo === month;
            return (
              <div key={`${y}-${mo}`} style={{ background: isCurrent ? "rgba(200,149,108,0.06)" : "rgba(255,255,255,0.02)", borderRadius: 10, padding: 12, border: isCurrent ? "1px solid rgba(200,149,108,0.3)" : "1px solid var(--glass-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>{y}년 {mo}월 {isCurrent && <span style={{ fontSize: 10, color: "var(--accent)" }}>당월</span>}</div>
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
                        <div style={{ fontSize: 9, fontWeight: 600, color: dow===0?"#f87171":dow===6?"#60a5fa":"#fff" }}>{day}</div>
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
