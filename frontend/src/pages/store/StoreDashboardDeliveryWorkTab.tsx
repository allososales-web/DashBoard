import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function pad2(n: number) { return String(n).padStart(2, '0'); }

interface WorkType { id: string; name: string; startTime: string; endTime: string; color: string; }
interface StaffMember { id: string; name: string; }
interface WorkEntry { staffId: string; day: number; typeId: string | null; isOff: boolean; }

// 근무형태별 파스텔 색상
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
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [appliedUrl, setAppliedUrl] = useState('');
  const [deliveryView, setDeliveryView] = useState<'calendar' | 'list'>('calendar');

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
  // 캘린더 뷰: 선택된 날짜 셀 편집 팝업
  const [editCell, setEditCell] = useState<{ day: number; staffId: string } | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // 캘린더 셀 배열 (null = 빈 칸)
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

  const deliveryListItems = useMemo(() => {
    if (!appliedUrl) return [];
    return [
      { id: 1, customer: '홍길동', product: 'SATI 3인 소파', dueDate: `${year}-${pad2(month)}-05`, status: '납기 예정' },
      { id: 2, customer: '김철수', product: 'QUERENCIA 2인 소파', dueDate: `${year}-${pad2(month)}-12`, status: '배송 중' },
      { id: 3, customer: '이영희', product: 'MILO 1인 소파', dueDate: `${year}-${pad2(month)}-18`, status: '납기 완료' },
    ];
  }, [appliedUrl, year, month]);

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>납기 & 근무 현황</div>

      {/* ── 고객 납기 현황 ── */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>고객 납기 현황</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['calendar', 'list'] as const).map(v => (
              <button key={v} onClick={() => setDeliveryView(v)}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: deliveryView === v ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
                  color: deliveryView === v ? '#fff' : 'var(--text-muted)', fontWeight: deliveryView === v ? 700 : 400 }}>
                {v === 'calendar' ? '📅 캘린더' : '📋 리스트'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input value={deliveryUrl} onChange={e => setDeliveryUrl(e.target.value)} placeholder="구글 스프레드시트 URL 입력" style={{ flex: 1 }} />
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap' }} onClick={() => setAppliedUrl(deliveryUrl)} disabled={!deliveryUrl}>적용</button>
        </div>
        {deliveryView === 'calendar' ? (
          appliedUrl ? (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <iframe src={appliedUrl.replace('/edit', '/preview')} style={{ width: '100%', height: 400, border: 'none' }} title="납기 현황" />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
              구글 스프레드시트 URL을 입력하고 적용 버튼을 눌러주세요
            </div>
          )
        ) : (
          deliveryListItems.length > 0 ? (
            <table>
              <thead><tr><th>고객명</th><th>제품</th><th>납기일</th><th>상태</th></tr></thead>
              <tbody>
                {deliveryListItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.customer}</td>
                    <td>{item.product}</td>
                    <td>{item.dueDate}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, fontWeight: 600,
                        background: item.status === '납기 완료' ? 'rgba(16,185,129,0.12)' : item.status === '배송 중' ? 'rgba(124,106,247,0.12)' : 'rgba(245,158,11,0.12)',
                        color: item.status === '납기 완료' ? 'var(--success)' : item.status === '배송 중' ? 'var(--accent)' : 'var(--warning)' }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
              URL을 적용하면 납기 리스트가 표시됩니다
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
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={saveSchedule} disabled={saving}>
              {saving ? '저장 중...' : '저장 (본사 동기화)'}
            </button>
          </div>
        </div>

        {/* 근무형태 + 매니저 설정 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>근무형태 설정</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {workTypes.map((wt, idx) => (
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

        {/* ── 월간 캘린더 뷰 ── */}
        {staffList.length > 0 ? (
          <div>
            {/* 범례 */}
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

            {/* 캘린더 그리드 */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 560 }}>
                {/* 요일 헤더 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                  {WEEKDAYS.map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '6px 0',
                      color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* 날짜 셀 */}
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
                        {/* 날짜 숫자 */}
                        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: isToday ? 800 : 600,
                          color: isToday ? 'var(--accent)' : isSun ? '#ef4444' : isSat ? '#3b82f6' : 'var(--text)',
                          marginBottom: 4 }}>
                          {day}
                        </div>

                        {/* 매니저별 근무 배지 */}
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

                              {/* 편집 드롭다운 팝업 */}
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
                                    {workTypes.map(wt => (
                                      <button key={wt.id} onClick={() => { setEntry(staff.id, day, wt.id, false); setEditCell(null); }}
                                        style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: `1px solid ${wt.color}88`, background: entry?.typeId === wt.id ? `${wt.color}33` : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: wt.color, flexShrink: 0 }} />
                                        {wt.name}
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

            {/* 닫기 오버레이 */}
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
