import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export default function HqWorkRecordsTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const { data: storesData = [], isLoading } = useQuery({
    queryKey: ['hq-work-records', year, month],
    queryFn: () => api.get(`/work-records/hq/all?year=${year}&month=${month}`).then((r) => r.data),
  });

  const stores = storesData as any[];
  const displayStore = selectedStore ? stores.find((s: any) => s.id === selectedStore) : null;

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
        </select>
        <select value={selectedStore ?? ''} onChange={(e) => setSelectedStore(e.target.value || null)} style={{ width: 160 }}>
          <option value="">전체 매장</option>
          {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
      ) : selectedStore && displayStore ? (
        <StoreWorkTable store={displayStore} days={days} year={year} month={month} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stores.map((s: any) => (
            <div key={s.id} className="glass" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>직원 {s.staffs?.length ?? 0}명</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {(s.staffs ?? []).map((staff: any) => {
                  const workDays = staff.workRecords?.filter((r: any) => !r.isOff).length ?? 0;
                  const offDays = staff.workRecords?.filter((r: any) => r.isOff).length ?? 0;
                  const totalHours = staff.workRecords?.reduce((sum: number, r: any) => sum + Number(r.totalHours ?? 0), 0) ?? 0;
                  return (
                    <div key={staff.id} className="glass-sm" style={{ padding: '10px 14px', minWidth: 140 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{staff.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>근무 {workDays}일 · 휴무 {offDays}일</div>
                      <div style={{ fontSize: 11, color: 'var(--accent2)' }}>{totalHours.toFixed(1)}시간</div>
                    </div>
                  );
                })}
                {(!s.staffs || s.staffs.length === 0) && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>등록된 직원 없음</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StoreWorkTable({ store, days, year, month }: { store: any; days: number[]; year: number; month: number }) {
  return (
    <div className="glass" style={{ padding: 0, overflow: 'auto' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)', fontWeight: 600 }}>
        {store.name} — {year}년 {month}월 근무표
      </div>
      <table style={{ minWidth: 800 }}>
        <thead>
          <tr>
            <th style={{ minWidth: 100 }}>직원</th>
            {days.map((d) => <th key={d} style={{ textAlign: 'center', minWidth: 36, padding: '8px 4px', fontSize: 11 }}>{d}</th>)}
            <th style={{ textAlign: 'right' }}>합계</th>
          </tr>
        </thead>
        <tbody>
          {(store.staffs ?? []).map((staff: any) => {
            const recordMap: Record<number, any> = {};
            (staff.workRecords ?? []).forEach((r: any) => {
              const d = new Date(r.workDate).getDate();
              recordMap[d] = r;
            });
            const totalHours = Object.values(recordMap).reduce((sum: number, r: any) => sum + Number(r.totalHours ?? 0), 0);
            return (
              <tr key={staff.id}>
                <td style={{ fontWeight: 500, fontSize: 13 }}>{staff.name}</td>
                {days.map((d) => {
                  const r = recordMap[d];
                  return (
                    <td key={d} style={{ textAlign: 'center', padding: '6px 2px', fontSize: 11 }}>
                      {r ? (r.isOff ? <span style={{ color: 'var(--warning)' }}>휴</span> : <span style={{ color: 'var(--success)' }}>●</span>) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--accent2)' }}>{totalHours.toFixed(1)}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
