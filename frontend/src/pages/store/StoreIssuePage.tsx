import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function StoreIssuePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newMemo, setNewMemo] = useState('');
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newEvent, setNewEvent] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const qc = useQueryClient();

  // 납기 데이터
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', storeId],
    queryFn: () => api.get(`/deliveries?storeId=${storeId}&status=SCHEDULED`).then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!storeId,
  });

  // 이슈 데이터
  const { data: issues = [] } = useQuery({
    queryKey: ['issues', storeId],
    queryFn: () => api.get(`/issues?storeId=${storeId}`).then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!storeId,
  });

  // 메모 데이터
  const { data: memos = [] } = useQuery({
    queryKey: ['memos', storeId],
    queryFn: () => api.get(`/memos?storeId=${storeId}`).then(r => r.data?.data ?? []).catch(() => []),
    enabled: !!storeId,
  });

  // 스케줄(점 행사) 데이터
  const { data: scheduleEvents = [] } = useQuery({
    queryKey: ['hq-events'],
    queryFn: () => api.get('/hq/events').then(r => r.data ?? []).catch(() => []),
  });

  const createMemoMutation = useMutation({
    mutationFn: () => api.post('/memos', { storeId, title: newMemoTitle, content: newMemo, category: 'GENERAL' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memos', storeId] });
      setNewMemoTitle('');
      setNewMemo('');
    },
  });

  // 납기 D-day 계산
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  const deliveryList = deliveries as any[];
  const todayDeliveries = deliveryList.filter((d: any) => d.scheduledDate?.startsWith(todayStr));
  const tomorrowDeliveries = deliveryList.filter((d: any) => d.scheduledDate?.startsWith(tomorrowStr));
  const dayAfterDeliveries = deliveryList.filter((d: any) => d.scheduledDate?.startsWith(dayAfterStr));

  // 캘린더
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  // 날짜별 이슈/행사 매핑
  const issueList = issues as any[];
  const eventList = scheduleEvents as any[];

  const dayHasIssue = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return issueList.some((iss: any) => iss.createdAt?.startsWith(dateStr));
  };

  const dayHasEvent = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventList.some((ev: any) => ev.startDate <= dateStr && ev.endDate >= dateStr);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>매장 이슈</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => <option key={mo} value={mo}>{mo}월</option>)}
          </select>
        </div>
      </div>

      {/* 납기 D-day 섹터 */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>납기 일정 확인</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: '오늘', items: todayDeliveries, color: '#f87171' },
            { label: '내일', items: tomorrowDeliveries, color: '#fcd34d' },
            { label: '모레', items: dayAfterDeliveries, color: '#6ee7b7' },
          ].map((group) => (
            <div key={group.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{group.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: group.color }}>{group.items.length}건</span>
              </div>
              {group.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.items.slice(0, 3).map((d: any) => (
                    <div key={d.id} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                      {d.customerName} · {d.address ?? '주소 미입력'}
                    </div>
                  ))}
                  {group.items.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{group.items.length - 3}건 더</div>}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>납기 없음</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(200,149,108,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--accent)' }}>
          ⚠ 납기 전날 고객 연락 및 배송 정보 재확인을 권장합니다
        </div>
      </div>

      {/* 이슈 캘린더 */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>이슈 캘린더</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          <span style={{ marginRight: 12 }}>🔴 이슈 등록일</span>
          <span>🟡 전사 행사</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0', color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dow = (firstDayOfWeek + day - 1) % 7;
            const isSun = dow === 0;
            const isSat = dow === 6;
            const hasIssue = dayHasIssue(day);
            const hasEvent = dayHasEvent(day);
            const isSelected = selectedDay === day;
            return (
              <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)} style={{
                borderRadius: 8, padding: '6px 2px', textAlign: 'center', cursor: 'pointer',
                background: isSelected ? 'rgba(200,149,108,0.25)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isSun ? '#f87171' : isSat ? '#60a5fa' : '#fff' }}>{day}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {hasIssue && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />}
                  {hasEvent && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fcd34d', display: 'inline-block' }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 점별 이슈/메모 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>점내 이슈 & 메모</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <input
              value={newMemoTitle}
              onChange={(e) => setNewMemoTitle(e.target.value)}
              placeholder="제목"
              style={{ fontSize: 13 }}
            />
            <textarea
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="이슈 또는 메모 내용을 입력하세요"
              style={{ fontSize: 13, minHeight: 80, resize: 'vertical', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 12px', color: '#fff' }}
            />
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => createMemoMutation.mutate()} disabled={!newMemoTitle || createMemoMutation.isPending}>
              등록
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {(memos as any[]).map((memo: any) => (
              <div key={memo.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{memo.title}</div>
                {memo.content && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{memo.content}</div>}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{new Date(memo.createdAt).toLocaleDateString('ko')}</div>
              </div>
            ))}
            {(memos as any[]).length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>등록된 메모 없음</div>}
          </div>
        </div>

        {/* 전사 행사 목록 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>전사 행사 일정</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {eventList.length > 0 ? eventList.map((ev: any) => (
              <div key={ev.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #fcd34d' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{ev.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.startDate} ~ {ev.endDate}</div>
                {ev.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{ev.description}</div>}
              </div>
            )) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>등록된 전사 행사 없음</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
