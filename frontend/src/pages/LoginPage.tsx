import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface StoreItem {
  id: string;
  name: string;
  code: string;
  region?: string;
}

type Step = 'select' | 'pin' | 'change-pin';

export default function LoginPage() {
  const { setAuth, isAuthenticated, role, storeId } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'HQ_ADMIN') navigate('/hq');
      else if (storeId) navigate(`/store/${storeId}/dashboard`);
    }
  }, [isAuthenticated, role, storeId, navigate]);

  useEffect(() => {
    api.get('/auth/stores')
      .then((r) => setStores(r.data))
      .catch(() => setError('매장 목록을 불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectStore = (store: StoreItem) => {
    setSelected({ id: store.id, name: store.name });
    setPin('');
    setError('');
    setStep('pin');
  };

  const handleSelectHq = () => {
    setSelected({ id: 'HQ', name: 'Alloso 본사' });
    setPin('');
    setError('');
    setStep('pin');
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) setPin((p) => p + digit);
  };

  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/auth/pin-login', { storeId: selected!.id, pin });
      if (data.isFirstLogin) {
        setAuth({
          accessToken: data.accessToken,
          role: data.role,
          storeId: data.storeId,
          storeName: data.storeName,
          isFirstLogin: true,
        });
        setPin('');
        setNewPin('');
        setConfirmPin('');
        setStep('change-pin');
      } else {
        setAuth({
          accessToken: data.accessToken,
          role: data.role,
          storeId: data.storeId,
          storeName: data.storeName,
          isFirstLogin: false,
        });
        if (data.role === 'HQ_ADMIN') navigate('/hq');
        else navigate(`/store/${data.storeId}/dashboard`);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'PIN이 올바르지 않습니다');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePinSubmit = async () => {
    if (newPin.length !== 4) { setError('새 PIN은 4자리여야 합니다'); return; }
    if (newPin !== confirmPin) { setError('PIN이 일치하지 않습니다'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/change-pin', { currentPin: pin, newPin });
      // 변경 후 로그인 완료
      const raw = localStorage.getItem('pin_auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAuth({ ...parsed, isFirstLogin: false });
      }
      if (selected?.id === 'HQ') navigate('/hq');
      else navigate(`/store/${selected!.id}/dashboard`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'PIN 변경 실패');
    } finally {
      setSubmitting(false);
    }
  };

  // PIN 4자리 자동 제출
  useEffect(() => {
    if (step === 'pin' && pin.length === 4 && !submitting) {
      handlePinSubmit();
    }
  }, [pin, step]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>Alloso</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>매장 운영 시스템</div>
      </div>

      {step === 'select' && (
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div className="glass" style={{ padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text-muted)' }}>매장을 선택하세요</div>
            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>불러오는 중...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {/* HQ 카드 */}
                <button onClick={handleSelectHq} style={{
                  background: 'linear-gradient(135deg, rgba(124,106,247,0.25), rgba(167,139,250,0.15))',
                  border: '1px solid rgba(124,106,247,0.4)',
                  borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.2s', color: 'var(--text)',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,106,247,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🏢</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>본사</div>
                  <div style={{ fontSize: 11, color: 'var(--accent2)', marginTop: 2 }}>HQ</div>
                </button>

                {stores.map((s) => (
                  <button key={s.id} onClick={() => handleSelectStore(s)} style={{
                    background: 'var(--glass)', border: '1px solid var(--glass-border)',
                    borderRadius: 12, padding: '20px 16px', cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.2s', color: 'var(--text)',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass)'; e.currentTarget.style.transform = ''; }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🏪</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.code}</div>
                  </button>
                ))}
              </div>
            )}
            {error && <div style={{ marginTop: 16, color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</div>}
          </div>
        </div>
      )}

      {step === 'pin' && selected && (
        <div className="glass" style={{ padding: 36, width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <button onClick={() => { setStep('select'); setPin(''); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← 뒤로
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selected.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>PIN 번호를 입력하세요</div>

          {/* PIN dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: i < pin.length ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.15s',
                boxShadow: i < pin.length ? '0 0 10px rgba(124,106,247,0.6)' : 'none',
              }} />
            ))}
          </div>

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              <button key={i} onClick={() => d === '⌫' ? handlePinDelete() : d ? handlePinInput(d) : undefined}
                disabled={submitting || (!d && d !== '0')}
                style={{
                  height: 60, borderRadius: 12, border: '1px solid var(--glass-border)',
                  background: d === '⌫' ? 'rgba(239,68,68,0.15)' : 'var(--glass)',
                  color: d === '⌫' ? '#fca5a5' : 'var(--text)',
                  fontSize: 20, fontWeight: 600, cursor: d ? 'pointer' : 'default',
                  transition: 'all 0.15s', opacity: !d && d !== '0' ? 0 : 1,
                }}
                onMouseEnter={(e) => { if (d) e.currentTarget.style.background = 'var(--glass-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = d === '⌫' ? 'rgba(239,68,68,0.15)' : 'var(--glass)'; }}
              >
                {submitting && d === '0' ? '...' : d}
              </button>
            ))}
          </div>

          {error && <div style={{ marginTop: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        </div>
      )}

      {step === 'change-pin' && (
        <div className="glass" style={{ padding: 36, width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>PIN 변경 필요</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>처음 로그인입니다. 새 PIN을 설정해주세요.</div>

          <div style={{ marginBottom: 16, textAlign: 'left' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>새 PIN (4자리)</label>
            <input type="password" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="새 PIN 입력" />
          </div>
          <div style={{ marginBottom: 24, textAlign: 'left' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PIN 확인</label>
            <input type="password" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN 재입력" />
          </div>

          {error && <div style={{ marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleChangePinSubmit} disabled={submitting}>
            {submitting ? '변경 중...' : 'PIN 설정 완료'}
          </button>
        </div>
      )}
    </div>
  );
}
