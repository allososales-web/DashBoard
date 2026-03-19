import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function pad2(n: number) { return String(n).padStart(2, '0'); }

interface WorkType { id: string; name: string; startTime: string; endTime: string; }
interface StaffMember { id: string; name: string; }
interface WorkEntry { staffId: string; day: number; typeId: string | null; isOff: boolean; }

export default function StoreDashboardDeliveryWorkTab() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const qc = useQueryClient();

  // ── 납기 현황 상태 ──
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [appliedUrl, setAppliedUrl] = useState('');
  const [dPlusDays, setDPlusDays] = useState(3);

  // ── 근무 스케줄 상태 ──
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([
    { id: 'A', name: '근무형태A', startTime: '10:01', endTime: '20:59' },
    { id: 'B', name: '근무형태B', startTime: '12:30', endTime: '22:30' },
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
  const [saving, setSaving] = useState(false);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const calendarDays = useMemo(() => {
    const cells: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
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
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (!bulkOffDays.includes(d) && dow !== 0) days.push(d);
    }
    days.forEach(d => setEntry(staffId, d, selectedType, false));
  }

  function applyBulkOff(staffId: string) {
    bulkOffDays.forEach(d => setEntry(staffId, d, null, true));
    // 일요일 자동 휴무
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow === 0) setEntry(staffId, d, null, true);
    }
  }

  async function saveSchedule() {
    setSaving(true);
    try {
      const records = workEntries.map(e => ({
        storeId,
        staffName: staffList.find(s => s.id === e.staffId)?.name ?? '',
        workDate: `${year}-${pad2(month)}-${pad2(e.day)}`,
        isOff: e.isOff,
        workTypeName: e.typeId ? (workTypes.find(t => t.id === e.typeId)?.name ?? '') : '',
        startTime: e.typeId ? (workTypes.find(t => t.id === e.typeId)?.startTime ?? '') : '',
        endTime: e.typeId ? (workTypes.find(t => t.id === e.typeId)?.endTime ?? '') : '',
      }));
      await api.post('/work-records/bulk', { storeId, year, month, records });
      qc.invalidateQueries({ queryKey: ['hq-work-records'] });
      alert('근무 스케줄이 저장되었습니다.');
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>납기 & 근무 현황</div>

      {/* ── 고객 납기 현황 ── */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>고객 납기 현황</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input value={deliveryUrl} onChange={e => setDeliveryUrl(e.target.value)} placeholder="구글 스프레드시트 URL 입력"
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }} />
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap' }} onClick={() => setAppliedUrl(deliveryUrl)} disabled={!deliveryUrl}>
            적용
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>D+ 기준일:</span>
          <input type="number" value={dPlusDays} onChange={e => setDPlusDays(Number(e.target.value))} min={1} max={30}
            style={{ width: 60, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13, textAlign: 'center' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>일 이내 납기 건 관리</span>
        </div>
        {appliedUrl ? (
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <iframe src={appliedUrl.replace('/edit', '/preview')} style={{ width: '100%', height: 400, border: 'none' }} title="납기 현황" />
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0', background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
            구글 스프레드시트 URL을 입력하고 적용 버튼을 눌러주세요
          </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* 근무형태 관리 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>근무형태 설정</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {workTypes.map(wt => (
                <div key={wt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{wt.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{wt.startTime} ~ {wt.endTime}</span>
                  </div>
                  <button onClick={() => setWorkTypes(prev => prev.filter(t => t.id !== wt.id))} style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="형태명 (예: 근무형태C)"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="time" value={newTypeStart} onChange={e => setNewTypeStart(e.target.value)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 12 }} />
                <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>~</span>
                <input type="time" value={newTypeEnd} onChange={e => setNewTypeEnd(e.target.value)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 12 }} />
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => {
                if (!newTypeName || !newTypeStart || !newTypeEnd) return;
                setWorkTypes(prev => [...prev, { id: Date.now().toString(), name: newTypeName, startTime: newTypeStart, endTime: newTypeEnd }]);
                setNewTypeName(''); setNewTypeStart(''); setNewTypeEnd('');
              }}>+ 형태 추가</button>
            </div>
          </div>

          {/* 매니저 관리 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>매니저 관리</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {staffList.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12 }}>{s.name}</span>
                  <button onClick={() => setStaffList(prev => prev.filter(st => st.id !== s.id))} style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                </div>
              ))}
              {staffList.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>매니저를 추가하세요</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="매니저 이름"
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12 }} />
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => {
                if (!newStaffName.trim()) return;
                setStaffList(prev => [...prev, { id: Date.now().toString(), name: newStaffName.trim() }]);
                setNewStaffName('');
              }}>추가</button>
            </div>
          </div>
        </div>

        {/* 일괄 적용 설정 */}
        {staffList.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>일괄 적용 설정</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>근무형태:</span>
                <select value={selectedType ?? ''} onChange={e => setSelectedType(e.target.value || null)} style={{ fontSize: 12, padding: '4px 8px' }}>
                  <option value="">선택</option>
                  {workTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>대상 매니저:</span>
                <select value={selectedStaff ?? ''} onChange={e => setSelectedStaff(e.target.value || null)} style={{ fontSize: 12, padding: '4px 8px' }}>
                  <option value="">선택</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { if (selectedStaff) applyBulkType(selectedStaff); }}>근무형태 일괄 적용</button>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { if (selectedStaff) applyBulkOff(selectedStaff); }}>휴무 일괄 적용</button>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>휴무 일자 선택 (클릭으로 토글):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Array.from({length: daysInMonth}, (_, i) => i+1).map(d => {
                  const dow = new Date(year, month-1, d).getDay();
                  const isOff = bulkOffDays.includes(d) || dow === 0;
                  return (
                    <button key={d} onClick={() => {
                      if (dow === 0) return;
                      setBulkOffDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
                    }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: dow === 0 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600,
                      background: isOff ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)',
                      color: dow === 0 ? '#f87171' : isOff ? '#fca5a5' : 'var(--text-muted)' }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 스케줄 그리드 */}
        {staffList.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: 80, color: 'var(--text-muted)' }}>매니저</th>
                  {Array.from({length: daysInMonth}, (_, i) => i+1).map(d => {
                    const dow = new Date(year, month-1, d).getDay();
                    return (
                      <th key={d} style={{ padding: '4px 2px', textAlign: 'center', minWidth: 32, color: dow===0?'#f87171':dow===6?'#60a5fa':'var(--text-muted)', fontWeight: 600 }}>
                        <div>{d}</div>
                        <div style={{ fontSize: 9 }}>{WEEKDAYS[dow]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <tr key={staff.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '6px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{staff.name}</td>
                    {Array.from({length: daysInMonth}, (_, i) => i+1).map(d => {
                      const entry = getEntry(staff.id, d);
                      const dow = new Date(year, month-1, d).getDay();
                      const isOff = entry?.isOff || dow === 0;
                      const wt = entry?.typeId ? workTypes.find(t => t.id === entry.typeId) : null;
                      return (
                        <td key={d} style={{ padding: '2px', textAlign: 'center' }}>
                          <select value={entry?.isOff ? 'off' : (entry?.typeId ?? '')} onChange={e => {
                            if (e.target.value === 'off') setEntry(staff.id, d, null, true);
                            else if (e.target.value === '') setEntry(staff.id, d, null, false);
                            else setEntry(staff.id, d, e.target.value, false);
                          }} style={{ width: 44, fontSize: 9, padding: '2px 1px', borderRadius: 4, border: 'none', cursor: 'pointer',
                            background: isOff ? 'rgba(239,68,68,0.2)' : wt ? 'rgba(200,149,108,0.2)' : 'rgba(255,255,255,0.05)',
                            color: isOff ? '#fca5a5' : wt ? 'var(--accent)' : 'var(--text-muted)' }}>
                            <option value="">-</option>
                            <option value="off">휴무</option>
                            {workTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name.replace('근무형태', '')}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {staffList.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>매니저를 추가하면 스케줄 입력이 가능합니다</div>
        )}
      </div>
    </div>
  );
}
