import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export default function WorkRecordsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [editing, setEditing] = useState<{ staffId: string; date: number } | null>(null);
  const [form, setForm] = useState({ startTime: '', endTime: '', totalHours: '', isOff: false, offReason: '', notes: '' });

  const { data: staffsData = [], isLoading } = useQuery({
    queryKey: ['work-records', storeId, year, month],
    queryFn: () => api.get(`/work-records/store/${storeId}?year=${year}&month=${month}`).then((r) => r.data),
    enabled: !!storeId,
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: any) => api.post(`/work-records/store/${storeId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-records', storeId, year, month] });
      setEditing(null);
    },
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const staffs = staffsData as any[];

  const openEdit = (staffId: string, date: number, existing?: any) => {
    setEditing({ staffId, date });
    setForm({
      startTime: existing?.startTime ?? '',
      endTime: existing?.endTime ?? '',
      totalHours: existing?.totalHours?.toString() ?? '',
      isOff: existing?.isOff ?? false,
      offReason: existing?.offReason ?? '',
      notes: existing?.notes ?? '',
    });
  };

  const handleSave = () => {
    if (!editing) return;
    const workDate = `${year}-${String(month).padStart(2, '0')}-${String(editing.date).padStart(2, '0')}`;
    upsertMutation.mutate({
      staffId: editing.staffId,
      workDate,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      totalHours: form.totalHours ? parseFloat(form.totalHours) : null,
      isOff: form.isOff,
      offReason: form.offReason || null,
      notes: form.notes || null,
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>근무기록</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : staffs.length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          등록된 직원이 없습니다. 직원 탭에서 먼저 직원을 추가해주세요.
        </div>
      ) : (
        <div className="glass" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 100, position: 'sticky', left: 0, background: 'rgba(8,8,24,0.95)', zIndex: 1 }}>직원</th>
                {days.map((d) => {
                  const dow = new Date(year, month - 1, d).getDay();
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  return (
                    <th key={d} style={{ textAlign: 'center', minWidth: 38, padding: '8px 2px', fontSize: 11, color: isSun ? '#f87171' : isSat ? '#93c5fd' : 'var(--text-muted)' }}>
                      {d}
                    </th>
                  );
                })}
                <th style={{ textAlign: 'right', minWidth: 70 }}>합계</th>
              </tr>
            </thead>
            <tbody>
              {staffs.map((staff: any) => {
                const recordMap: Record<number, any> = {};
                (staff.workRecords ?? []).forEach((r: any) => {
                  const d = new Date(r.workDate).getDate();
                  recordMap[d] = r;
                });
                const totalHours = Object.values(recordMap).reduce((sum: number, r: any) => sum + Number(r.totalHours ?? 0), 0);
                const workDays = Object.values(recordMap).filter((r: any) => !r.isOff).length;
                const offDays = Object.values(recordMap).filter((r: any) => r.isOff).length;

                return (
                  <tr key={staff.id}>
                    <td style={{ fontWeight: 600, fontSize: 13, position: 'sticky', left: 0, background: 'rgba(8,8,24,0.95)', zIndex: 1 }}>
                      <div>{staff.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>근{workDays} 휴{offDays}</div>
                    </td>
                    {days.map((d) => {
                      const r = recordMap[d];
                      return (
                        <td key={d} style={{ textAlign: 'center', padding: '4px 2px', cursor: 'pointer' }}
                          onClick={() => openEdit(staff.id, d, r)}>
                          {r ? (
                            r.isOff
                              ? <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>휴</span>
                              : <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>{r.totalHours ? `${r.totalHours}h` : '●'}</span>
                          ) : (
                            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.1)' }}>+</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--accent2)', fontWeight: 600 }}>
                      {totalHours.toFixed(1)}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 편집 모달 */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass" style={{ padding: 28, width: 340 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {staffs.find((s: any) => s.id === editing.staffId)?.name} — {month}/{editing.date}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>근무 정보 입력</div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.isOff} onChange={(e) => setForm({ ...form, isOff: e.target.checked })} style={{ width: 'auto', accentColor: 'var(--accent)' }} />
              휴무일
            </label>

            {form.isOff ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>휴무 사유</label>
                <input value={form.offReason} onChange={(e) => setForm({ ...form, offReason: e.target.value })} placeholder="연차, 병가 등" />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>출근</label>
                    <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>퇴근</label>
                    <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>근무 시간 (시간)</label>
                  <input type="number" step="0.5" min="0" max="24" value={form.totalHours} onChange={(e) => setForm({ ...form, totalHours: e.target.value })} placeholder="예: 8.5" />
                </div>
              </>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>메모</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="선택사항" />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(null)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
