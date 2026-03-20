import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import MiniDatePicker from '../../components/MiniDatePicker';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function pad2(n: number) { return String(n).padStart(2, '0'); }

type CalendarView = 'all' | 'store';
type FilterPeriod = 'all' | '7d' | '30d' | 'custom';

const PC: Record<string, string> = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#6b7280', CRITICAL: '#a855f7' };
const PL: Record<string, string> = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음', CRITICAL: '긴급' };
const NC: Record<string, string> = { URGENT: '#ef4444', IMPORTANT: '#f59e0b', NORMAL: '#6b7280' };
const NL: Record<string, string> = { URGENT: '긴급', IMPORTANT: '중요', NORMAL: '일반' };
const SC: Record<string, string> = { OPEN: '#60a5fa', IN_PROGRESS: '#f59e0b', RESOLVED: '#34d399', CLOSED: '#6b7280' };
const SL: Record<string, string> = { OPEN: '미처리', IN_PROGRESS: '처리중', RESOLVED: '해결됨', CLOSED: '종료' };

const PERMANENT_TAG = '[항시]';

export default function StoreIssuePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [calView, setCalView] = useState<CalendarView>('all');

  // 이슈 등록 폼
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [isPermanent, setIsPermanent] = useState(false);

  // 이슈 목록 필터
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const qc = useQueryClient();

  const { data: issues = [] } = useQuery({
    queryKey: ['issues', storeId],
    queryFn: () => api.get(`/stores/${storeId}/issues`).then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!storeId,
  });
  const { data: notices = [] } = useQuery({
    queryKey: ['hq-notices'],
    queryFn: () => api.get('/hq/notices').then(r => r.data ?? []).catch(() => []),
  });
  const { data: hqEvents = [] } = useQuery({
    queryKey: ['hq-events'],
    queryFn: () => api.get('/hq/events').then(r => r.data ?? []).catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post(`/stores/${storeId}/issues`, {
      title,
      description: isPermanent ? `${PERMANENT_TAG} ${desc}`.trim() : desc || null,
      priority,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['issues', storeId] }); setTitle(''); setDesc(''); setIsPermanent(false); },
    onError: (err: any) => alert('이슈 등록 실패: ' + (err?.response?.data?.message ?? err.message)),
  });

  const issueList = issues as any[];
  const noticeList = notices as any[];
  const eventList = hqEvents as any[];

  // 기간 필터 계산
  const filteredIssues = useMemo(() => {
    let list = [...issueList];
    const todayStr = now.toISOString().slice(0, 10);

    if (filterPeriod === '7d') {
      const from = new Date(now); from.setDate(from.getDate() - 7);
      list = list.filter(i => new Date(i.createdAt) >= from);
    } else if (filterPeriod === '30d') {
      const from = new Date(now); from.setDate(from.getDate() - 30);
      list = list.filter(i => new Date(i.createdAt) >= from);
    } else if (filterPeriod === 'custom' && filterFrom) {
      const from = new Date(filterFrom);
      const to = filterTo ? new Date(filterTo + 'T23:59:59') : new Date(todayStr + 'T23:59:59');
      list = list.filter(i => { const d = new Date(i.createdAt); return d >= from && d <= to; });
    }

    if (filterPriority) list = list.filter(i => i.priority === filterPriority);
    if (filterStatus) list = list.filter(i => i.status === filterStatus);

    // 항시 이슈 상단 고정
    const permanent = list.filter(i => i.description?.startsWith(PERMANENT_TAG));
    const normal = list.filter(i => !i.description?.startsWith(PERMANENT_TAG));
    return [...permanent, ...normal];
  }, [issueList, filterPeriod, filterFrom, filterTo, filterPriority, filterStatus]);

  // 캘린더 계산
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const issuesByDay: Record<number, any[]> = {};
  issueList.forEach((iss: any) => {
    const d = new Date(iss.createdAt);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate();
      if (!issuesByDay[day]) issuesByDay[day] = [];
      issuesByDay[day].push(iss);
    }
  });

  const eventsByDay: Record<number, any[]> = {};
  eventList.forEach((ev: any) => {
    const startStr = ev.startDate?.slice(0, 10);
    const endStr = (ev.endDate ?? ev.startDate)?.slice(0, 10);
    if (!startStr) return;
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      if (cur.getFullYear() === year && cur.getMonth() + 1 === month) {
        const day = cur.getDate();
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(ev);
      }
    }
  });

  const selectedIssues = selectedDay ? (issuesByDay[selectedDay] ?? []) : [];
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(0,0,0,0.10)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%', boxSizing: 'border-box',
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, sans-serif",
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>매장 이슈</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90, fontSize: 13 }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 70, fontSize: 13 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => <option key={mo} value={mo}>{mo}월</option>)}
          </select>
        </div>
      </div>

      {/* 전체 공지 */}
      {noticeList.length > 0 && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📢 전체 공지</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {noticeList.map((n: any) => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(124,106,247,0.04)', borderRadius: 8, borderLeft: `3px solid ${NC[n.priority] ?? '#6b7280'}` }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: NC[n.priority] ?? '#6b7280', background: `${NC[n.priority] ?? '#6b7280'}20`, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap', marginTop: 1 }}>{NL[n.priority] ?? '일반'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 통합 이슈 캘린더 */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>통합 이슈 캘린더</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {([['all', '전체'], ['store', '점별']] as [CalendarView, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setCalView(v)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: calView === v ? 'var(--accent)' : 'rgba(255,255,255,0.08)', color: calView === v ? '#fff' : 'var(--text-muted)', fontWeight: calView === v ? 700 : 400 }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#f87171', display: 'inline-block' }} />점별 이슈</span>
          {calView === 'all' && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#fbbf24', display: 'inline-block' }} />전사 이벤트</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {WEEKDAYS.map((d, i) => <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '6px 0', color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'var(--text-muted)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} style={{ minHeight: 72 }} />;
            const dow = (firstDayOfWeek + day - 1) % 7;
            const isSun = dow === 0; const isSat = dow === 6;
            const dayIssues = issuesByDay[day] ?? [];
            const dayEvents = calView === 'all' ? (eventsByDay[day] ?? []) : [];
            const isSelected = selectedDay === day;
            const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
            return (
              <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)} className="issue-cal-cell" style={{ minHeight: 72, borderRadius: 10, padding: '6px 8px', cursor: 'pointer', background: isSelected ? 'rgba(200,149,108,0.15)' : isToday ? 'rgba(124,106,247,0.06)' : 'rgba(0,0,0,0.02)', border: isSelected ? '1.5px solid var(--accent)' : isToday ? '1.5px solid rgba(124,106,247,0.25)' : '1px solid rgba(0,0,0,0.05)', transition: 'background 0.15s' }}>
                <div className="issue-cal-day" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: isSun ? '#ef4444' : isSat ? '#3b82f6' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {day}{isToday && <span style={{ fontSize: 9, background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>오늘</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayIssues.slice(0, 2).map((iss: any) => (
                    <div key={iss.id} style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, background: `${PC[iss.priority] ?? '#6b7280'}25`, color: PC[iss.priority] ?? '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: `2px solid ${PC[iss.priority] ?? '#6b7280'}` }}>{iss.title}</div>
                  ))}
                  {dayIssues.length > 2 && <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4 }}>+{dayIssues.length - 2}개 더</div>}
                  {dayEvents.slice(0, 1).map((ev: any) => (
                    <div key={ev.id} style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: '2px solid #fbbf24' }}>{ev.title}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {selectedDay && (selectedIssues.length > 0 || selectedEvents.length > 0) && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(0,0,0,0.03)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{month}월 {selectedDay}일 상세</div>
            {selectedIssues.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>점별 이슈 ({selectedIssues.length})</div>
                {selectedIssues.map((iss: any) => (
                  <div key={iss.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.03)', borderLeft: `3px solid ${PC[iss.priority] ?? '#6b7280'}`, marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{iss.title}</span>
                      <span style={{ fontSize: 10, color: PC[iss.priority] ?? '#6b7280' }}>{PL[iss.priority] ?? '보통'}</span>
                    </div>
                    {iss.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{iss.description.replace(PERMANENT_TAG, '').trim()}</div>}
                  </div>
                ))}
              </div>
            )}
            {selectedEvents.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>전사 이벤트 ({selectedEvents.length})</div>
                {selectedEvents.map((ev: any) => (
                  <div key={ev.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', borderLeft: '3px solid #f59e0b', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{ev.title}</div>
                    {ev.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.description}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{ev.startDate?.slice(0, 10)} ~ {ev.endDate?.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {selectedDay && selectedIssues.length === 0 && selectedEvents.length === 0 && (
          <div style={{ marginTop: 16, padding: '14px 16px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: 10, fontSize: 13, color: 'var(--text-muted)' }}>{month}월 {selectedDay}일에 등록된 이슈/이벤트가 없습니다</div>
        )}
      </div>

      {/* 점내 이슈 누적 관리 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>점내 이슈 누적 관리</div>

        {/* 이슈 등록 */}
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>새 이슈 등록</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="이슈 제목 *" style={inputStyle} />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="이슈 내용 (선택)" style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={priority} onChange={e => setPriority(e.target.value as any)} style={{ ...inputStyle, width: 'auto', flex: '0 0 120px' }}>
                <option value="LOW">낮음</option>
                <option value="MEDIUM">보통</option>
                <option value="HIGH">높음</option>
                <option value="CRITICAL">긴급</option>
              </select>
              {/* 항시 체크 토글 */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', flex: 1 }}>
                <div onClick={() => setIsPermanent(p => !p)} style={{
                  width: 40, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer',
                  background: isPermanent ? 'var(--accent)' : 'rgba(0,0,0,0.12)',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 3, left: isPermanent ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: isPermanent ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isPermanent ? 600 : 400 }}>
                  항시 체크
                </span>
                {isPermanent && <span style={{ fontSize: 10, background: 'rgba(200,149,108,0.2)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>상단 고정</span>}
              </label>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 20px', whiteSpace: 'nowrap' }}
                onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending}>
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>

        {/* 필터 바 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>기간</div>
          {([['all', '전체'], ['7d', '7일'], ['30d', '30일'], ['custom', '직접 설정']] as [FilterPeriod, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setFilterPeriod(v)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: filterPeriod === v ? 'var(--accent)' : 'rgba(0,0,0,0.06)', color: filterPeriod === v ? '#fff' : 'var(--text-muted)', fontWeight: filterPeriod === v ? 700 : 400 }}>{l}</button>
          ))}
          {filterPeriod === 'custom' && (
            <>
              <MiniDatePicker value={filterFrom} onChange={setFilterFrom} placeholder="시작일" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>~</span>
              <MiniDatePicker value={filterTo} onChange={setFilterTo} placeholder="종료일" />
            </>
          )}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}>
            <option value="">우선순위 전체</option>
            <option value="CRITICAL">긴급</option>
            <option value="HIGH">높음</option>
            <option value="MEDIUM">보통</option>
            <option value="LOW">낮음</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}>
            <option value="">상태 전체</option>
            <option value="OPEN">미처리</option>
            <option value="IN_PROGRESS">처리중</option>
            <option value="RESOLVED">해결됨</option>
            <option value="CLOSED">종료</option>
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>총 {filteredIssues.length}건</span>
        </div>

        {/* 이슈 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredIssues.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>조건에 맞는 이슈가 없습니다</div>
          )}
          {filteredIssues.map((iss: any) => {
            const isPerma = iss.description?.startsWith(PERMANENT_TAG);
            const cleanDesc = isPerma ? iss.description.replace(PERMANENT_TAG, '').trim() : iss.description;
            return (
              <div key={iss.id} style={{ background: isPerma ? 'rgba(200,149,108,0.08)' : 'rgba(0,0,0,0.02)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${PC[iss.priority] ?? '#6b7280'}`, border: isPerma ? `1px solid rgba(200,149,108,0.3)` : '1px solid rgba(0,0,0,0.05)', borderLeftWidth: 3, borderLeftColor: PC[iss.priority] ?? '#6b7280', borderLeftStyle: 'solid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    {isPerma && <span style={{ fontSize: 10, background: 'rgba(200,149,108,0.25)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap' }}>항시</span>}
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iss.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: PC[iss.priority] ?? '#6b7280', background: `${PC[iss.priority] ?? '#6b7280'}20`, padding: '2px 8px', borderRadius: 99 }}>{PL[iss.priority] ?? '보통'}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: SC[iss.status] ?? '#6b7280', background: `${SC[iss.status] ?? '#6b7280'}20`, padding: '2px 8px', borderRadius: 99 }}>{SL[iss.status] ?? '미처리'}</span>
                  </div>
                </div>
                {cleanDesc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>{cleanDesc}</div>}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(iss.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
