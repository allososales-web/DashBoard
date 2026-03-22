import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import allosoLogo from '../assets/Alloso_LOGO_Basic (1).jpg';

export default function HqLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        height: 58,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={allosoLogo} alt="Alloso" style={{ height: 28, mixBlendMode: 'multiply', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="hide-mobile" style={{ fontSize: 12, color: 'var(--text-muted)' }}>본사 관리자</span>
            <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>매장 변경</button>
            <button onClick={logout} className="btn btn-danger" style={{ fontSize: 12, padding: '6px 14px' }}>로그아웃</button>
          </div>
        </div>
      </header>
      <main style={{ padding: '28px 40px' }} className="hq-main">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
