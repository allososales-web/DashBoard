import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HqLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #7c6af7, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Alloso
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="hide-mobile" style={{ fontSize: 12, color: 'var(--text-muted)' }}>본사 관리자</span>
          <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>매장 변경</button>
          <button onClick={logout} className="btn btn-danger" style={{ fontSize: 12, padding: '6px 14px' }}>로그아웃</button>
        </div>
      </header>
      <main style={{ padding: '28px 28px 28px 28px' }} className="hq-main">
        <Outlet />
      </main>
    </div>
  );
}
