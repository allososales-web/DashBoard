import { useState } from 'react';
import HqPerformanceTab from './tabs/HqPerformanceTab';
import HqStoreStatusTab from './tabs/HqStoreStatusTab';
import HqWorkRecordsTab from './tabs/HqWorkRecordsTab';
import HqGoalEventTab from './tabs/HqGoalEventTab';
import HqAdminTab from './tabs/HqAdminTab';

const TABS = [
  { id: 'performance', label: '브랜드 실적' },
  { id: 'store-status', label: '매장별 현황' },
  { id: 'work', label: '근무 현황' },
  { id: 'goal-event', label: '목표·행사 관리' },
  { id: 'admin', label: '관리자' },
];

export default function HqDashboardPage() {
  const [tab, setTab] = useState('performance');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>본사 대시보드</h1>
        <div style={{
          display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexWrap: 'nowrap', width: '100%',
          gap: 2, padding: 4, background: '#cdd0c8', borderRadius: 12,
          boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.18), inset -2px -2px 6px rgba(255,255,255,0.75)',
          boxSizing: 'border-box',
        }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: tab === t.id ? '#f4f6f1' : 'transparent',
                color: tab === t.id ? '#8b7cf8' : '#5a6358',
                boxShadow: tab === t.id ? '3px 3px 8px rgba(0,0,0,0.14), -2px -2px 6px rgba(255,255,255,0.85)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'performance' && <HqPerformanceTab />}
      {tab === 'store-status' && <HqStoreStatusTab />}
      {tab === 'work' && <HqWorkRecordsTab />}
      {tab === 'goal-event' && <HqGoalEventTab />}
      {tab === 'admin' && <HqAdminTab />}
    </div>
  );
}
