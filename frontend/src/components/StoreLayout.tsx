import { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storesApi } from '../services/stores';

const navItems = [
  { to: 'dashboard', label: '대시보드', icon: '📊' },
  { to: 'quotes', label: '견적', icon: '📝' },
  { to: 'contracts', label: '계약', icon: '📄' },
  { to: 'consults', label: '상담', icon: '💬' },
  { to: 'memos', label: '메모', icon: '📌' },
  { to: 'issues', label: '이슈', icon: '⚠️' },
  { to: 'staffs', label: '직원', icon: '👤' },
  { to: 'schedules', label: '스케줄', icon: '📅' },
  { to: 'deliveries', label: '배송', icon: '🚚' },
];

export default function StoreLayout() {
  const { storeId } = useParams<{ storeId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState<string>(() => {
    return user?.stores.find((s) => s.storeId === storeId)?.storeName ?? '';
  });

  useEffect(() => {
    if (storeName || !storeId) return;
    storesApi.getOne(storeId).then((s) => setStoreName(s.name)).catch(() => setStoreName('매장'));
  }, [storeId, storeName]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1e293b', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{storeName}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{user?.name}</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`/store/${storeId}/${item.to}`}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                color: isActive ? '#fff' : '#94a3b8', background: isActive ? '#334155' : 'transparent',
                textDecoration: 'none', fontSize: 14, transition: 'background 0.15s',
              })}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid #334155' }}>
          <button onClick={() => navigate('/stores')} style={{ width: '100%', padding: '8px 0', background: '#475569', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, marginBottom: 8 }}>
            매장 변경
          </button>
          <button onClick={logout} style={{ width: '100%', padding: '8px 0', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f8fafc', padding: 24, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
