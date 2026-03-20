import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number) { return String(n).padStart(2, '0'); }

type CalendarView = 'all' | 'store';

const PRIORITY_COLOR: Record<string, string> = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#6b7280' };
const PRIORITY_LABEL: Record<string, string> = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
const NOTICE_COLOR: Record<string, string> = { URGENT: '#ef4444', IMPORTANT: '#f59e0b', NORMAL: '#6b7280' };
const NOTICE_LABEL: Record<string, string> = { URGENT: '긴급', IMPORTANT: '중요', NORMAL: '일반' };

export default function StoreIssuePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [calView, setCalView] = useState<CalendarView>('all');
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueContent, setNewIssueContent] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
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

  const createIssueMutation = useMutation({
    mutationFn: () => api.post(`/stores/${storeId}/issues`, {
      title: newIssueTitle, description: newIssueContent, priority: newIssuePriority,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues', storeId] });
      setNewIssueTitle(''); setNewIssueContent('');
    },
    onError: (err: any) => {
      alert('이슈 등록 실패: ' + (err?.response?.data?.message ?? err.message));
    },
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const issueList = issues as any[];
  const eventList = hqEvents as any[];
  const noticeList = notices as any[];

  // 날짜별 이슈 매핑
  const issuesByDay: Record<number, any[]> = {};
  issueList.forEach((iss: any) => {
    const d = new Date(iss.createdAt);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate();
      if (!issuesByDay[day]) issuesByDay[day] = [];
      issuesByDay[day].push(iss);
    }
  });

  // 날짜별 이벤트 매핑
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
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', background: 'rgba(255,255,255,0.04)',
                borderRadius: 8, borderLeft: `3px solid ${NOTICE_COLOR[n.priority] ?? '#6b7280'}`,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: NOTICE_COLOR[n.priority] ?? '#6b7280',
                  background: `${NOTICE_COLOR[n.priority] ?? '#6b7280'}20`,
                  padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap', marginTop: 1,
                }}>{NOTICE_LABEL[n.priority] ?? '일반'}</span>
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
              <button key={v} onClick={() => setCalView(v)} style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: calView === v ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: calView === v ? '#fff' : 'var(--text-muted)',
                fontWeight: calView === v ? 700 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f87171', display: 'inline-block' }} />
            점별 이슈
          </span>
          {calView === 'all' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#fbbf24', display: 'inline-block' }} />
              전사 이벤트
            </span>
          )}
        </div>

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '6px 0',
              color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'var(--text-muted)',
            }}>{d}</div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} style={{ minHeight: 72 }} />;
            const dow = (firstDayOfWeek + day - 1) % 7;
            const isSun = dow === 0;
            const isSat = dow === 6;
            const dayIssues = issuesByDay[day] ?? [];
            const dayEvents = calView === 'all' ? (eventsByDay[day] ?? []) : [];
            const isSelected = selectedDay === day;
            const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();

            return (
              <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)} style={{
                minHeight: 72, borderRadius: 10, padding: '6px 8px', cursor: 'pointer',
                background: isSelected
                  ? 'rgba(200,149,108,0.2)'
                  : isToday
                    ? 'rgba(255,255,255,0.07)'
                    : 'rgba(255,255,255,0.03)',
                border: isSelected
                  ? '1.5px solid var(--accent)'
                  : isToday
                    ? '1.5px solid rgba(255,255,255,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                transition: 'background 0.15s',
              }}>
                {/* 날짜 숫자 */}
                <div style={{
                  fontSize: 13, fontWeight: 700, marginBottom: 4,
                  color: isSun ? '#f87171' : isSat ? '#60a5fa' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {day}
                  {isToday && (
                    <span style={{
                      fontSize: 9, background: 'var(--accent)', color: '#fff',
                      borderRadius: 4, padding: '1px 4px', fontWeight: 700,
                    }}>오늘</span>
                  )}
                </div>

                {/* 이슈 태그 (최대 2개) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayIssues.slice(0, 2).map((iss: any) => (
                    <div key={iss.id} style={{
                      fontSize: 10, padding: '2px 5px', borderRadius: 4,
                      background: `${PRIORITY_COLOR[iss.priority] ?? '#6b7280'}25`,
                      color: PRIORITY_COLOR[iss.priority] ?? '#6b7280',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      borderLeft: `2px solid ${PRIORITY_COLOR[iss.priority] ?? '#6b7280'}`,
                    }}>
                      {iss.title}
                    </div>
                  ))}
                  {dayIssues.length > 2 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4 }}>
                      +{dayIssues.length - 2}개 더
                    </div>
                  )}
                  {dayEvents.slice(0, 1).map((ev: any) => (
                    <div key={ev.id} style={{
                      fontSize: 10, padding: '2px 5px', borderRadius: 4,
                      background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      borderLeft: '2px solid #fbbf24',
                    }}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 선택된 날짜 상세 */}
        {selectedDay && (selectedIssues.length > 0 || selectedEvents.length > 0) && (
          <div style={{
            marginTop: 16, padding: '14px 16px',
            background: 'rgba(255,255,255,0.05)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              {month}월 {selectedDay}일 상세
            </div>
            {selectedIssues.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>점별 이슈 ({selectedIssues.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedIssues.map((iss: any) => (
                    <div key={iss.id} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      borderLeft: `3px solid ${PRIORITY_COLOR[iss.priority] ?? '#6b7280'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{iss.title}</span>
                        <span style={{ fontSize: 10, color: PRIORITY_COLOR[iss.priority] ?? '#6b7280' }}>
                          {PRIORITY_LABEL[iss.priority] ?? '보통'}
                        </span>
                      </div>
                      {iss.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{iss.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedEvents.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>전사 이벤트 ({selectedEvents.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedEvents.map((ev: any) => (
                    <div key={ev.id} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(251,191,36,0.08)', borderLeft: '3px solid #fbbf24',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{ev.title}</div>
                      {ev.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.description}</div>}
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                        {ev.startDate?.slice(0, 10)} ~ {ev.endDate?.slice(0, 10)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {selectedDay && selectedIssues.length === 0 && selectedEvents.length === 0 && (
          <div style={{
            marginTop: 16, padding: '14px 16px', textAlign: 'center',
            background: 'rgba(255,255,255,0.03)', borderRadius: 10,
            fontSize: 13, color: 'var(--text-muted)',
          }}>
            {month}월 {selectedDay}일에 등록된 이슈/이벤트가 없습니다
          </div>
        )}
      </div>

      {/* 점내 이슈 누적 관리 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>점내 이슈 누적 관리</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* 이슈 등록 */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>새 이슈 등록</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={newIssueTitle} onChange={e => setNewIssueTitle(e.target.value)} placeholder="이슈 제목"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }} />
              <textarea value={newIssueContent} onChange={e => setNewIssueContent(e.target.value)} placeholder="이슈 내용"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, minHeight: 80, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={newIssuePriority} onChange={e => setNewIssuePriority(e.target.value as any)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }}>
                  <option value="LOW">낮음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="HIGH">높음</option>
                </select>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}
                  onClick={() => createIssueMutation.mutate()}
                  disabled={!newIssueTitle || createIssueMutation.isPending}>
                  등록
                </button>
              </div>
            </div>
          </div>

          {/* 이슈 목록 */}
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {issueList.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                등록된 이슈 없음
              </div>
            )}
            {issueList.map((iss: any) => (
              <div key={iss.id} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px',
                borderLeft: `3px solid ${PRIORITY_COLOR[iss.priority] ?? '#6b7280'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{iss.title}</span>
                  <span style={{ fontSize: 10, color: PRIORITY_COLOR[iss.priority] ?? '#6b7280' }}>
                    {PRIORITY_LABEL[iss.priority] ?? '보통'}
                  </span>
                </div>
                {iss.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{iss.description}</div>}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                  {new Date(iss.createdAt).toLocaleDateString('ko')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
