import { useState } from 'react';

// 한국 공휴일 (2026년 기준 샘플)
const KR_HOLIDAYS_2026 = ['2026-01-01','2026-01-28','2026-01-29','2026-01-30','2026-03-01','2026-05-05','2026-05-25','2026-06-06','2026-08-15','2026-09-24','2026-09-25','2026-09-26','2026-10-03','2026-10-09','2026-12-25'];

type DeliveryStatus = 'available' | 'unavailable' | 'partial';
const STATUS_LABEL: Record<DeliveryStatus, string> = { available: '납기 가능', unavailable: '납기 불가', partial: '일부 가능' };
const STATUS_COLOR: Record<DeliveryStatus, string> = { available: '#7db87a', unavailable: '#c96b6b', partial: '#d4a843' };

function getDefaultStatus(dateStr: string): DeliveryStatus {
  const d = new Date(dateStr);
  const dow = d.getDay(); // 0=일
  if (dow === 0) return 'unavailable';
  if (KR_HOLIDAYS_2026.includes(dateStr)) return 'unavailable';
  return 'available';
}

function buildCalendar(year: number, month: number) {
  const days: { date: string; day: number; otherMonth: boolean }[] = [];
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startDow = first.getDay();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), otherMonth: true });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date, day: d, otherMonth: false });
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const nd = new Date(year, month, d);
    days.push({ date: nd.toISOString().slice(0, 10), day: d, otherMonth: true });
  }
  return days;
}

export default function HqGoalEventTab() {
  const now = new Date();
  const [goalYear, setGoalYear] = useState(now.getFullYear());
  const [goalMonth, setGoalMonth] = useState(now.getMonth() + 1);
  const [goals, setGoals] = useState<Record<string, { amount: string; contracts: string; quotes: string }>>({});
  const [savedGoals, setSavedGoals] = useState<Record<string, any>>({});

  // 행사/공지
  const [events, setEvents] = useState<{ id: number; title: string; start: string; end: string; memo: string }[]>([]);
  const [notices, setNotices] = useState<{ id: number; title: string; start: string; end: string; permanent: boolean; content: string }[]>([]);
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', memo: '' });
  const [newNotice, setNewNotice] = useState({ title: '', start: '', end: '', permanent: false, content: '' });

  // 납기 캘린더
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [deliveryMap, setDeliveryMap] = useState<Record<string, DeliveryStatus>>({});

  const goalKey = `${goalYear}-${String(goalMonth).padStart(2, '0')}`;
  const currentGoal = goals[goalKey] ?? { amount: '', contracts: '', quotes: '' };

  function saveGoal() {
    setSavedGoals((prev) => ({ ...prev, [goalKey]: { ...currentGoal, year: goalYear, month: goalMonth } }));
    alert('목표가 저장되었습니다.');
  }

  function addEvent() {
    if (!newEvent.title || !newEvent.start) return;
    setEvents((prev) => [...prev, { ...newEvent, id: Date.now() }]);
    setNewEvent({ title: '', start: '', end: '', memo: '' });
  }

  function addNotice() {
    if (!newNotice.title) return;
    setNotices((prev) => [...prev, { ...newNotice, id: Date.now() }]);
    setNewNotice({ title: '', start: '', end: '', permanent: false, content: '' });
  }

  function toggleDelivery(date: string) {
    const current = deliveryMap[date] ?? getDefaultStatus(date);
    const next: DeliveryStatus = current === 'available' ? 'unavailable' : current === 'unavailable' ? 'partial' : 'available';
    setDeliveryMap((prev) => ({ ...prev, [date]: next }));
  }

  // 3개월 캘린더
  const months = [-1, 0, 1].map((offset) => {
    let m = calMonth + offset;
    let y = calYear;
    if (m < 1) { m += 12; y -= 1; }
    if (m > 12) { m -= 12; y += 1; }
    return { year: y, month: m };
  });

  const DOW = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 사업부 월간 목표 설정 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>사업부 월간 목표 설정</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={goalYear} onChange={(e) => setGoalYear(Number(e.target.value))} style={{ width: 90 }}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={goalMonth} onChange={(e) => setGoalMonth(Number(e.target.value))} style={{ width: 80 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
          {[
            { label: '매출 목표 (원)', key: 'amount', placeholder: '예: 500000000' },
            { label: '판매건수 목표', key: 'contracts', placeholder: '예: 50' },
            { label: '견적건수 목표', key: 'quotes', placeholder: '예: 150' },
          ].map((f) => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input value={(currentGoal as any)[f.key]} onChange={(e) => setGoals((prev) => ({ ...prev, [goalKey]: { ...currentGoal, [f.key]: e.target.value } }))} placeholder={f.placeholder} />
            </div>
          ))}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveGoal}>저장</button>
        </div>

        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>목표 이력 (연도별/월별)</div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {Object.keys(savedGoals).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>저장된 목표 없음</div>
            ) : (
              <table>
                <thead><tr><th>기간</th><th style={{ textAlign: 'right' }}>매출</th><th style={{ textAlign: 'right' }}>판매</th><th style={{ textAlign: 'right' }}>견적</th></tr></thead>
                <tbody>
                  {Object.entries(savedGoals).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]: any) => (
                    <tr key={k}>
                      <td>{v.year}년 {v.month}월</td>
                      <td style={{ textAlign: 'right' }}>{Number(v.amount || 0).toLocaleString()}원</td>
                      <td style={{ textAlign: 'right' }}>{v.contracts}건</td>
                      <td style={{ textAlign: 'right' }}>{v.quotes}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 전사 행사 등록 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>전사 행사 등록</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>행사명</label>
            <input value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} placeholder="예: 봄 프로모션" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>시작일</label>
            <input type="date" value={newEvent.start} onChange={(e) => setNewEvent((p) => ({ ...p, start: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>종료일</label>
            <input type="date" value={newEvent.end} onChange={(e) => setNewEvent((p) => ({ ...p, end: e.target.value }))} />
          </div>
          <button className="btn btn-primary" style={{ height: 42 }} onClick={addEvent}>등록</button>
        </div>
        <input value={newEvent.memo} onChange={(e) => setNewEvent((p) => ({ ...p, memo: e.target.value }))} placeholder="메모 (선택)" style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((ev) => (
            <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(200,149,108,0.08)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>{ev.start} ~ {ev.end}</span>
                {ev.memo && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>· {ev.memo}</span>}
              </div>
              <button onClick={() => setEvents((p) => p.filter((e) => e.id !== ev.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          ))}
          {events.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>등록된 행사 없음</div>}
        </div>
      </div>

      {/* 전사 공지 등록 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>전사 공지 등록</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>공지 제목</label>
            <input value={newNotice.title} onChange={(e) => setNewNotice((p) => ({ ...p, title: e.target.value }))} placeholder="예: 신규 컬렉션 론칭" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>시작일</label>
            <input type="date" value={newNotice.start} onChange={(e) => setNewNotice((p) => ({ ...p, start: e.target.value }))} disabled={newNotice.permanent} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>종료일</label>
            <input type="date" value={newNotice.end} onChange={(e) => setNewNotice((p) => ({ ...p, end: e.target.value }))} disabled={newNotice.permanent} />
          </div>
          <button className="btn btn-primary" style={{ height: 42 }} onClick={addNotice}>등록</button>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center' }}>
          <textarea value={newNotice.content} onChange={(e) => setNewNotice((p) => ({ ...p, content: e.target.value }))} placeholder="공지 내용" style={{ flex: 1, height: 60, resize: 'none' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={newNotice.permanent} onChange={(e) => setNewNotice((p) => ({ ...p, permanent: e.target.checked }))} style={{ width: 'auto' }} />
            계속 공지
          </label>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notices.map((n) => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(212,168,67,0.08)', borderRadius: 8, borderLeft: '3px solid var(--warning)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title} {n.permanent && <span className="badge" style={{ background: 'rgba(212,168,67,0.2)', color: 'var(--warning)', marginLeft: 6 }}>계속</span>}</div>
                {!n.permanent && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.start} ~ {n.end}</div>}
                {n.content && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{n.content}</div>}
              </div>
              <button onClick={() => setNotices((p) => p.filter((x) => x.id !== n.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          ))}
          {notices.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>등록된 공지 없음</div>}
        </div>
      </div>

      {/* 납기 일정 캘린더 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>납기 일정 관리</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => { let m = calMonth - 1; let y = calYear; if (m < 1) { m = 12; y--; } setCalMonth(m); setCalYear(y); }} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{calYear}년 {calMonth}월 기준</span>
            <button onClick={() => { let m = calMonth + 1; let y = calYear; if (m > 12) { m = 1; y++; } setCalMonth(m); setCalYear(y); }} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}>›</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12 }}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[k as DeliveryStatus], display: 'inline-block' }} />
              {v}
            </span>
          ))}
          <span style={{ color: 'var(--text-muted)' }}>· 클릭으로 상태 변경</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {months.map(({ year: y, month: m }) => {
            const days = buildCalendar(y, m);
            return (
              <div key={`${y}-${m}`}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>{y}년 {m}월</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                  {DOW.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>)}
                  {days.map((day) => {
                    const status = deliveryMap[day.date] ?? getDefaultStatus(day.date);
                    return (
                      <div key={day.date} onClick={() => !day.otherMonth && toggleDelivery(day.date)}
                        style={{ textAlign: 'center', padding: '4px 2px', borderRadius: 4, fontSize: 11, cursor: day.otherMonth ? 'default' : 'pointer', opacity: day.otherMonth ? 0.3 : 1, background: day.otherMonth ? 'transparent' : `${STATUS_COLOR[status]}22`, color: day.otherMonth ? 'var(--text-muted)' : STATUS_COLOR[status], fontWeight: 500, border: `1px solid ${day.otherMonth ? 'transparent' : STATUS_COLOR[status]}44` }}>
                        {day.day}
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
