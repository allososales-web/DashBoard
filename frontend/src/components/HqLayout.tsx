import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import allosoLogo from '../assets/Alloso_LOGO_Basic (1).jpg';

// SVG 아이콘
function IconPerformance({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#aaa9a0';
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M3 17l4-5 4 3 4-6 4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="19" width="18" height="1.5" rx="0.75" fill={c} opacity="0.4"/>
    </svg>
  );
}
function IconStore({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#aaa9a0';
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="2" fill={c} opacity="0.9"/>
      <rect x="14" y="3" width="7" height="7" rx="2" fill={c} opacity="0.55"/>
      <rect x="3" y="14" width="7" height="7" rx="2" fill={c} opacity="0.55"/>
      <rect x="14" y="14" width="7" height="7" rx="2" fill={c} opacity="0.9"/>
    </svg>
  );
}
function IconWork({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#aaa9a0';
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth="1.8"/>
      <path d="M8 2v4M16 2v4M3 10h18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconGoal({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#aaa9a0';
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="5" stroke={c} strokeWidth="1.8" opacity="0.6"/>
      <circle cx="12" cy="12" r="2" fill={c}/>
    </svg>
  );
}
function IconAdmin({ active }: { active?: boolean }) {
  const c = active ? 'var(--accent)' : '#aaa9a0';
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

const navItems = [
  { to: 'performance',  label: '브랜드 실적',   Icon: IconPerformance },
  { to: 'store-status', label: '매장별 현황',   Icon: IconStore },
  { to: 'work',         label: '근무 현황',     Icon: IconWork },
  { to: 'goal-event',   label: '목표·행사 관리', Icon: IconGoal },
  { to: 'admin',        label: '관리자',        Icon: IconAdmin },
];

const mobileIcons: Record<string, string> = {
  performance:  '↗',
  'store-status': '⊞',
  work:         '▣',
  'goal-event': '◎',
  admin:        '👤',
};

export default function HqLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="store-sidebar" style={{
        width: 210,
        background: '#f4f6f1',
        borderRight: 'none',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
        boxShadow: '4px 0 16px rgba(170,178,165,0.30), 1px 0 0 rgba(255,255,255,0.60)',
      }}>
        <div style={{ padding: '22px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <img src={allosoLogo} alt="Alloso" style={{ height: 26, mixBlendMode: 'multiply', objectFit: 'contain', marginBottom: 2 }} />
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>본사 관리자</div>
        </div>

        <nav style={{ flex: 1, padding: '10px 0' }}>
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 16px', margin: '2px 10px', borderRadius: 8,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
                textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
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

        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 0' }}>
            매장 변경
          </button>
          <button onClick={logout} className="btn btn-danger" style={{ width: '100%', fontSize: 12, padding: '8px 0' }}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="store-main hq-main" style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      {/* 모바일 하단 탭바 */}
      <nav className="mobile-bottom-nav">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="mobile-nav-icon">{mobileIcons[to]}</span>
            <span className="mobile-nav-label">{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="mobile-nav-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 10, padding: '6px 4px' }}
        >
          <span className="mobile-nav-icon" style={{ fontSize: 20 }}>⇄</span>
          <span className="mobile-nav-label">매장변경</span>
        </button>
        <button
          onClick={logout}
          className="mobile-nav-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: 'var(--danger)', fontSize: 10, padding: '6px 4px' }}
        >
          <span className="mobile-nav-icon" style={{ fontSize: 20 }}>⏻</span>
          <span className="mobile-nav-label">로그아웃</span>
        </button>
      </nav>
    </div>
  );
}
