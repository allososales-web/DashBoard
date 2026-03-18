import { useState } from 'react';
import HqPerformanceTab from './tabs/HqPerformanceTab';
import HqWorkRecordsTab from './tabs/HqWorkRecordsTab';
import HqAdminTab from './tabs/HqAdminTab';

const TABS = [
  { id: 'performance', label: '브랜드 실적' },
  { id: 'work', label: '근무 현황' },
  { id: 'admin', label: '관리자' },
];

export default function HqDashboardPage() {
  const [tab, setTab] = useState('performance');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>본사 대시보드</h1>
        <div className="tabs" style={{ display: 'inline-flex' }}>
          {TABS.map((t) => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'performance' && <HqPerformanceTab />}
      {tab === 'work' && <HqWorkRecordsTab />}
      {tab === 'admin' && <HqAdminTab />}
    </div>
  );
}
