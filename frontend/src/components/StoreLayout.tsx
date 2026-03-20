import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: 'dashboard', label: '대시보드', icon: '◈' },
  { to: 'analysis', label: '매장 분석', icon: '📊' },
  { to: 'store-issue', label: '매장 이슈', icon: '⚡' },
  { to: 'delivery-work', label: '납기 & 근무', icon: '📦' },
  { to: 'metrics-input', label: '수치 입력', icon: '✏️' },
];

export default function StoreLayout() {
  const { storeId } = useParams<{ storeId: string }>();
  const { storeName, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar — 데스크탑 전용 */}
      <aside className="store-sidebar" style={{
        width: 200,
        background: 'rgba(13,10,20,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fff, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Alloso
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {storeName}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`/store/${storeId}/${item.to}`}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', margin: '2px 8px', borderRadius: 10,
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive ? 'rgba(192,132,252,0.18)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 0' }}>
            매장 변경
          </button>
          <button onClick={logout} className="btn btn-danger" style={{ width: '100%', fontSize: 12, padding: '8px 0' }}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="store-main" style={{ flex: 1, padding: 28, overflowY: 'auto', minHeight: '100vh' }}>
        <Outlet />
      </main>

      {/* 모바일 하단 탭바 */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={`/store/${storeId}/${item.to}`}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
