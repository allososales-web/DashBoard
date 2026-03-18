import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role, StorePermission } from '../types/auth.types';
import { storesApi } from '../services/stores';

export default function StoreSelectionPage() {
  const { user, selectStore, logout } = useAuth();
  const navigate = useNavigate();
  const [allStores, setAllStores] = useState<StorePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isHqAdmin = user?.role === Role.HQ_ADMIN;
  const userStores = user?.stores || [];

  // HQ_ADMIN: fetch all stores from API if no store permissions assigned
  useEffect(() => {
    if (!isHqAdmin || userStores.length > 0) return;
    setLoading(true);
    storesApi
      .getAll({ limit: 100 })
      .then((res) => {
        setAllStores(
          res.data.map((s) => ({
            storeId: s.id,
            storeName: s.name,
            permissionLevel: 'MANAGE' as StorePermission['permissionLevel'],
          })),
        );
      })
      .catch(() => setError('매장 목록을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [isHqAdmin, userStores.length]);

  if (!user) return null;

  const stores = userStores.length > 0 ? userStores : allStores;

  const handleSelect = (storeId: string) => {
    selectStore(storeId);
    navigate(`/store/${storeId}/dashboard`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 32 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>매장 선택</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: '#6b7280' }}>{user.name} ({user.role})</span>
            <button onClick={logout} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
              로그아웃
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, textAlign: 'center', color: '#6b7280' }}>
            매장 목록을 불러오는 중...
          </div>
        ) : error ? (
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, textAlign: 'center', color: '#e53e3e' }}>
            {error}
          </div>
        ) : stores.length === 0 ? (
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, textAlign: 'center', color: '#6b7280' }}>
            접근 가능한 매장이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {stores.map((s) => (
              <button
                key={s.storeId}
                onClick={() => handleSelect(s.storeId)}
                style={{
                  background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb',
                  cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: 18, fontWeight: 600 }}>{s.storeName}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>권한: {s.permissionLevel}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
