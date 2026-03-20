import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../services/api";
import MiniDatePicker from "../../../components/MiniDatePicker";

type NoticePriority = "NORMAL" | "IMPORTANT" | "URGENT";
type DeliveryStatus = "available" | "unavailable" | "partial";

interface HqEvent { id: string; title: string; description?: string; startDate: string; endDate: string; isActive: boolean; }
interface HqNotice { id: string; title: string; content: string; priority: NoticePriority; isPublished: boolean; createdAt: string; }

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const KR_HOLIDAYS: Record<string, string> = {
  "01-01": "신정", "03-01": "삼일절", "05-05": "어린이날",
  "06-06": "현충일", "08-15": "광복절", "10-03": "개천절",
  "10-09": "한글날", "12-25": "크리스마스",
};

function pad2(n: number) { return String(n).padStart(2, "0"); }

function isHoliday(year: number, month: number, day: number): boolean {
  const key = `${pad2(month)}-${pad2(day)}`;
  return key in KR_HOLIDAYS;
}

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getDefaultStatus(year: number, month: number, day: number): DeliveryStatus {
  const dow = new Date(year, month - 1, day).getDay();
  if (dow === 0 || isHoliday(year, month, day)) return "unavailable";
  return "available";
}

const DELIVERY_COLORS: Record<DeliveryStatus, { bg: string; border: string; label: string; text: string }> = {
  available: { bg: "rgba(16,185,129,0.12)", border: "#10b981", label: "가능", text: "#059669" },
  unavailable: { bg: "rgba(239,68,68,0.10)", border: "#ef4444", label: "불가", text: "#dc2626" },
  partial: { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", label: "일부", text: "#d97706" },
};

// 숫자 문자열 → 콤마 포맷 표시값 변환
function formatNumberInput(raw: string): string {
  const num = raw.replace(/,/g, '');
  if (!num || isNaN(Number(num))) return raw;
  return Number(num).toLocaleString();
}
// 콤마 제거 후 순수 숫자 문자열 반환
function parseNumberInput(formatted: string): string {
  return formatted.replace(/,/g, '');
}

export default function HqGoalEventTab() {
  const qc = useQueryClient();
  const now = new Date();

  // ── 전사 이슈 캘린더 상태 ──
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", description: "", startDate: "", endDate: "" });
  const [showHistory, setShowHistory] = useState(false);

  // ── 납기 캘린더 상태 ──
  const [delYear, setDelYear] = useState(now.getFullYear());
  const [delMonth, setDelMonth] = useState(now.getMonth() + 1);
  const [delStatuses, setDelStatuses] = useState<Record<string, Record<number, DeliveryStatus>>>({});
  const [delSyncing, setDelSyncing] = useState(false);

  // ── 사업부 목표 상태 ──
  const [goalYear, setGoalYear] = useState(now.getFullYear());
  const [goalInputs, setGoalInputs] = useState<Record<string, { targetAmount: string; targetContracts: string; targetQuotes: string }>>({});
  const [goalSaving, setGoalSaving] = useState(false);

  // ── 데이터 쿼리 ──
  const { data: events = [] } = useQuery<HqEvent[]>({
    queryKey: ["hq-events"],
    queryFn: () => api.get("/hq/events").then(r => r.data),
  });

  const { data: notices = [] } = useQuery<HqNotice[]>({
    queryKey: ["hq-notices"],
    queryFn: () => api.get("/hq/notices").then(r => r.data),
  });

  const delKey = `${delYear}-${pad2(delMonth)}`;
  const { data: savedDelCal } = useQuery({
    queryKey: ["delivery-calendar-hq", delYear, delMonth],
    queryFn: () => api.get(`/hq/delivery-calendar?year=${delYear}&month=${delMonth}`).then(r => r.data).catch(() => ({})),
  });

  const { data: annualGoals, refetch: refetchGoals } = useQuery({
    queryKey: ["hq-annual-goals", goalYear],
    queryFn: () => api.get(`/hq/goals/annual?year=${goalYear}`).then(r => r.data).catch(() => ({})),
  });

  // annualGoals 로드 시 goalInputs 초기화
  useEffect(() => {
    if (!annualGoals) return;
    const inputs: typeof goalInputs = {};
    for (let m = 1; m <= 12; m++) {
      const k = `${goalYear}-${pad2(m)}`;
      const d = (annualGoals as any)[k];
      inputs[k] = {
        targetAmount: d?.targetAmount ? String(d.targetAmount) : "",
        targetContracts: d?.targetContracts ? String(d.targetContracts) : "",
        targetQuotes: d?.targetQuotes ? String(d.targetQuotes) : "",
      };
    }
    setGoalInputs(inputs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annualGoals]);

  // 납기 캘린더 현재 상태 (저장값 우선, 없으면 기본값)
  const currentDelStatuses = useMemo(() => {
    const saved = (savedDelCal ?? {}) as Record<number, string>;
    const result: Record<number, DeliveryStatus> = {};
    const daysInMonth = new Date(delYear, delMonth, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      result[d] = (delStatuses[delKey]?.[d] ?? saved[d] ?? getDefaultStatus(delYear, delMonth, d)) as DeliveryStatus;
    }
    return result;
  }, [delYear, delMonth, delStatuses, savedDelCal, delKey]);

  // ── 이벤트 뮤테이션 ──
  const createEvent = useMutation({
    mutationFn: (dto: typeof eventForm) => api.post("/hq/events", dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hq-events"] });
      setShowEventForm(false);
      setEventForm({ title: "", description: "", startDate: "", endDate: "" });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "등록 실패";
      alert(`이슈 등록 실패: ${msg}`);
    },
  });
  const deleteEvent = useMutation({
    mutationFn: (id: string) => api.delete(`/hq/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hq-events"] }),
  });

  // 캘린더 날짜별 이벤트 매핑 (UTC 파싱 방지: slice(0,10)으로 날짜 문자열만 사용)
  const eventDates = useMemo(() => {
    const map: Record<string, HqEvent[]> = {};
    events.forEach(ev => {
      const startStr = ev.startDate?.slice(0, 10);
      const endStr = ev.endDate?.slice(0, 10);
      if (!startStr) return;
      const [sy, sm, sd] = startStr.split("-").map(Number);
      const [ey, em, ed] = (endStr ?? startStr).split("-").map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
        if (!map[k]) map[k] = [];
        map[k].push(ev);
      }
    });
    return map;
  }, [events]);

  const cells = buildCalendar(calYear, calMonth);
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;
  const selectedEvents = selectedDay ? (eventDates[selectedDay] ?? []) : [];

  // 납기 캘린더 3개월 (당월 앞뒤 1개월)
  const delMonths = useMemo(() => {
    const result = [];
    for (let offset = -1; offset <= 1; offset++) {
      let y = delYear, m = delMonth + offset;
      if (m < 1) { y--; m += 12; }
      if (m > 12) { y++; m -= 12; }
      result.push({ year: y, month: m });
    }
    return result;
  }, [delYear, delMonth]);

  function toggleDelStatus(day: number) {
    const cur = currentDelStatuses[day];
    const next: DeliveryStatus = cur === "available" ? "unavailable" : cur === "unavailable" ? "partial" : "available";
    setDelStatuses(prev => ({
      ...prev,
      [delKey]: { ...(prev[delKey] ?? {}), [day]: next },
    }));
  }

  async function syncDeliveryCalendar() {
    setDelSyncing(true);
    try {
      for (const { year, month } of delMonths) {
        const k = `${year}-${pad2(month)}`;
        const daysInMonth = new Date(year, month, 0).getDate();
        const statuses: Record<number, string> = {};
        for (let d = 1; d <= daysInMonth; d++) {
          statuses[d] = (delStatuses[k]?.[d] ?? getDefaultStatus(year, month, d));
        }
        await api.post("/hq/delivery-calendar", { year, month, dayStatuses: statuses });
      }
      qc.invalidateQueries({ queryKey: ["delivery-calendar"] });
      alert("납기 캘린더가 전 매장에 동기화되었습니다.");
    } finally {
      setDelSyncing(false);
    }
  }

  async function saveAndSyncGoals() {
    setGoalSaving(true);
    try {
      const goals: Record<string, any> = {};
      for (let m = 1; m <= 12; m++) {
        const k = `${goalYear}-${pad2(m)}`;
        const inp = goalInputs[k];
        if (inp?.targetAmount || inp?.targetContracts || inp?.targetQuotes) {
          goals[k] = {
            targetAmount: Number(parseNumberInput(inp.targetAmount) || '0'),
            targetContracts: Number(parseNumberInput(inp.targetContracts) || '0'),
            targetQuotes: Number(parseNumberInput(inp.targetQuotes) || '0'),
          };
        }
      }
      await api.post("/hq/goals/annual", { year: goalYear, goals });
      await refetchGoals();
      alert("사업부 목표가 저장 및 전 매장에 동기화되었습니다.");
    } finally {
      setGoalSaving(false);
    }
  }

  const priorityLabel = (p: NoticePriority) => p === "URGENT" ? "긴급" : p === "IMPORTANT" ? "중요" : "일반";
  const priorityColor = (p: NoticePriority) => p === "URGENT" ? "#ef4444" : p === "IMPORTANT" ? "#f59e0b" : "#9ca3af";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── 전사 이슈 캘린더 + 이력 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>전사 이슈 캘린더</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => { if (calMonth === 1) { setCalYear(y => y-1); setCalMonth(12); } else setCalMonth(m => m-1); }}>‹</button>
              <span style={{ fontWeight: 600, fontSize: 13, minWidth: 80, textAlign: "center" }}>{calYear}년 {calMonth}월</span>
              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => { if (calMonth === 12) { setCalYear(y => y+1); setCalMonth(1); } else setCalMonth(m => m+1); }}>›</button>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "7px 14px", borderRadius: 10 }} onClick={() => setShowEventForm(true)}>+ 이슈 추가</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DOW.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, padding: "4px 0", color: i===0?"#ef4444":i===6?"#3b82f6":"var(--text-muted)" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${calYear}-${pad2(calMonth)}-${pad2(day)}`;
              const evs = eventDates[dateStr] ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = selectedDay === dateStr;
              const dow = new Date(calYear, calMonth-1, day).getDay();
              return (
                <div key={i} onClick={() => setSelectedDay(isSelected ? null : dateStr)} style={{
                  padding: "6px 2px", textAlign: "center", borderRadius: 8, cursor: "pointer",
                  background: isSelected ? "rgba(124,106,247,0.15)" : evs.length > 0 ? "rgba(245,158,11,0.10)" : "transparent",
                  border: isSelected ? "1.5px solid var(--accent)" : isToday ? "1.5px solid rgba(124,106,247,0.4)" : "1.5px solid transparent",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dow===0?"#ef4444":dow===6?"#3b82f6":"var(--text)" }}>{day}</div>
                  {evs.length > 0 && <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}>
                    {evs.slice(0,3).map((_, ei) => <span key={ei} style={{ width: 4, height: 4, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />)}
                  </div>}
                </div>
              );
            })}
          </div>
          {showEventForm && (
            <div style={{ marginTop: 16, background: "rgba(124,106,247,0.05)", borderRadius: 12, padding: 20, border: "1.5px solid rgba(124,106,247,0.18)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--accent)" }}>새 이슈 등록</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>이슈명 *</div>
                  <input className="input" value={eventForm.title} onChange={e => setEventForm(f => ({...f, title: e.target.value}))} placeholder="이슈 제목을 입력하세요" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>시작일 *</div>
                  <MiniDatePicker value={eventForm.startDate} onChange={v => setEventForm(f => ({...f, startDate: v}))} placeholder="시작일 선택" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>종료일 <span style={{ fontWeight: 400 }}>(미입력 시 시작일과 동일)</span></div>
                  <MiniDatePicker value={eventForm.endDate} onChange={v => setEventForm(f => ({...f, endDate: v}))} placeholder="종료일 선택 (선택)" />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>설명 <span style={{ fontWeight: 400 }}>(선택)</span></div>
                  <input className="input" value={eventForm.description} onChange={e => setEventForm(f => ({...f, description: e.target.value}))} placeholder="이슈에 대한 설명을 입력하세요" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => createEvent.mutate({ ...eventForm, endDate: eventForm.endDate || eventForm.startDate })}
                  disabled={!eventForm.title || !eventForm.startDate || createEvent.isPending}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: 13, opacity: createEvent.isPending ? 0.6 : 1 }}
                >
                  {createEvent.isPending ? "등록 중..." : "✓ 등록"}
                </button>
                <button
                  onClick={() => { setShowEventForm(false); setEventForm({ title: "", description: "", startDate: "", endDate: "" }); }}
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: 13 }}
                >
                  ✕ 취소
                </button>
              </div>
            </div>
          )}
          {selectedDay && selectedEvents.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(245,158,11,0.08)", borderRadius: 8, borderLeft: "3px solid #f59e0b" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>{selectedDay} 이슈</div>
              {selectedEvents.map(ev => (
                <div key={ev.id} style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>• {ev.title} {ev.description && `— ${ev.description}`}</div>
              ))}
            </div>
          )}
        </div>

        {/* 이력 패널 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>이슈 이력</div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setShowHistory(h => !h)}>
              {showHistory ? "접기" : "전체보기"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: showHistory ? "none" : 400, overflowY: "auto" }}>
            {events.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>이력 없음</div>}
            {events.map(ev => (
              <div key={ev.id} style={{ background: "rgba(124,106,247,0.05)", borderRadius: 8, padding: "10px 12px", borderLeft: "3px solid #f59e0b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: "var(--text)" }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ev.startDate?.slice(0,10)} ~ {ev.endDate?.slice(0,10)}</div>
                    {ev.description && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{ev.description}</div>}
                  </div>
                  <button onClick={() => deleteEvent.mutate(ev.id)} style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", flexShrink: 0 }}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 납기 일정 관리 (3개월) ── */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>납기 일정 관리</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>당월 기준 앞뒤 1개월 · 클릭으로 상태 변경 · 일요일/공휴일 기본 불가</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              {(Object.entries(DELIVERY_COLORS) as [DeliveryStatus, typeof DELIVERY_COLORS[DeliveryStatus]][]).map(([k, v]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: v.bg, border: `1px solid ${v.border}`, display: "inline-block" }} />
                  <span style={{ color: "var(--text-muted)" }}>{v.label}</span>
                </span>
              ))}
            </div>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={syncDeliveryCalendar} disabled={delSyncing}>
              {delSyncing ? "동기화 중..." : "전 매장 동기화"}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>기준 월:</span>
          <select value={delYear} onChange={e => setDelYear(Number(e.target.value))} style={{ fontSize: 12, padding: "4px 8px" }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={delMonth} onChange={e => setDelMonth(Number(e.target.value))} style={{ fontSize: 12, padding: "4px 8px" }}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {delMonths.map(({ year, month }) => {
            const k = `${year}-${pad2(month)}`;
            const cells2 = buildCalendar(year, month);
            const daysInMonth = new Date(year, month, 0).getDate();
            const statuses: Record<number, DeliveryStatus> = {};
            for (let d = 1; d <= daysInMonth; d++) {
              statuses[d] = (delStatuses[k]?.[d] ?? (savedDelCal && k === delKey ? (savedDelCal as any)[d] : undefined) ?? getDefaultStatus(year, month, d)) as DeliveryStatus;
            }
            const isCurrent = year === delYear && month === delMonth;
            return (
              <div key={k} style={{ background: isCurrent ? "rgba(124,106,247,0.06)" : "rgba(0,0,0,0.02)", borderRadius: 10, padding: 14, border: isCurrent ? "1.5px solid rgba(124,106,247,0.25)" : "1.5px solid rgba(0,0,0,0.07)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: "center", color: "var(--text)" }}>{year}년 {month}월 {isCurrent && <span style={{ fontSize: 10, color: "var(--accent)", marginLeft: 4 }}>당월</span>}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
                  {DOW.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 9, color: i===0?"#ef4444":i===6?"#3b82f6":"var(--text-muted)", padding: "2px 0" }}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
                  {cells2.map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const st = statuses[day];
                    const dStyle = DELIVERY_COLORS[st];
                    const dow = new Date(year, month-1, day).getDay();
                    return (
                      <div key={idx} onClick={() => {
                        const cur = statuses[day];
                        const next: DeliveryStatus = cur === "available" ? "unavailable" : cur === "unavailable" ? "partial" : "available";
                        setDelStatuses(prev => ({ ...prev, [k]: { ...(prev[k] ?? {}), [day]: next } }));
                      }} style={{
                        borderRadius: 4, padding: "4px 1px", textAlign: "center", cursor: "pointer",
                        background: dStyle.bg, border: `1px solid ${dStyle.border}30`,
                        transition: "all 0.1s",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: dow===0?"#ef4444":dow===6?"#3b82f6":"var(--text)" }}>{day}</div>
                        <div style={{ fontSize: 8, color: dStyle.text }}>{dStyle.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 사업부 월간 목표 설정 ── */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>사업부 월간 목표 설정</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>연간 목표를 한번에 입력하고 전 매장에 동기화</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={goalYear} onChange={e => { setGoalYear(Number(e.target.value)); setGoalInputs({}); }} style={{ fontSize: 12, padding: "4px 8px" }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={saveAndSyncGoals} disabled={goalSaving}>
              {goalSaving ? "저장 중..." : "저장 및 전 매장 동기화"}
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>월</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>매출 목표 (원)</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>계약 목표 (건)</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>견적 목표 (건)</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>저장값</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((label, idx) => {
                const m = idx + 1;
                const k = `${goalYear}-${pad2(m)}`;
                const inp = goalInputs[k] ?? { targetAmount: "", targetContracts: "", targetQuotes: "" };
                const saved = (annualGoals as any)?.[k];
                return (
                  <tr key={k} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: m === now.getMonth()+1 && goalYear === now.getFullYear() ? "var(--accent)" : "var(--text)" }}>{label}</td>
                    <td style={{ padding: "6px 12px" }}>
                      <input value={formatNumberInput(inp.targetAmount)} onChange={e => setGoalInputs(prev => ({ ...prev, [k]: { ...inp, targetAmount: parseNumberInput(e.target.value) } }))}
                        placeholder="0" style={{ width: "100%", textAlign: "right", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input value={formatNumberInput(inp.targetContracts)} onChange={e => setGoalInputs(prev => ({ ...prev, [k]: { ...inp, targetContracts: parseNumberInput(e.target.value) } }))}
                        placeholder="0" style={{ width: "100%", textAlign: "right", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input value={formatNumberInput(inp.targetQuotes)} onChange={e => setGoalInputs(prev => ({ ...prev, [k]: { ...inp, targetQuotes: parseNumberInput(e.target.value) } }))}
                        placeholder="0" style={{ width: "100%", textAlign: "right", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
                      {saved ? `${Number(saved.targetAmount).toLocaleString()}원 / ${saved.targetContracts}건` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 공지사항 ── */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>공지사항</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notices.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>등록된 공지 없음</div>}
          {notices.map(n => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor(n.priority), background: `${priorityColor(n.priority)}20`, padding: "2px 8px", borderRadius: 99 }}>{priorityLabel(n.priority)}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{n.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
