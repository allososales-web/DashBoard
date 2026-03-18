import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../services/api";

type NoticePriority = "NORMAL" | "IMPORTANT" | "URGENT";

interface HqEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface HqNotice {
  id: string;
  title: string;
  content: string;
  priority: NoticePriority;
  isPublished: boolean;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function getKrHolidays(year: number): Set<string> {
  return new Set([
    `${year}-01-01`, `${year}-03-01`, `${year}-05-05`,
    `${year}-06-06`, `${year}-08-15`, `${year}-10-03`,
    `${year}-10-09`, `${year}-12-25`,
  ]);
}

function getDayStatus(dateStr: string, holidays: Set<string>): string {
  const d = new Date(dateStr);
  const dow = d.getDay();
  if (holidays.has(dateStr)) return "holiday";
  if (dow === 0 || dow === 6) return "weekend";
  return "normal";
}

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

export default function HqGoalEventTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const holidays = getKrHolidays(calYear);

  const { data: events = [] } = useQuery<HqEvent[]>({
    queryKey: ["hq-events"],
    queryFn: () => api.get("/hq/events").then((r) => r.data),
  });

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", description: "", startDate: "", endDate: "" });

  const createEvent = useMutation({
    mutationFn: (dto: typeof eventForm) => api.post("/hq/events", dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hq-events"] });
      setShowEventForm(false);
      setEventForm({ title: "", description: "", startDate: "", endDate: "" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) => api.delete(`/hq/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hq-events"] }),
  });

  const { data: notices = [] } = useQuery<HqNotice[]>({
    queryKey: ["hq-notices"],
    queryFn: () => api.get("/hq/notices").then((r) => r.data),
  });

  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeForm, setNoticeForm] = useState<{ title: string; content: string; priority: NoticePriority }>({
    title: "", content: "", priority: "NORMAL",
  });

  const createNotice = useMutation({
    mutationFn: (dto: typeof noticeForm) =>
      api.post("/hq/notices", { ...dto, isPublished: true }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hq-notices"] });
      setShowNoticeForm(false);
      setNoticeForm({ title: "", content: "", priority: "NORMAL" });
    },
  });

  const deleteNotice = useMutation({
    mutationFn: (id: string) => api.delete(`/hq/notices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hq-notices"] }),
  });

  const cells = buildCalendar(calYear, calMonth);

  const eventDates = new Set<string>();
  events.forEach((ev) => {
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      eventDates.add(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
    }
  });

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  };

  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const priorityLabel = (p: NoticePriority) => p === "URGENT" ? "긴급" : p === "IMPORTANT" ? "중요" : "일반";
  const priorityColor = (p: NoticePriority) => p === "URGENT" ? "#ef4444" : p === "IMPORTANT" ? "#f59e0b" : "#6b7280";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>월별 목표 관리</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          각 매장의 월별 목표(매출액·계약건수·상담건수)는 <strong>매장별 현황</strong> 탭에서 매장을 선택한 후 설정할 수 있습니다.
        </p>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>행사 캘린더</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-secondary" onClick={prevMonth}>‹</button>
            <span style={{ fontWeight: 600, minWidth: 90, textAlign: "center" }}>{calYear}년 {calMonth}월</span>
            <button className="btn-secondary" onClick={nextMonth}>›</button>
            <button className="btn-primary" onClick={() => setShowEventForm(true)}>+ 행사 추가</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 16 }}>
          {DOW.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#6b7280", padding: "4px 0" }}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${calYear}-${pad2(calMonth)}-${pad2(day)}`;
            const status = getDayStatus(dateStr, holidays);
            const hasEvent = eventDates.has(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <div key={i} style={{
                padding: "6px 4px", textAlign: "center", borderRadius: 6, fontSize: 13,
                background: isToday ? "#eff6ff" : hasEvent ? "#fef3c7" : "transparent",
                color: status === "holiday" ? "#ef4444" : status === "weekend" ? "#6b7280" : "#111827",
                border: isToday ? "1px solid #3b82f6" : "1px solid transparent",
              }}>
                {day}
                {hasEvent && <span style={{ display: "block", width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", margin: "2px auto 0" }} />}
              </div>
            );
          })}
        </div>

        {showEventForm && (
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>새 행사 등록</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#6b7280" }}>행사명</label>
                <input className="input" value={eventForm.title}
                  onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} placeholder="행사명 입력" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>시작일</label>
                <input className="input" type="date" value={eventForm.startDate}
                  onChange={(e) => setEventForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>종료일</label>
                <input className="input" type="date" value={eventForm.endDate}
                  onChange={(e) => setEventForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#6b7280" }}>설명 (선택)</label>
                <input className="input" value={eventForm.description}
                  onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} placeholder="행사 설명" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-primary" onClick={() => createEvent.mutate(eventForm)} disabled={!eventForm.title || !eventForm.startDate}>등록</button>
              <button className="btn-secondary" onClick={() => setShowEventForm(false)}>취소</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.length === 0 && <p style={{ color: "#9ca3af", fontSize: 14 }}>등록된 행사가 없습니다.</p>}
          {events.map((ev) => (
            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f9fafb", borderRadius: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: "#6b7280" }}>{ev.startDate?.slice(0, 10)} ~ {ev.endDate?.slice(0, 10)}</span>
                {ev.description && <span style={{ marginLeft: 8, fontSize: 12, color: "#9ca3af" }}>{ev.description}</span>}
              </div>
              <button className="btn-danger-sm" onClick={() => deleteEvent.mutate(ev.id)}>삭제</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>공지사항</h2>
          <button className="btn-primary" onClick={() => setShowNoticeForm(true)}>+ 공지 작성</button>
        </div>

        {showNoticeForm && (
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>새 공지 작성</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>제목</label>
                <input className="input" value={noticeForm.title}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))} placeholder="공지 제목" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>내용</label>
                <textarea className="input" rows={3} value={noticeForm.content}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="공지 내용" style={{ resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280" }}>중요도</label>
                <select className="input" value={noticeForm.priority}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, priority: e.target.value as NoticePriority }))}>
                  <option value="NORMAL">일반</option>
                  <option value="IMPORTANT">중요</option>
                  <option value="URGENT">긴급</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-primary" onClick={() => createNotice.mutate(noticeForm)} disabled={!noticeForm.title || !noticeForm.content}>등록</button>
              <button className="btn-secondary" onClick={() => setShowNoticeForm(false)}>취소</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notices.length === 0 && <p style={{ color: "#9ca3af", fontSize: 14 }}>등록된 공지가 없습니다.</p>}
          {notices.map((n) => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: priorityColor(n.priority), background: `${priorityColor(n.priority)}18`, padding: "2px 8px", borderRadius: 99 }}>
                    {priorityLabel(n.priority)}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                </div>
                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{n.content}</p>
              </div>
              <button className="btn-danger-sm" onClick={() => deleteNotice.mutate(n.id)} style={{ flexShrink: 0, marginLeft: 12 }}>삭제</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
