import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

export default function HqAdminTab() {
  const qc = useQueryClient();
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPin, setNewPin] = useState('');
  const [changingOwnPin, setChangingOwnPin] = useState(false);
  const [ownCurrentPin, setOwnCurrentPin] = useState('');
  const [ownNewPin, setOwnNewPin] = useState('');
  const [msg, setMsg] = useState('');
  const [showPins, setShowPins] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['hq-pins'],
    queryFn: () => api.get('/auth/pins').then((r) => r.data),
  });

  const resetMutation = useMutation({
    mutationFn: ({ storeId, pin }: { storeId: string; pin: string }) =>
      api.post('/auth/reset-pin', { storeId, newPin: pin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hq-pins'] });
      setResetTarget(null);
      setNewPin('');
      setMsg('PIN이 초기화되었습니다');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  const changePinMutation = useMutation({
    mutationFn: () => api.post('/auth/change-pin', { currentPin: ownCurrentPin, newPin: ownNewPin }),
    onSuccess: () => {
      setChangingOwnPin(false);
      setOwnCurrentPin('');
      setOwnNewPin('');
      setMsg('본사 PIN이 변경되었습니다');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const stores = data?.stores ?? [];
      await Promise.all(stores.map((s: any) => api.post('/auth/reset-pin', { storeId: s.storeId, newPin: s.storeCode.slice(-4).padStart(4, '1') })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hq-pins'] });
      setMsg('전체 PIN이 초기화되었습니다');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  if (isLoading) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>;

  const hq = data?.hq;
  const stores = data?.stores ?? [];

  return (
    <div style={{ maxWidth: 700 }}>
      {msg && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#6ee7b7' }}>
          {msg}
        </div>
      )}

      {/* 본사 PIN */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: changingOwnPin ? 16 : 0 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>본사 PIN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 6, color: 'var(--accent)', fontFamily: 'monospace' }}>
                {showPins ? (hq?.currentPin ?? '****') : '••••'}
              </div>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setShowPins(!showPins)}
              >
                {showPins ? '숨기기' : '보기'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {hq?.isFirstLogin ? '⚠ 초기 PIN 미변경' : `마지막 변경: ${hq?.pinChangedAt ? new Date(hq.pinChangedAt).toLocaleDateString('ko') : '-'}`}
            </div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setChangingOwnPin(!changingOwnPin)}>
            PIN 변경
          </button>
        </div>
        {changingOwnPin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 16 }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>현재 PIN</label>
              <input type="password" maxLength={4} value={ownCurrentPin} onChange={(e) => setOwnCurrentPin(e.target.value.replace(/\D/g, ''))} placeholder="현재 PIN" />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>새 PIN</label>
              <input type="password" maxLength={4} value={ownNewPin} onChange={(e) => setOwnNewPin(e.target.value.replace(/\D/g, ''))} placeholder="새 PIN (4자리)" />
            </div>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => changePinMutation.mutate()} disabled={changePinMutation.isPending}>
              변경
            </button>
          </div>
        )}
      </div>

      {/* 매장 PIN 목록 */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>매장 PIN 관리</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowPins(!showPins)}>
              {showPins ? '🙈 PIN 숨기기' : '👁 PIN 보기'}
            </button>
            <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => { if (confirm('전체 매장 PIN을 초기화하시겠습니까?')) resetAllMutation.mutate(); }} disabled={resetAllMutation.isPending}>
              전체 초기화
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>매장</th>
              <th>코드</th>
              <th>현재 PIN</th>
              <th>상태</th>
              <th>마지막 변경</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s: any) => (
              <tr key={s.storeId}>
                <td style={{ fontWeight: 500 }}>{s.storeName}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.storeCode}</td>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: 4, color: 'var(--accent)' }}>
                    {showPins ? (s.currentPin ?? '----') : '••••'}
                  </span>
                </td>
                <td>
                  {s.isFirstLogin
                    ? <span className="badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>초기 PIN</span>
                    : <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7' }}>변경됨</span>}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {s.pinChangedAt ? new Date(s.pinChangedAt).toLocaleDateString('ko') : '-'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setResetTarget({ id: s.storeId, name: s.storeName }); setNewPin(''); }}>
                    초기화
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 개별 초기화 모달 */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass" style={{ padding: 28, width: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{resetTarget.name} PIN 초기화</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>새 PIN을 입력하세요 (4자리)</div>
            <input type="password" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="새 PIN" style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setResetTarget(null)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => resetMutation.mutate({ storeId: resetTarget.id, pin: newPin })} disabled={newPin.length !== 4 || resetMutation.isPending}>
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
