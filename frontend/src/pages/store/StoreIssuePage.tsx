import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number) { return String(n).padStart(2, '0'); }

function getDefaultDeliveryStatus(year: number, month: number, day: number): string {
  const dow = new Date(year, month - 1, day).getDay();
  const KR_HOLIDAYS = ['01-01','03-01','05-05','06-06','08-15','10-03','10-09','12-25'];
  if (dow === 0 || KR_HOLIDAYS.includes(`${pad2(month)}-${pad2(day)}`)) return 'unavailable';
  return 'available';
}

const DELIVERY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  available: { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', label: '가능' },
  unavailable: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', label: '불가' },
  partial: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', label: '일부' },
};

type CalendarView = 'all' | 'store' | 'delivery';

export default function StoreIssuePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [calView, setCalView] = useState<CalendarView>('all');
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueContent, setNewIssueContent] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<'LOW'|'MEDIUM'|'HIGH'>('MEDIUM');
  const qc = useQueryClient();

  const { data: issues = [] } = useQuery({
    queryKey: ['issues', storeId],
    queryFn: () => api.get(`/issues?storeId=${storeId}`).then(r => r.data?.data ?? []).catch(() => []),
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

  const { data: deliveryCalendar } = useQuery({
    queryKey: ['delivery-calendar', year, month],
    queryFn: () => api.get(`/hq/delivery-calendar?year=${year}&month=${month}`).then(r => r.data).catch(() => ({})),
  });

  const createIssueMutation = useMutation({
    mutationFn: () => api.post('/issues', { storeId, title: newIssueTitle, description: newIssueContent, priority: newIssuePriority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues', storeId] });
      setNewIssueTitle(''); setNewIssueContent('');
    },
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const issueList = issues as any[];
  const eventList = hqEvents as any[];
  const deliveryMap = (deliveryCalendar ?? {}) as Record<number, string>;

  const dayHasIssue = (day: number) => {
    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
    return issueList.some((iss: any) => iss.createdAt?.startsWith(dateStr));
  };
  const dayHasEvent = (day: number) => {
    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
    return eventList.some((ev: any) => ev.startDate <= dateStr && ev.endDate >= dateStr);
  };

  const priorityColor = (p: string) => p === 'HIGH' ? '#ef4444' : p === 'MEDIUM' ? '#f59e0b' : '#6b7280';
  const priorityLabel = (p: string) => p === 'HIGH' ? '높음' : p === 'MEDIUM' ? '보통' : '낮음';
  const noticePriorityColor = (p: string) => p === 'URGENT' ? '#ef4444' : p === 'IMPORTANT' ? '#f59e0b' : '#6b7280';
  const noticePriorityLabel = (p: string) => p === 'URGENT' ? '긴급' : p === 'IMPORTANT' ? '중요' : '일반';

  return (
    <div>
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

      {/* 전체 공지 — 최상단 */}
      {(notices as any[]).length > 0 && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📢 전체 공지</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(notices as any[]).map((n: any) => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, borderLeft: `3px solid ${noticePriorityColor(n.priority)}` }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: noticePriorityColor(n.priority), background: `${noticePriorityColor(n.priority)}20`, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap', marginTop: 1 }}>{noticePriorityLabel(n.priority)}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 점별 이슈 누적 관리 */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
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
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => createIssueMutation.mutate()} disabled={!newIssueTitle || createIssueMutation.isPending}>등록</button>
              </div>
            </div>
          </div>
          {/* 이슈 목록 */}
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {issueList.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>등록된 이슈 없음</div>}
            {issueList.map((iss: any) => (
              <div key={iss.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${priorityColor(iss.priority ?? 'MEDIUM')}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{iss.title}</span>
                  <span style={{ fontSize: 10, color: priorityColor(iss.priority ?? 'MEDIUM') }}>{priorityLabel(iss.priority ?? 'MEDIUM')}</span>
                </div>
                {iss.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{iss.description}</div>}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{new Date(iss.createdAt).toLocaleDateString('ko')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 통합 이슈 캘린더 */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>통합 이슈 캘린더</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {([['all','전체'],['store','점별'],['delivery','납기']] as [CalendarView, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setCalView(v)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: calView === v ? 'var(--accent)' : 'rgba(255,255,255,0.08)', color: calView === v ? '#fff' : 'var(--text-muted)', fontWeight: calView === v ? 700 : 400 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, marginBottom: 12 }}>
          {(calView === 'all' || calView === 'store') && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />점별 이슈</span>}
          {(calView === 'all') && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fcd34d', display: 'inline-block' }} />전사 이슈</span>}
          {(calView === 'all' || calView === 'delivery') && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(16,185,129,0.3)', border: '1px solid #6ee7b7', display: 'inline-block' }} />납기 가능</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {WEEKDAYS.map((d, i) => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0', color: i===0?'#f87171':i===6?'#60a5fa':'var(--text-muted)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dow = (firstDayOfWeek + day - 1) % 7;
            const isSun = dow === 0;
            const isSat = dow === 6;
            const hasIssue = dayHasIssue(day);
            const hasEvent = dayHasEvent(day);
            const status = deliveryMap[day] ?? getDefaultDeliveryStatus(year, month, day);
            const dStyle = DELIVERY_COLORS[status] ?? DELIVERY_COLORS.available;
            const isSelected = selectedDay === day;
            const showDelivery = calView === 'all' || calView === 'delivery';
            const showIssue = calView === 'all' || calView === 'store';
            const showEvent = calView === 'all';
            return (
              <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)} style={{
                borderRadius: 8, padding: '6px 2px', textAlign: 'center', cursor: 'pointer',
                background: isSelected ? 'rgba(200,149,108,0.25)' : showDelivery ? dStyle.bg : 'rgba(255,255,255,0.03)',
                border: isSelected ? '1px solid var(--accent)' : showDelivery ? `1px solid ${dStyle.color}20` : '1px solid transparent',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isSun ? '#f87171' : isSat ? '#60a5fa' : '#fff' }}>{day}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {showIssue && hasIssue && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />}
                  {showEvent && hasEvent && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fcd34d', display: 'inline-block' }} />}
                </div>
                {showDelivery && <div style={{ fontSize: 8, color: dStyle.color, marginTop: 1 }}>{dStyle.label}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
