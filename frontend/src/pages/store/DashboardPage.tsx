import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboard";
import api from "../../services/api";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getWeeksInMonth(year: number, month: number) {
  const weeks: { label: string; start: number; end: number }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekNum = 1;
  let start = 1;
  while (start <= daysInMonth) {
    let end = start;
    while (end < daysInMonth && new Date(year, month - 1, end + 1).getDay() !== 0) end++;
    weeks.push({ label: `${weekNum}주차`, start, end });
    weekNum++;
    start = end + 1;
  }
  return weeks;
}

const DELIVERY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  available: { bg: "rgba(16,185,129,0.2)", color: "#6ee7b7", label: "가능" },
  unavailable: { bg: "rgba(239,68,68,0.2)", color: "#fca5a5", label: "불가" },
  partial: { bg: "rgba(245,158,11,0.2)", color: "#fcd34d", label: "일부" },
};

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

  const { data: deliveryCalendar } = useQuery({
    queryKey: ["delivery-calendar", year, month],
    queryFn: () => api.get(`/hq/delivery-calendar?year=${year}&month=${month}`).then(r => r.data).catch(() => ({})),
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

  const weeks = getWeeksInMonth(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  const deliveryMap: Record<number, string> = deliveryCalendar ?? {};

  if (isLoading) return <div style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}>불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>대시보드</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => <option key={mo} value={mo}>{mo}월</option>)}
          </select>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: "8px 14px" }} onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
            {recalcMutation.isPending ? "계산 중..." : "KPI 재계산"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "사업부 비중", value: `${myShare}%`, sub: "전체 매출 중" },
          { label: "전체 순위", value: myRank > 0 ? `${myRank}위` : "-", sub: `${allStores.length || "-"}개 매장 중` },
          { label: "이달 매출", value: `${myAmount.toLocaleString()}원`, sub: "계약 기준" },
          { label: "계약 수", value: `${m?.contractCount ?? 0}건`, sub: "이달 누적" },
          { label: "전환율", value: `${(Number(m?.conversionRate ?? 0) * 100).toFixed(1)}%`, sub: "견적→계약" },
        ].map((card) => (
          <div key={card.label} className="glass" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{card.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>목표 달성률</div>
          {g ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "매출 목표", rate: g.achievementRate.amountRate, target: `${Number(g.targetAmount).toLocaleString()}원`, current: `${myAmount.toLocaleString()}원` },
                { label: "계약 목표", rate: g.achievementRate.contractRate, target: `${g.targetContracts}건`, current: `${m?.contractCount ?? 0}건` },
                { label: "상담 목표", rate: g.achievementRate.consultRate, target: `${g.targetConsults}건`, current: `${m?.consultCount ?? 0}건` },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.rate >= 100 ? "var(--success)" : "var(--accent)" }}>{item.rate.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(item.rate, 100)}%`, background: item.rate >= 100 ? "var(--success)" : "var(--accent)", borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{item.current} / {item.target}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>목표 미설정</div>
          )}
        </div>

        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>주차별 실적</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {weeks.map((w, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{w.label} ({month}/{w.start}~{month}/{w.end})</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "40%", background: "var(--accent)", borderRadius: 3, opacity: 0.8 }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>상세 분석은 매장 분석 탭에서 확인</div>
          </div>
        </div>
      </div>

      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>납기 일정 캘린더</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
            {Object.entries(DELIVERY_COLORS).map(([k, v]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: v.bg, border: `1px solid ${v.color}`, display: "inline-block" }} />
                <span style={{ color: "var(--text-muted)" }}>{v.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, padding: "4px 0", color: i === 0 ? "#f87171" : i === 6 ? "#60a5fa" : "var(--text-muted)" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dow = (firstDayOfWeek + day - 1) % 7;
            const isSun = dow === 0;
            const isSat = dow === 6;
            const status = deliveryMap[day] ?? (isSun ? "unavailable" : "available");
            const dStyle = DELIVERY_COLORS[status] ?? DELIVERY_COLORS.available;
            return (
              <div key={day} style={{ borderRadius: 8, padding: "6px 2px", textAlign: "center", background: dStyle.bg, border: `1px solid ${dStyle.color}30` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isSun ? "#f87171" : isSat ? "#60a5fa" : "#fff" }}>{day}</div>
                <div style={{ fontSize: 9, color: dStyle.color, marginTop: 2 }}>{dStyle.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
