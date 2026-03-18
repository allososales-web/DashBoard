import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HqLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,24,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fff, var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Alloso
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>본사 관리자</span>
          <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>매장 변경</button>
          <button onClick={logout} className="btn btn-danger" style={{ fontSize: 12, padding: '6px 14px' }}>로그아웃</button>
        </div>
      </header>
      <main style={{ padding: 28 }}>
        <Outlet />
      </main>
    </div>
  );
}
