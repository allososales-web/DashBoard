import { useState, useRef, useEffect } from 'react';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
function pad2(n: number) { return String(n).padStart(2, '0'); }
function toStr(y: number, m: number, d: number) { return `${y}-${pad2(m)}-${pad2(d)}`; }

interface Props {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function MiniDatePicker({ value, onChange, placeholder = '날짜 선택' }: Props) {
  const now = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() + 1 : now.getMonth() + 1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const select = (day: number) => {
    onChange(toStr(viewYear, viewMonth, day));
    setOpen(false);
  };

  const prevMonth = () => { if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); } else setViewMonth(m => m + 1); };

  const displayValue = parsed
    ? `${parsed.getFullYear()}.${pad2(parsed.getMonth() + 1)}.${pad2(parsed.getDate())}`
    : '';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8, padding: '5px 10px', color: displayValue ? '#fff' : 'rgba(255,255,255,0.35)',
        fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 120,
      }}>
        <span style={{ fontSize: 13 }}>📅</span>
        {displayValue || placeholder}
        {displayValue && (
          <span onClick={e => { e.stopPropagation(); onChange(''); }} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1 }}>×</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12, padding: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          width: 240,
        }}>
          {/* 월 네비게이션 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{viewYear}년 {viewMonth}월</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>›</button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {WD.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '2px 0', color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'rgba(255,255,255,0.4)' }}>{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dow = (firstDow + day - 1) % 7;
              const dateStr = toStr(viewYear, viewMonth, day);
              const isSelected = dateStr === value;
              const isToday = dateStr === toStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
              return (
                <div key={day} onClick={() => select(day)} style={{
                  textAlign: 'center', fontSize: 11, padding: '5px 2px', borderRadius: 6, cursor: 'pointer',
                  background: isSelected ? 'var(--accent)' : isToday ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isSelected ? '#fff' : dow === 0 ? '#f87171' : dow === 6 ? '#60a5fa' : '#e5e7eb',
                  fontWeight: isSelected || isToday ? 700 : 400,
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(255,255,255,0.1)' : 'transparent'; }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
