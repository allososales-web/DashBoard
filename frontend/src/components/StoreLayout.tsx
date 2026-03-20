import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// SVG 아이콘 컴포넌트
function IconDashboard({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#9ca3af';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="2" fill={c} opacity="0.9"/>
      <rect x="14" y="3" width="7" height="7" rx="2" fill={c} opacity="0.55"/>
      <rect x="3" y="14" width="7" height="7" rx="2" fill={c} opacity="0.55"/>
      <rect x="14" y="14" width="7" height="7" rx="2" fill={c} opacity="0.9"/>
    </svg>
  );
}

function IconAnalysis({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#9ca3af';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 17l4-5 4 3 4-6 4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="19" width="18" height="1.5" rx="0.75" fill={c} opacity="0.4"/>
      <circle cx="7" cy="12" r="1.5" fill={c}/>
      <circle cx="11" cy="15" r="1.5" fill={c}/>
      <circle cx="15" cy="9" r="1.5" fill={c}/>
      <circle cx="19" cy="13" r="1.5" fill={c}/>
    </svg>
  );
}

function IconIssue({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#9ca3af';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={c}/>
    </svg>
  );
}

function IconDelivery({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#9ca3af';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M21 10l-4-6H7L3 10" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="10" width="18" height="9" rx="2" stroke={c} strokeWidth="1.8"/>
      <path d="M8 19v2M16 19v2" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8.5" cy="10" r="1" fill={c}/>
      <circle cx="15.5" cy="10" r="1" fill={c}/>
    </svg>
  );
}

function IconMetrics({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#9ca3af';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="1.8"/>
      <path d="M7 8h10M7 12h7M7 16h5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="19" cy="16" r="2.5" fill={c} opacity="0.8"/>
      <path d="M18.2 15.8l1.2 1.2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

const navItems = [
  { to: 'dashboard',     label: '대시보드',   Icon: IconDashboard },
  { to: 'analysis',      label: '매장 분석',  Icon: IconAnalysis },
  { to: 'store-issue',   label: '매장 이슈',  Icon: IconIssue },
  { to: 'delivery-work', label: '납기 & 근무', Icon: IconDelivery },
  { to: 'metrics-input', label: '수치 입력',  Icon: IconMetrics },
];

// 모바일 탭바용 이모지 (작은 화면에서는 단순하게)
const mobileIcons: Record<string, string> = {
  dashboard: '⊞',
  analysis: '↗',
  'store-issue': '△',
  'delivery-work': '▣',
  'metrics-input': '✎',
};

export default function StoreLayout() {
  const { storeId } = useParams<{ storeId: string }>();
  const { storeName, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="store-sidebar" style={{
        width: 210,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
        boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ padding: '22px 18px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #7c6af7, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Alloso
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {storeName}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '10px 0' }}>
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={`/store/${storeId}/${to}`}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 16px', margin: '2px 10px', borderRadius: 10,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'rgba(124,106,247,0.09)' : 'transparent',
                textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 700 : 400,
                transition: 'all 0.15s',
                borderLeft: isActive ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 0' }}>
            매장 변경
          </button>
          <button onClick={logout} className="btn btn-danger" style={{ width: '100%', fontSize: 12, padding: '8px 0' }}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="store-main" style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      {/* 모바일 하단 탭바 */}
      <nav className="mobile-bottom-nav">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={`/store/${storeId}/${to}`}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="mobile-nav-icon">{mobileIcons[to]}</span>
            <span className="mobile-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
