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
  id: string; customerName: string; scheduledDate: string;
  status: string; address: string | null; notes: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  SCHEDULED:  { bg: 'rgba(245,158,11,0.12)',  color: '#d97706', label: '납기 예정' },
  IN_TRANSIT: { bg: 'rgba(124,106,247,0.12)', color: 'var(--accent)', label: '배송 중' },
  DELIVERED:  { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: '납기 완료' },
  FAILED:     { bg: 'rgba(239,68,68,0.10)',   color: '#dc2626', label: '실패' },
};

const TYPE_COLORS = ['#b8a4f0','#7dd8b8','#f0a070','#fcd080','#f9a0a0','#a0c4f9','#c4f0a0'];

const WEEK_PATTERNS = [
  { label: '주5일 (월~금)', days: [1,2,3,4,5] },
  { label: '주5일 (화~토)', days: [2,3,4,5,6] },
  { label: '주4일 (월~목)', days: [1,2,3,4] },
  { label: '주4일 (화~금)', days: [2,3,4,5] },
  { label: '주4일 (수~토)', days: [3,4,5,6] },
  { label: '주3일 (월·수·금)', days: [1,3,5] },
  { label: '주6일 (월~토)', days: [1,2,3,4,5,6] },
];

type DayGroupItem = { key: string; name: string; orderNumber?: string; status?: string; address?: string; notes?: string; isSheet: boolean; };
function DayGroup({ day, calMonth, calYear, dow, dowColor, dday, items, preview }:
  { day: number; calMonth: number; calYear: number; dow: string; dowColor: string;
    dday: { label: string; color: string; bg: string }; items: DayGroupItem[]; preview: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, preview);
  const hasMore = items.length > preview;
  return (
    <div style={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
        background: 'rgba(0,0,0,0.025)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: dowColor }}>{calMonth}/{day} ({dow})</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: dday.bg, color: dday.color }}>{dday.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{items.length}건</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {visible.map((item, i) => {
          const s = item.isSheet ? { bg: 'rgba(16,185,129,0.10)', color: '#059669', label: '확정납기' } : (STATUS_STYLE[item.status ?? ''] ?? STATUS_STYLE.SCHEDULED);
          return (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
              borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : undefined,
              background: 'rgba(255,255,255,0.7)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={item.name}>{item.name}</span>
              {item.isSheet && item.orderNumber && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.orderNumber}</span>
              )}
              {!item.isSheet && item.address && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.address}</span>
              )}
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            background: 'rgba(139,124,248,0.04)', border: 'none', borderTop: '1px solid rgba(0,0,0,0.05)',
            cursor: 'pointer', textAlign: 'center' }}>
          {expanded ? '▲ 접기' : `▼ +${items.length - preview}건 더보기`}
        </button>
      )}
    </div>
  );
}

export default function StoreDashboardDeliveryWorkTab() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const qc = useQueryClient();

  // ── 공통 연/월 (통합 캘린더용) ──
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editCell, setEditCell] = useState<{ day: number; staffId: string } | null>(null);

  // ── 납기 URL (제거됨 - iframe 대신 캘린더 수주건명으로 대체) ──

  // ── 근무 스케줄 상태 ──
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

  // ── 납기 데이터 fetch ──
  const startDate = `${calYear}-${pad2(calMonth)}-01`;
  const lastDay   = new Date(calYear, calMonth, 0).getDate();
  const endDate   = `${calYear}-${pad2(calMonth)}-${pad2(lastDay)}`;

  const { data: deliveryData, isLoading: deliveryLoading } = useQuery({
    queryKey: ['deliveries', storeId, calYear, calMonth],
    queryFn: () =>
      api.get(`/stores/${storeId}/deliveries?startDate=${startDate}&endDate=${endDate}&limit=100`)
        .then(r => r.data).catch(() => ({ data: [] })),
    enabled: !!storeId,
  });
  const deliveries: DeliveryItem[] = deliveryData?.data ?? [];

  // ── 구글 시트 납기일정 (수주건명) ──
  const { data: sheetScheduleData } = useQuery({
    queryKey: ['sheet-delivery-schedule', storeId, calYear, calMonth],
    queryFn: () =>
      api.get(`/app-config/delivery-schedule/${storeId}?year=${calYear}&month=${calMonth}`)
        .then(r => r.data).catch(() => ({})),
    enabled: !!storeId,
  });
  const sheetDeliveryByDay: Record<number, { itemName: string; orderNumber: string }[]> = sheetScheduleData ?? {};

  const deliveryByDay = useMemo(() => {
    const map: Record<number, DeliveryItem[]> = {};
    deliveries.forEach(d => {
      const day = new Date(d.scheduledDate).getDate();
      if (!map[day]) map[day] = [];
      map[day].push(d);
    });
    return map;
  }, [deliveries]);

  // ── 캘린더 셀 계산 ──
  const daysInMonth    = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay();
  const calendarCells  = useMemo(() => {
    const cells: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth, daysInMonth, firstDayOfWeek]);

  // ── 근무 helpers ──
  function getEntry(staffId: string, day: number) {
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
      const dow = new Date(calYear, calMonth - 1, d).getDay();
      const isOffDay = bulkOffDays.includes(d) || dow === 0;
      const inPattern = weekPattern ? weekPattern.includes(dow) : dow !== 0;
      if (!isOffDay && inPattern) setEntry(staffId, d, selectedType, false);
    }
  }
  function applyBulkOff(staffId: string) {
    bulkOffDays.forEach(d => setEntry(staffId, d, null, true));
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(calYear, calMonth - 1, d).getDay();
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
      const records = workEntries.map(e => {
        const staffName = staffList.find(s => s.id === e.staffId)?.name ?? '';
        if (!staffName.trim()) return null;
        const wt = e.typeId ? workTypes.find(t => t.id === e.typeId) : null;
        return { staffName: staffName.trim(), workDate: `${calYear}-${pad2(calMonth)}-${pad2(e.day)}`,
          isOff: e.isOff, workTypeName: wt?.name ?? '', startTime: wt?.startTime ?? '', endTime: wt?.endTime ?? '' };
      }).filter((r): r is NonNullable<typeof r> => r !== null);
      await api.post('/work-records/bulk', { storeId, year: calYear, month: calMonth, records });
      qc.invalidateQueries({ queryKey: ['hq-work-records'] });
      alert('근무 스케줄이 저장되었습니다.');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(msg ? `저장 오류: ${Array.isArray(msg) ? msg.join(', ') : msg}` : '저장 중 오류가 발생했습니다.');
    } finally { setSaving(false); }
  }

  // ── 통합 캘린더 렌더 ──
  function renderUnifiedCalendar() {
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 480 }}>
          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '5px 0',
                color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)',
                background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>{d}</div>
            ))}
          </div>
          {/* 날짜 셀 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {calendarCells.map((day, idx) => {
              if (!day) return <div key={idx} style={{ height: 90 + staffList.length * 22 }} />;
              const dow = new Date(calYear, calMonth - 1, day).getDay();
              const isToday = day === now.getDate() && calMonth === now.getMonth() + 1 && calYear === now.getFullYear();
              const isSun = dow === 0; const isSat = dow === 6;
              const delivItems = deliveryByDay[day] ?? [];
              const isSelected = selectedDay === day;

              return (
                <div key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  style={{
                    borderRadius: 8, cursor: 'pointer',
                    border: isSelected ? '2px solid var(--accent)' : isToday ? '2px solid rgba(139,124,248,0.35)' : '1px solid rgba(0,0,0,0.07)',
                    background: isSelected ? 'rgba(139,124,248,0.08)' : isToday ? 'rgba(139,124,248,0.04)' : isSun ? 'rgba(239,68,68,0.02)' : 'rgba(255,255,255,0.7)',
                    padding: '5px 4px',
                    height: 90 + staffList.length * 22,
                    display: 'flex', flexDirection: 'column', gap: 2, transition: 'all 0.12s',
                    overflow: 'hidden',
                  }}>
                  {/* 날짜 숫자 */}
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: isToday ? 800 : 600,
                    color: isToday ? 'var(--accent)' : isSun ? '#ef4444' : isSat ? '#3b82f6' : 'var(--text)' }}>
                    {day}
                  </div>
                  {/* 납기 배지 */}
                  {delivItems.slice(0, 2).map((item, i) => {
                    const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.SCHEDULED;
                    return (
                      <div key={i} style={{ fontSize: 9, fontWeight: 600, padding: '2px 4px', borderRadius: 4,
                        background: s.bg, color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📦 {item.customerName}
                      </div>
                    );
                  })}
                  {delivItems.length > 2 && (
                    <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, textAlign: 'center' }}>+{delivItems.length - 2}</div>
                  )}
                  {/* 수주건명 배지 (구글 시트 납기일정) */}
                  {(sheetDeliveryByDay[day] ?? []).slice(0, 3).map((item, i) => (
                    <div key={`sheet-${i}`}
                      title={item.itemName || item.orderNumber}
                      style={{ fontSize: 9, fontWeight: 600, padding: '2px 4px', borderRadius: 4,
                        background: 'rgba(16,185,129,0.12)', color: '#059669',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        cursor: 'default', maxWidth: '100%' }}>
                      🏭 {item.itemName || item.orderNumber}
                    </div>
                  ))}
                  {(sheetDeliveryByDay[day] ?? []).length > 3 && (
                    <div style={{ fontSize: 9, color: '#059669', fontWeight: 700, textAlign: 'center' }}>+{(sheetDeliveryByDay[day] ?? []).length - 3}</div>
                  )}
                  {/* 근무 배지 */}
                  {staffList.map(staff => {
                    const entry = getEntry(staff.id, day);
                    const isOff = entry?.isOff || isSun;
                    const wt = entry?.typeId ? workTypes.find(t => t.id === entry.typeId) : null;
                    const isEditing = editCell?.day === day && editCell?.staffId === staff.id;
                    return (
                      <div key={staff.id} style={{ position: 'relative' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setEditCell(isEditing ? null : { day, staffId: staff.id }); }}
                          title={`${staff.name}: ${isOff ? '휴무' : wt ? wt.name : '미설정'}`}
                          style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 4,
                            padding: '2px 4px', fontSize: 9, fontWeight: 600, textAlign: 'center',
                            background: isOff ? 'rgba(239,68,68,0.18)' : wt ? `${wt.color}55` : 'rgba(0,0,0,0.05)',
                            color: isOff ? '#dc2626' : wt ? '#333' : 'var(--text-muted)',
                            outline: isEditing ? '2px solid var(--accent)' : 'none',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👤 {staff.name.length > 3 ? staff.name.slice(0,3) : staff.name} {isOff ? '휴' : wt ? wt.name.replace('근무형태','') : '-'}
                        </button>
                        {isEditing && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50,
                            background: '#fff', border: '1px solid var(--glass-border)',
                            borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 8, minWidth: 130 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                              {staff.name} · {calMonth}/{day}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <button onClick={() => { setEntry(staff.id, day, null, false); setEditCell(null); }}
                                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>— 미설정</button>
                              <button onClick={() => { setEntry(staff.id, day, null, true); setEditCell(null); }}
                                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: '#fff', cursor: 'pointer', textAlign: 'left', color: '#dc2626' }}>🔴 휴무</button>
                              {workTypes.map(wt2 => (
                                <button key={wt2.id} onClick={() => { setEntry(staff.id, day, wt2.id, false); setEditCell(null); }}
                                  style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: `1px solid ${wt2.color}88`,
                                    background: entry?.typeId === wt2.id ? `${wt2.color}33` : '#fff', cursor: 'pointer', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', gap: 5 }}>
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
    );
  }

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>납기 & 근무 현황</div>

      {/* ══ 통합 캘린더 ══ */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📅 납기 & 근무 통합 캘린더</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.8)', border: '1.5px solid var(--border)', borderRadius: 99, padding: '4px 10px' }}>
            <button onClick={() => { if (calMonth === 1) { setCalYear(y => y-1); setCalMonth(12); } else setCalMonth(m => m-1); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>‹</button>
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 60, textAlign: 'center', whiteSpace: 'nowrap' }}>{calYear}년 {calMonth}월</span>
            <button onClick={() => { if (calMonth === 12) { setCalYear(y => y+1); setCalMonth(1); } else setCalMonth(m => m+1); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>›</button>
          </div>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.entries(STATUS_STYLE).map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: v.bg, border: `1px solid ${v.color}`, display: 'inline-block' }} />
              <span style={{ color: 'var(--text-muted)' }}>{v.label}</span>
            </span>
          ))}
          {workTypes.map(wt => (
            <span key={wt.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: wt.color, display: 'inline-block' }} />
              <span style={{ color: 'var(--text-muted)' }}>{wt.name}</span>
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>납기 {deliveries.length}건</span>
        </div>

        {deliveryLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>불러오는 중...</div>
        ) : renderUnifiedCalendar()}

        {/* 선택된 날짜 상세 */}
        {selectedDay !== null && (
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(139,124,248,0.04)', borderRadius: 12, border: '1px solid var(--border-accent)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              {calYear}년 {calMonth}월 {selectedDay}일 납기 목록
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
            {/* 수주건명 (구글 시트 납기일정) */}
            {(sheetDeliveryByDay[selectedDay] ?? []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 8 }}>
                  🏭 수주건명 ({(sheetDeliveryByDay[selectedDay] ?? []).length}건)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(sheetDeliveryByDay[selectedDay] ?? []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', color: '#059669', whiteSpace: 'nowrap' }}>확정납기</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.itemName || '(품명 없음)'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>수주번호: {item.orderNumber}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {editCell && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setEditCell(null)} />}
      </div>

      {/* ══ 고객 납기 현황 ══ */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📦 고객 납기 현황</div>
        {(() => {
          // 날짜별 그룹핑
          const today = new Date(); today.setHours(0,0,0,0);
          type GroupItem = { key: string; name: string; orderNumber?: string; status?: string; address?: string; notes?: string; isSheet: boolean; };
          const grouped: Record<number, GroupItem[]> = {};

          // 구글 시트 납기
          Object.entries(sheetDeliveryByDay).forEach(([dayStr, items]) => {
            const d = Number(dayStr);
            if (!grouped[d]) grouped[d] = [];
            items.forEach((item, i) => grouped[d].push({ key: `s${d}-${i}`, name: item.itemName || '(품명 없음)', orderNumber: item.orderNumber, isSheet: true }));
          });
          // 수동 납기
          deliveries.forEach(item => {
            const d = new Date(item.scheduledDate); d.setHours(0,0,0,0);
            const day = d.getDate();
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push({ key: item.id, name: item.customerName, status: item.status, address: item.address ?? undefined, notes: item.notes ?? undefined, isSheet: false });
          });

          const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => {
            const diffA = Math.round((new Date(calYear, calMonth - 1, a).setHours(0,0,0,0) - today.getTime()) / 86400000);
            const diffB = Math.round((new Date(calYear, calMonth - 1, b).setHours(0,0,0,0) - today.getTime()) / 86400000);
            // 미래(diff >= 0): 가까운 순 (D-day → D-1 → D-2 ...)
            // 과거(diff < 0): 미래 뒤에, 최근 과거 먼저
            if (diffA >= 0 && diffB >= 0) return diffA - diffB;
            if (diffA < 0 && diffB < 0) return diffB - diffA;
            return diffA >= 0 ? -1 : 1;
          });
          const totalCount = sortedDays.reduce((s, d) => s + grouped[d].length, 0);

          function getDdayLabel(day: number) {
            const target = new Date(calYear, calMonth - 1, day); target.setHours(0,0,0,0);
            const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
            if (diff === 0) return { label: 'D-day', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' };
            if (diff === 1) return { label: 'D-1', color: '#d97706', bg: 'rgba(245,158,11,0.12)' };
            if (diff === 2) return { label: 'D-2', color: '#d97706', bg: 'rgba(245,158,11,0.08)' };
            if (diff < 0) return { label: `D+${Math.abs(diff)}`, color: '#9ca3af', bg: 'rgba(0,0,0,0.05)' };
            return { label: `D-${diff}`, color: '#6b7280', bg: 'rgba(0,0,0,0.04)' };
          }

          return (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                {calYear}년 {calMonth}월 납기 목록
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>총 {totalCount}건</span>
              </div>
              {totalCount === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
                  이 달 납기 일정이 없습니다
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sortedDays.map(day => {
                    const items = grouped[day];
                    const dow = WEEKDAYS[new Date(calYear, calMonth - 1, day).getDay()];
                    const dowColor = new Date(calYear, calMonth - 1, day).getDay() === 0 ? '#ef4444' : new Date(calYear, calMonth - 1, day).getDay() === 6 ? '#3b82f6' : 'var(--text-muted)';
                    const dday = getDdayLabel(day);
                    const PREVIEW = 2;
                    return (
                      <DayGroup key={day} day={day} calMonth={calMonth} calYear={calYear}
                        dow={dow} dowColor={dowColor} dday={dday} items={items} preview={PREVIEW} />
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* ══ 매장 근무 스케줄 ══ */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>👥 매장 근무 스케줄</div>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={saveSchedule} disabled={saving}>
            {saving ? '저장 중...' : '저장 (본사 동기화)'}
          </button>
        </div>

        {/* 근무형태 + 매니저 설정 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* 근무형태 */}
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>근무형태 설정</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {workTypes.map(wt => (
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

          {/* 매니저 관리 */}
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
              <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="매니저 이름" style={{ flex: 1, fontSize: 12 }}
                onKeyDown={e => { if (e.key === 'Enter' && newStaffName.trim()) { setStaffList(prev => [...prev, { id: Date.now().toString(), name: newStaffName.trim() }]); setNewStaffName(''); }}} />
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
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
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
                {Array.from({length: daysInMonth}, (_,i) => i+1).map(d => {
                  const dow = new Date(calYear, calMonth-1, d).getDay();
                  const isOff = bulkOffDays.includes(d) || dow === 0;
                  return (
                    <button key={d} onClick={() => { if (dow === 0) return; setBulkOffDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]); }}
                      style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: dow === 0 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600,
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

        {staffList.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>
            매니저를 추가하면 위 통합 캘린더에 근무 스케줄이 반영됩니다
          </div>
        )}
      </div>
    </div>
  );
}
