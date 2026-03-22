import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import allosoLogo from '../assets/Alloso_LOGO_Basic (1).jpg';

interface StoreItem {
  id: string;
  name: string;
  code: string;
  region?: string;
  defaultChannel?: string;
}

type Step = 'select' | 'pin' | 'change-pin';

const CHANNEL_ORDER = ['HQ', 'ROAD', 'DEPARTMENT', 'MALL', 'STARFIELD', 'POPUP', 'OTHER'];
const CHANNEL_LABELS: Record<string, string> = {
  HQ: '본사', ROAD: '로드', DEPARTMENT: '백화점',
  MALL: '몰', STARFIELD: '스타필드', POPUP: '팝업', OTHER: '기타',
};
const CHANNEL_COLORS: Record<string, string> = {
  HQ: '#5a7a5a', ROAD: '#8a7a5a', DEPARTMENT: '#7a6a8a',
  MALL: '#5a7a6a', STARFIELD: '#5a6a8a', POPUP: '#8a5a5a', OTHER: '#8a8a82',
};

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
  const [search, setSearch] = useState('');

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

  const handleSelect = (id: string, name: string) => {
    setSelected({ id, name }); setPin(''); setError(''); setStep('pin');
  };
  const handlePinInput = (digit: string) => { if (pin.length < 4) setPin((p) => p + digit); };
  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    setSubmitting(true); setError('');
    try {
      const { data } = await api.post('/auth/pin-login', { storeId: selected!.id, pin });
      if (data.isFirstLogin) {
        setAuth({ accessToken: data.accessToken, role: data.role, storeId: data.storeId, storeName: data.storeName, isFirstLogin: true });
        setPin(''); setNewPin(''); setConfirmPin(''); setStep('change-pin');
      } else {
        setAuth({ accessToken: data.accessToken, role: data.role, storeId: data.storeId, storeName: data.storeName, isFirstLogin: false });
        if (data.role === 'HQ_ADMIN') navigate('/hq');
        else navigate(`/store/${data.storeId}/dashboard`);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'PIN이 올바르지 않습니다'); setPin('');
    } finally { setSubmitting(false); }
  };

  const handleChangePinSubmit = async () => {
    if (newPin.length !== 4) { setError('새 PIN은 4자리여야 합니다'); return; }
    if (newPin !== confirmPin) { setError('PIN이 일치하지 않습니다'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/auth/change-pin', { currentPin: pin, newPin });
      const raw = localStorage.getItem('pin_auth');
      if (raw) { const parsed = JSON.parse(raw); setAuth({ ...parsed, isFirstLogin: false }); }
      if (selected?.id === 'HQ') navigate('/hq');
      else navigate(`/store/${selected!.id}/dashboard`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'PIN 변경 실패');
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (step === 'pin' && pin.length === 4 && !submitting) handlePinSubmit();
  }, [pin, step]);

  const grouped: Record<string, StoreItem[]> = {};
  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );
  filtered.forEach((s) => {
    const ch = s.defaultChannel ?? 'ROAD';
    if (!grouped[ch]) grouped[ch] = [];
    grouped[ch].push(s);
  });
  const orderedChannels = CHANNEL_ORDER.filter((ch) => ch !== 'HQ' && grouped[ch]?.length > 0);

  return (
    <div className="login-wrapper" style={{
      minHeight: '100vh',
      background: 'transparent',
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
    }}>
      {/* 중앙 컨테이너 — HqLayout maxWidth 1100 패턴 */}
      <div className="login-card" style={{
        width: '100%',
        maxWidth: 1100,
        display: 'flex',
        gap: 0,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        boxShadow: '0 8px 48px rgba(139,124,248,0.18), 0 0 0 1px rgba(139,124,248,0.10)',
        overflow: 'hidden',
        minHeight: 640,
      }}>
        {/* 좌측: 브랜드 + 매장 목록 */}
        <div className="login-store-col" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 40px',
          overflowY: 'auto',
          borderRight: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.60)',
        }}>
          {/* 브랜드 헤더 */}
          <div style={{ marginBottom: 36 }}>
            <img src={allosoLogo} alt="Alloso" style={{ height: 40, mixBlendMode: 'multiply', objectFit: 'contain', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Store Analytics Dashboard
            </div>
          </div>

          {/* 검색 */}
          <input
            placeholder="매장 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 28, fontSize: 13 }}
          />

          {/* 매장 목록 */}
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>불러오는 중...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(!search || '본사'.includes(search) || 'HQ'.toLowerCase().includes(search.toLowerCase())) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>본사</div>
                  <StoreRow id="HQ" name="본사(HQ)" channel="HQ" isSelected={selected?.id === 'HQ'} onClick={() => handleSelect('HQ', '본사(HQ)')} />
                </div>
              )}
              {orderedChannels.map((ch) => (
                <div key={ch} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>{CHANNEL_LABELS[ch] ?? ch}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {grouped[ch].map((s) => (
                      <StoreRow key={s.id} id={s.id} name={s.name} channel={ch} isSelected={selected?.id === s.id} onClick={() => handleSelect(s.id, s.name)} />
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && !search.includes('본사') && !search.includes('HQ') && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>검색 결과 없음</div>
              )}
            </div>
          )}
          {error && step === 'select' && <div style={{ marginTop: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        </div>

        {/* 우측: PIN 패드 */}
        <div className="login-pin-col" style={{
          width: 380,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '56px 48px',
          background: 'rgba(245,243,254,0.75)',
        }}>
          {step === 'select' && (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.06em' }}>
                좌측에서 매장을 선택하세요
              </div>
              <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, opacity: 0.2 }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ height: 56, borderRadius: 10, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }} />
                ))}
              </div>
            </div>
          )}

          {step === 'pin' && selected && (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>선택된 매장</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 28 }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>PIN 코드</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 32 }}>
                {[0,1,2,3].map((i) => (
                  <div key={i} style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: i < pin.length ? 'var(--accent)' : 'rgba(139,124,248,0.12)',
                    transition: 'background 0.15s',
                  }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                  <button
                    key={i}
                    onClick={() => d === '⌫' ? handlePinDelete() : d ? handlePinInput(d) : undefined}
                    disabled={submitting || (!d && d !== '0')}
                    style={{
                      height: 56, borderRadius: 10,
                      border: '1.5px solid rgba(139,124,248,0.12)',
                      background: d === '⌫' ? 'rgba(240,112,112,0.08)' : d ? 'rgba(255,255,255,0.90)' : 'transparent',
                      color: d === '⌫' ? 'var(--danger)' : 'var(--text)',
                      fontSize: 18, fontWeight: 500,
                      cursor: d ? 'pointer' : 'default',
                      opacity: !d && d !== '0' ? 0 : 1,
                      transition: 'background 0.12s',
                      boxShadow: d ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (d) e.currentTarget.style.background = d === '⌫' ? 'rgba(240,112,112,0.15)' : 'rgba(139,124,248,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = d === '⌫' ? 'rgba(240,112,112,0.08)' : d ? 'rgba(255,255,255,0.90)' : 'transparent'; }}
                  >
                    {submitting && d === '0' ? '...' : d}
                  </button>
                ))}
              </div>
              <button
                onClick={handlePinSubmit}
                disabled={pin.length !== 4 || submitting}
                style={{
                  width: '100%', marginTop: 16, height: 52, borderRadius: 99,
                  background: pin.length === 4 ? 'linear-gradient(135deg, var(--accent), var(--dark))' : 'rgba(139,124,248,0.08)',
                  border: 'none', color: pin.length === 4 ? '#fff' : 'var(--text-muted)', fontSize: 14, fontWeight: 700,
                  cursor: pin.length === 4 ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  boxShadow: pin.length === 4 ? '0 4px 16px rgba(139,124,248,0.35)' : 'none',
                }}
              >
                {submitting ? '로그인 중...' : '로그인'}
              </button>
              <button
                onClick={() => { setStep('select'); setPin(''); setError(''); setSelected(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginTop: 16 }}
              >
                ← 매장 다시 선택
              </button>
              {error && <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            </div>
          )}

          {step === 'change-pin' && (
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>PIN 변경 필요</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>처음 로그인입니다. 새 PIN을 설정해주세요.</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>새 PIN (4자리)</label>
                <input type="password" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="새 PIN 입력" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>PIN 확인</label>
                <input type="password" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN 재입력" />
              </div>
              {error && <div style={{ marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
              <button className="btn btn-primary" style={{ width: '100%', height: 52, fontSize: 15 }} onClick={handleChangePinSubmit} disabled={submitting}>
                {submitting ? '변경 중...' : 'PIN 설정 완료'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreRow({ name, channel, isSelected, onClick }: {
  id: string; name: string; channel: string; isSelected: boolean; onClick: () => void;
}) {
  const color = CHANNEL_COLORS[channel] ?? '#6b7280';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
        background: isSelected ? `${color}14` : 'transparent',
        border: isSelected ? `1.5px solid ${color}40` : '1.5px solid transparent',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontSize: 14, color: isSelected ? 'var(--text)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
        {name}
      </span>
    </div>
  );
}
