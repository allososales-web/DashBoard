import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function pad2(n: number) { return String(n).padStart(2, '0'); }

interface WorkType { id: string; name: string; startTime: string; endTime: string; color: string; }
interface StaffMember { id: string; name: string; }
interface WorkEntry { staffId: string; day: number; typeId: string | null; isOff: boolean; }

interface DeliveryItem {
  id: string;
  customerName: string;
  scheduledDate: string;
  status: string;
  address: string | null;
  notes: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  SCHEDULED:  { bg: 'rgba(245,158,11,0.12)',  color: '#d97706', label: '납기 예정' },
  IN_TRANSIT: { bg: 'rgba(124,106,247,0.12)', color: 'var(--accent)', label: '배송 중' },
  DELIVERED:  { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: '납기 완료' },
  FAILED:     { bg: 'rgba(239,68,68,0.10)',   color: '#dc2626', label: '실패' },
};

const TYPE_COLORS = ['#b8a4f0', '#7dd8b8', '#f0a070', '#fcd080', '#f9a0a0', '#a0c4f9', '#c4f0a0'];

const WEEK_PATTERNS = [
  { label: '주5일 (월~금)', days: [1,2,3,4,5] },
  { label: '주5일 (화~토)', days: [2,3,4,5,6] },
  { label: '주4일 (월~목)', days: [1,2,3,4] },
  { label: '주4일 (화~금)', days: [2,3,4,5] },
  { label: '주4일 (수~토)', days: [3,4,5,6] },
  { label: '주3일 (월·수·금)', days: [1,3,5] },
  { label: '주6일 (월~토)', days: [1,2,3,4,5,6] },
];

export default function StoreDashboardDeliveryWorkTab() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const qc = useQueryClient();

  // ── 납기 현황 상태 ──
  const [deliveryView, setDeliveryView] = useState<'calendar' | 'list'>('calendar');
  const [deliveryYear, setDeliveryYear] = useState(now.getFullYear());
  const [deliveryMonth, setDeliveryMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // ── 근무 스케줄 상태 ──
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([
    { id: 'A', name: '근무형태A', startTime: '10:01', endTime: '20:59', color: TYPE_COLORS[0] },
    { id: 'B', name: '근무형태B', startTime: '12:30', endTime: '22:30', color: TYPE_COLORS[1] },
  ]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeStart, setNewTypeStart] = useState('');
  const [newTypeEnd, setNewTypeEnd] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [bulkOffDays, setBulkOffDays] = useState<number[]>([]);
  const [weekPattern, setWeekPattern] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [editCell, setEditCell] = useState<{ day: number; staffId: string } | null>(null);

  // ── 납기 데이터 fetch ──
  const startDate = `${deliveryYear}-${pad2(deliveryMonth)}-01`;
  const lastDay = new Date(deliveryYear, deliveryMonth, 0).getDate();
  const endDate = `${deliveryYear}-${pad2(deliveryMonth)}-${pad2(lastDay)}`;

  const { data: deliveryData, isLoading: deliveryLoading } = useQuery({
    queryKey: ['deliveries', storeId, deliveryYear, deliveryMonth],
    queryFn: () =>
      api.get(`/stores/${storeId}/deliveries?startDate=${startDate}&endDate=${endDate}&limit=100`)
        .then(r => r.data).catch(() => ({ data: [] })),
    enabled: !!storeId,
  });

  const deliveries: DeliveryItem[] = deliveryData?.data ?? [];

  const deliveryByDay = useMemo(() => {
    const map: Record<number, DeliveryItem[]> = {};
    deliveries.forEach(d => {
      const day = new Date(d.scheduledDate).getDate();
      if (!map[day]) map[day] = [];
      map[day].push(d);
    });
    return map;
  }, [deliveries]);

  const deliveryCalendarCells = useMemo(() => {
    const firstDay = new Date(deliveryYear, deliveryMonth - 1, 1).getDay();
    const days = new Date(deliveryYear, deliveryMonth, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [deliveryYear, deliveryMonth]);

  // ── 근무 스케줄 helpers ──
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  function getEntry(staffId: string, day: number): WorkEntry | undefined {
    return workEntries.find(e => e.staffId === staffId && e.day === day);
  }

  function setEntry(staffId: string, day: number, typeId: string | null, isOff: boolean) {
    setWorkEntries(prev => {
      const filtered = prev.filter(e => !(e.staffId === staffId && e.day === day));
      return [...filtered, { staffId, day, typeId, isOff }];
    });
  }

  function applyBulkType(staffId: string) {
    if (!selectedType) return;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      const isOffDay = bulkOffDays.includes(d) || dow === 0;
      const inPattern = weekPattern ? weekPattern.includes(dow) : dow !== 0;
      if (!isOffDay && inPattern) setEntry(staffId, d, selectedType, false);
    }
  }

  function applyBulkOff(staffId: string) {
    bulkOffDays.forEach(d => setEntry(staffId, d, null, true));
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow === 0) setEntry(staffId, d, null, true);
      if (weekPattern && !weekPattern.includes(dow) && dow !== 0) setEntry(staffId, d, null, true);
    }
  }

  function applyAllStaff() {
    if (!selectedType) return;
    staffList.forEach(s => { applyBulkType(s.id); applyBulkOff(s.id); });
  }

  async function saveSchedule() {
    if (!storeId) { alert('매장 정보를 찾을 수 없습니다.'); return; }
    setSaving(true);
    try {
      const records = workEntries
        .map(e => {
          const staffName = staffList.find(s => s.id === e.staffId)?.name ?? '';
          if (!staffName.trim()) return null;
          const wt = e.typeId ? workTypes.find(t => t.id === e.typeId) : null;
          return {
            staffName: staffName.trim(),
            workDate: `${year}-${pad2(month)}-${pad2(e.day)}`,
            isOff: e.isOff,
            workTypeName: wt?.name ?? '',
            startTime: wt?.startTime ?? '',
            endTime: wt?.endTime ?? '',
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      await api.post('/work-records/bulk', { storeId, year, month, records });
      qc.invalidateQueries({ queryKey: ['hq-work-records'] });
      alert('근무 스케줄이 저장되었습니다.');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(msg ? `저장 오류: ${Array.isArray(msg) ? msg.join(', ') : msg}` : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>납기 & 근무 현황</div>

      {/* ── 고객 납기 현황 ── */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>고객 납기 현황</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 연/월 네비게이터 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.8)', border: '1.5px solid var(--border)', borderRadius: 99, padding: '4px 10px' }}>
              <button
                onClick={() => { if (deliveryMonth === 1) { setDeliveryYear(y => y - 1); setDeliveryMonth(12); } else setDeliveryMonth(m => m - 1); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>‹</button>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 60, textAlign: 'center', whiteSpace: 'nowrap' }}>{deliveryYear}년 {deliveryMonth}월</span>
              <button
                onClick={() => { if (deliveryMonth === 12) { setDeliveryYear(y => y + 1); setDeliveryMonth(1); } else setDeliveryMonth(m => m + 1); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>›</button>
            </div>
            {/* 뷰 토글 */}
            <div style={{ display: 'flex', gap: 3 }}>
              {(['calendar', 'list'] as const).map(v => (
                <button key={v} onClick={() => { setDeliveryView(v); setSelectedDay(null); }}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: deliveryView === v ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
                    color: deliveryView === v ? '#fff' : 'var(--text-muted)', fontWeight: deliveryView === v ? 700 : 400 }}>
                  {v === 'calendar' ? '📅 캘린더' : '📋 리스트'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 상태 범례 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {Object.entries(STATUS_STYLE).map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: v.bg, border: `1px solid ${v.color}`, display: 'inline-block' }} />
              <span style={{ color: 'var(--text-muted)' }}>{v.label}</span>
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>총 {deliveries.length}건</span>
        </div>

        {deliveryLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>불러오는 중...</div>
        ) : deliveryView === 'calendar' ? (
          <>
            {/* 캘린더 뷰 */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 420 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                  {WEEKDAYS.map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '5px 0',
                      color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
                      {d}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                  {deliveryCalendarCells.map((day, idx) => {
                    if (!day) return <div key={idx} style={{ minHeight: 64 }} />;
                    const dow = new Date(deliveryYear, deliveryMonth - 1, day).getDay();
                    const isToday = day === now.getDate() && deliveryMonth === now.getMonth() + 1 && deliveryYear === now.getFullYear();
                    const items = deliveryByDay[day] ?? [];
                    const isSelected = selectedDay === day;
                    return (
                      <div key={idx}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        style={{
                          borderRadius: 8, cursor: 'pointer',
                          border: isSelected ? '2px solid var(--accent)' : isToday ? '2px solid rgba(139,124,248,0.3)' : '1px solid rgba(0,0,0,0.07)',
                          background: isSelected ? 'rgba(139,124,248,0.08)' : isToday ? 'rgba(139,124,248,0.04)' : dow === 0 ? 'rgba(239,68,68,0.02)' : 'rgba(255,255,255,0.7)',
                          padding: '5px 4px', minHeight: 64,
                          display: 'flex', flexDirection: 'column', gap: 2,
                          transition: 'all 0.12s',
                        }}>
                        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: isToday ? 800 : 600,
                          color: isToday ? 'var(--accent)' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : 'var(--text)' }}>
                          {day}
                        </div>
                        {items.slice(0, 2).map((item, i) => {
                          const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.SCHEDULED;
                          return (
                            <div key={i} style={{
                              fontSize: 9, fontWeight: 600, padding: '2px 4px', borderRadius: 4,
                              background: s.bg, color: s.color,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.customerName}
                            </div>
                          );
                        })}
                        {items.length > 2 && (
                          <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, textAlign: 'center' }}>
                            +{items.length - 2}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 선택된 날짜 상세 패널 */}
            {selectedDay !== null && (
              <div style={{ marginTop: 16, padding: 16, background: 'rgba(139,124,248,0.04)', borderRadius: 12, border: '1px solid var(--border-accent)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                  {deliveryYear}년 {deliveryMonth}월 {selectedDay}일 납기 목록
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{(deliveryByDay[selectedDay] ?? []).length}건</span>
                </div>
                {(deliveryByDay[selectedDay] ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>납기 일정 없음</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(deliveryByDay[selectedDay] ?? []).map(item => {
                      const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.SCHEDULED;
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', borderRadius: 10, border: `1px solid ${s.color}30` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{item.customerName}</div>
                            {item.address && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.address}</div>}
                            {item.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>메모: {item.notes}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          deliveries.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
              이 달 납기 일정이 없습니다
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>고객명</th><th>납기일</th><th>주소</th><th>메모</th><th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries
                    .slice()
                    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                    .map(item => {
                      const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.SCHEDULED;
                      const d = new Date(item.scheduledDate);
                      const dow = WEEKDAYS[d.getDay()];
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.customerName}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {`${d.getMonth() + 1}/${d.getDate()}`}
                            <span style={{ fontSize: 10, color: d.getDay() === 0 ? '#ef4444' : d.getDay() === 6 ? '#3b82f6' : 'var(--text-muted)', marginLeft: 4 }}>({dow})</span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.address ?? '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes ?? '—'}</td>
                          <td>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── 근무 스케줄 ── */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>매장 근무 스케줄</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ fontSize: 12, padding: '4px 8px' }}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ fontSize: 12, padding: '4px 8px' }}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={saveSchedule} disabled={saving}>
              {saving ? '저장 중...' : '저장 (본사 동기화)'}
            </button>
          </div>
        </div>

        {/* 근무형태 + 매니저 설정 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>근무형태 설정</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {workTypes.map((wt) => (
                <div key={wt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: wt.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{wt.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wt.startTime} ~ {wt.endTime}</span>
                  </div>
                  <button onClick={() => setWorkTypes(prev => prev.filter(t => t.id !== wt.id))} style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="형태명 (예: 근무형태C)" style={{ fontSize: 12 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="time" value={newTypeStart} onChange={e => setNewTypeStart(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>~</span>
                <input type="time" value={newTypeEnd} onChange={e => setNewTypeEnd(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => {
                if (!newTypeName || !newTypeStart || !newTypeEnd) return;
                const color = TYPE_COLORS[workTypes.length % TYPE_COLORS.length];
                setWorkTypes(prev => [...prev, { id: Date.now().toString(), name: newTypeName, startTime: newTypeStart, endTime: newTypeEnd, color }]);
                setNewTypeName(''); setNewTypeStart(''); setNewTypeEnd('');
              }}>+ 형태 추가</button>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>매니저 관리</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {staffList.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12 }}>{s.name}</span>
                  <button onClick={() => setStaffList(prev => prev.filter(st => st.id !== s.id))} style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                </div>
              ))}
              {staffList.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>매니저를 추가하세요</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="매니저 이름" style={{ flex: 1, fontSize: 12 }} />
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => {
                if (!newStaffName.trim()) return;
                setStaffList(prev => [...prev, { id: Date.now().toString(), name: newStaffName.trim() }]);
                setNewStaffName('');
              }}>추가</button>
            </div>
          </div>
        </div>

        {/* 일괄 적용 */}
        {staffList.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>일괄 적용 설정</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>근무형태:</span>
                <select value={selectedType ?? ''} onChange={e => setSelectedType(e.target.value || null)} style={{ fontSize: 12, padding: '4px 8px' }}>
                  <option value="">선택</option>
                  {workTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>주N일 패턴:</span>
                <select value={weekPattern ? weekPattern.join(',') : ''} onChange={e => {
                  if (!e.target.value) { setWeekPattern(null); return; }
                  const found = WEEK_PATTERNS.find(p => p.days.join(',') === e.target.value);
                  setWeekPattern(found ? found.days : null);
                }} style={{ fontSize: 12, padding: '4px 8px' }}>
                  <option value="">기본 (일요일 제외)</option>
                  {WEEK_PATTERNS.map(p => <option key={p.label} value={p.days.join(',')}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>대상 매니저:</span>
                <select value={selectedStaff ?? ''} onChange={e => setSelectedStaff(e.target.value || null)} style={{ fontSize: 12, padding: '4px 8px' }}>
                  <option value="">선택</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { if (selectedStaff) { applyBulkType(selectedStaff); applyBulkOff(selectedStaff); } }}>선택 매니저 적용</button>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={applyAllStaff}>전체 매니저 일괄 적용</button>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>추가 휴무 일자 (클릭으로 토글):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Array.from({length: daysInMonth}, (_, i) => i+1).map(d => {
                  const dow = new Date(year, month-1, d).getDay();
                  const isOff = bulkOffDays.includes(d) || dow === 0;
                  return (
                    <button key={d} onClick={() => {
                      if (dow === 0) return;
                      setBulkOffDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
                    }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: dow === 0 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600,
                      background: isOff ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.04)',
                      color: dow === 0 ? '#ef4444' : isOff ? '#dc2626' : 'var(--text-muted)' }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 월간 캘린더 뷰 */}
        {staffList.length > 0 ? (
          <div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>범례:</span>
              {workTypes.map(wt => (
                <span key={wt.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: wt.color, display: 'inline-block' }} />
                  {wt.name}
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(239,68,68,0.25)', display: 'inline-block' }} />
                휴무
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 560 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                  {WEEKDAYS.map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '6px 0',
                      color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
                      {d}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                  {calendarCells.map((day, idx) => {
                    if (!day) return <div key={idx} style={{ minHeight: 80 + staffList.length * 22 }} />;
                    const dow = new Date(year, month - 1, day).getDay();
                    const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                    const isSun = dow === 0;
                    const isSat = dow === 6;

                    return (
                      <div key={idx} style={{
                        borderRadius: 8,
                        border: isToday ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.07)',
                        background: isToday ? 'rgba(124,106,247,0.04)' : isSun ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.7)',
                        padding: '6px 4px',
                        minHeight: 80 + staffList.length * 22,
                        display: 'flex', flexDirection: 'column', gap: 3,
                      }}>
                        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: isToday ? 800 : 600,
                          color: isToday ? 'var(--accent)' : isSun ? '#ef4444' : isSat ? '#3b82f6' : 'var(--text)',
                          marginBottom: 4 }}>
                          {day}
                        </div>

                        {staffList.map(staff => {
                          const entry = getEntry(staff.id, day);
                          const isOff = entry?.isOff || isSun;
                          const wt = entry?.typeId ? workTypes.find(t => t.id === entry.typeId) : null;
                          const isEditing = editCell?.day === day && editCell?.staffId === staff.id;

                          return (
                            <div key={staff.id} style={{ position: 'relative' }}>
                              <button
                                onClick={() => setEditCell(isEditing ? null : { day, staffId: staff.id })}
                                title={`${staff.name}: ${isOff ? '휴무' : wt ? wt.name : '미설정'}`}
                                style={{
                                  width: '100%', border: 'none', cursor: 'pointer', borderRadius: 4,
                                  padding: '2px 4px', fontSize: 10, fontWeight: 600, textAlign: 'center',
                                  background: isOff ? 'rgba(239,68,68,0.18)' : wt ? `${wt.color}55` : 'rgba(0,0,0,0.05)',
                                  color: isOff ? '#dc2626' : wt ? '#333' : 'var(--text-muted)',
                                  outline: isEditing ? '2px solid var(--accent)' : 'none',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                {staff.name.length > 3 ? staff.name.slice(0, 3) : staff.name}
                                {' '}
                                {isOff ? '휴' : wt ? wt.name.replace('근무형태', '') : '-'}
                              </button>

                              {isEditing && (
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, zIndex: 50,
                                  background: '#fff', border: '1px solid var(--glass-border)',
                                  borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                  padding: 8, minWidth: 130,
                                }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                                    {staff.name} · {month}/{day}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <button onClick={() => { setEntry(staff.id, day, null, false); setEditCell(null); }}
                                      style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(0,0,0,0.08)', background: !entry || (!entry.isOff && !entry.typeId) ? 'rgba(124,106,247,0.1)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                                      — 미설정
                                    </button>
                                    <button onClick={() => { setEntry(staff.id, day, null, true); setEditCell(null); }}
                                      style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: entry?.isOff ? 'rgba(239,68,68,0.12)' : '#fff', cursor: 'pointer', textAlign: 'left', color: '#dc2626' }}>
                                      🔴 휴무
                                    </button>
                                    {workTypes.map(wt2 => (
                                      <button key={wt2.id} onClick={() => { setEntry(staff.id, day, wt2.id, false); setEditCell(null); }}
                                        style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: `1px solid ${wt2.color}88`, background: entry?.typeId === wt2.id ? `${wt2.color}33` : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: wt2.color, flexShrink: 0 }} />
                                        {wt2.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {editCell && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setEditCell(null)} />
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
            매니저를 추가하면 스케줄 입력이 가능합니다
          </div>
        )}
      </div>
    </div>
  );
}
