import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HqWorkRecordsTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: storesData = [], isLoading } = useQuery({
    queryKey: ['hq-work-records', year, month],
    queryFn: () => api.get(`/work-records/hq/all?year=${year}&month=${month}`).then((r) => r.data),
  });

  const stores = (storesData as any[]).filter((s: any) => s.showOnLogin !== false);

  // 일자별 총 근무 인원 계산
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const dailyTotals: Record<number, { total: number; stores: { name: string; count: number; staffs: string[] }[] }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const storeBreakdown: { name: string; count: number; staffs: string[] }[] = [];
    let total = 0;
    stores.forEach((s: any) => {
      const working = (s.staffs ?? []).filter((staff: any) =>
        (staff.workRecords ?? []).some((r: any) => {
          const rd = new Date(r.workDate).getDate();
          return rd === d && !r.isOff;
        })
      );
      if (working.length > 0) {
        storeBreakdown.push({ name: s.name, count: working.length, staffs: working.map((st: any) => st.name) });
        total += working.length;
      }
    });
    dailyTotals[d] = { total, stores: storeBreakdown };
  }

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const selectedInfo = selectedDay ? dailyTotals[selectedDay] : null;

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 80 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
          날짜를 클릭하면 점별 근무 인원을 확인할 수 있어요
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* 캘린더 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>{year}년 {month}월 일자별 근무 현황</div>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
          ) : (
            <>
              {/* 요일 헤더 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                {WEEKDAYS.map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '6px 0', color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'var(--text-muted)' }}>
                    {d}
                  </div>
                ))}
              </div>
              {/* 날짜 셀 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {calendarCells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;
                  const info = dailyTotals[day];
                  const isSelected = selectedDay === day;
                  const dow = (firstDayOfWeek + day - 1) % 7;
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  const hasWorkers = info.total > 0;
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      style={{
                        borderRadius: 10,
                        padding: '8px 4px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(200,149,108,0.15)' : hasWorkers ? 'rgba(124,106,247,0.04)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: isSun ? '#ef4444' : isSat ? '#3b82f6' : 'var(--text)', marginBottom: 4 }}>
                        {day}
                      </div>
                      {hasWorkers ? (
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                          {info.total}명
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.2)' }}>-</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 점별 근무 인원 섹터 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
            {selectedDay ? `${month}월 ${selectedDay}일 점별 근무` : '점별 근무 인원'}
          </div>
          {!selectedDay ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              캘린더에서 날짜를 선택하세요
            </div>
          ) : selectedInfo && selectedInfo.total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                총 <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{selectedInfo.total}명</span> 근무
              </div>
              {selectedInfo.stores.map((s) => (
                <div key={s.name} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>{s.count}명</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {s.staffs.map((name) => (
                      <span key={name} style={{ fontSize: 11, background: 'rgba(200,149,108,0.15)', color: 'var(--accent)', borderRadius: 6, padding: '3px 8px' }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              이 날 근무 기록 없음
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
