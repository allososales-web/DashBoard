import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';

const CHANNEL_OPTIONS = [
  { value: 'ROAD', label: '로드' },
  { value: 'DEPARTMENT', label: '백화점' },
  { value: 'MALL', label: '몰' },
  { value: 'STARFIELD', label: '스타필드' },
  { value: 'POPUP', label: '팝업' },
  { value: 'OTHER', label: '기타' },
];

function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, { label: string; color: string }> = {
    ROAD: { label: '로드', color: 'rgba(200,149,108,0.25)' },
    DEPARTMENT: { label: '백화점', color: 'rgba(124,106,247,0.25)' },
    MALL: { label: '몰', color: 'rgba(16,185,129,0.25)' },
    STARFIELD: { label: '스타필드', color: 'rgba(245,158,11,0.25)' },
    POPUP: { label: '팝업', color: 'rgba(239,68,68,0.25)' },
    OTHER: { label: '기타', color: 'rgba(100,100,100,0.25)' },
  };
  const c = map[channel] ?? { label: channel, color: 'rgba(100,100,100,0.2)' };
  return (
    <span style={{ background: c.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      {c.label}
    </span>
  );
}

// ─── 매장 운영 현황 섹터 ───
function StoreOpsSection() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ showOnLogin: boolean; displayName: string; defaultChannel: string }>({ showOnLogin: false, displayName: '', defaultChannel: 'ROAD' });
  const [overrideModal, setOverrideModal] = useState<{ storeId: string; storeName: string } | null>(null);
  const [overrideYear, setOverrideYear] = useState(new Date().getFullYear());
  const [overrideMonth, setOverrideMonth] = useState(new Date().getMonth() + 1);
  const [overrideChannel, setOverrideChannel] = useState('ROAD');
  const [createModal, setCreateModal] = useState(false);
  const [newStore, setNewStore] = useState({ name: '', code: '', defaultChannel: 'ROAD', showOnLogin: false, displayName: '' });
  const [msg, setMsg] = useState('');

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => api.get('/stores/admin/all').then((r) => r.data),
  });

  const settingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/stores/${id}/settings`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stores'] }); setEditingId(null); flash('설정이 저장되었습니다'); },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.post(`/stores/${id}/channel-override`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stores'] }); setOverrideModal(null); flash('오버라이드가 설정되었습니다'); },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/stores', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stores'] }); setCreateModal(false); setNewStore({ name: '', code: '', defaultChannel: 'ROAD', showOnLogin: false, displayName: '' }); flash('매장이 생성되었습니다'); },
  });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const filtered = stores.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({ showOnLogin: s.showOnLogin, displayName: s.displayName ?? s.name, defaultChannel: s.defaultChannel ?? 'ROAD' });
  };

  return (
    <div style={{ marginTop: 24 }}>
      {msg && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#6ee7b7' }}>
          {msg}
        </div>
      )}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>매장별 운영 현황 ({stores.length}개)</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="매장명 / 코드 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 180, fontSize: 12, padding: '6px 10px' }}
            />
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setCreateModal(true)}>
              + 신규 매장
            </button>
          </div>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>매장명</th>
                  <th>코드</th>
                  <th>로그인 표시</th>
                  <th>표시 명칭</th>
                  <th>기본 채널</th>
                  <th>월별 오버라이드</th>
                  <th style={{ textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s.id}>
                    {editingId === s.id ? (
                      <>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.code}</td>
                        <td>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={editForm.showOnLogin} onChange={(e) => setEditForm({ ...editForm, showOnLogin: e.target.checked })} />
                            <span style={{ fontSize: 12 }}>{editForm.showOnLogin ? '표시' : '숨김'}</span>
                          </label>
                        </td>
                        <td>
                          <input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} style={{ fontSize: 12, padding: '4px 8px', width: 120 }} />
                        </td>
                        <td>
                          <select value={editForm.defaultChannel} onChange={(e) => setEditForm({ ...editForm, defaultChannel: e.target.value })} style={{ fontSize: 12, padding: '4px 8px' }}>
                            {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {s.channelOverrides?.length > 0 ? `${s.channelOverrides.length}개` : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => settingsMutation.mutate({ id: s.id, data: editForm })} disabled={settingsMutation.isPending}>저장</button>
                            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditingId(null)}>취소</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.code}</td>
                        <td>
                          <span style={{ fontSize: 12, color: s.showOnLogin ? '#6ee7b7' : 'var(--text-muted)' }}>
                            {s.showOnLogin ? '✓ 표시' : '숨김'}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{s.displayName ?? '-'}</td>
                        <td><ChannelBadge channel={s.defaultChannel ?? 'ROAD'} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                            {s.channelOverrides?.slice(0, 2).map((o: any) => (
                              <span key={o.id} style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 6px' }}>
                                {o.year}/{String(o.month).padStart(2, '0')} <ChannelBadge channel={o.channel} />
                              </span>
                            ))}
                            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => { setOverrideModal({ storeId: s.id, storeName: s.name }); setOverrideChannel(s.defaultChannel ?? 'ROAD'); }}>
                              + 추가
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => startEdit(s)}>편집</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 채널 오버라이드 모달 */}
      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass" style={{ padding: 28, width: 340 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{overrideModal.storeName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>월별 채널 오버라이드 설정</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>연도</label>
                <input type="number" value={overrideYear} onChange={(e) => setOverrideYear(Number(e.target.value))} style={{ fontSize: 13 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>월</label>
                <input type="number" min={1} max={12} value={overrideMonth} onChange={(e) => setOverrideMonth(Number(e.target.value))} style={{ fontSize: 13 }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>채널</label>
              <select value={overrideChannel} onChange={(e) => setOverrideChannel(e.target.value)} style={{ width: '100%', fontSize: 13 }}>
                {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setOverrideModal(null)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => overrideMutation.mutate({ id: overrideModal.storeId, data: { year: overrideYear, month: overrideMonth, channel: overrideChannel } })} disabled={overrideMutation.isPending}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 매장 생성 모달 */}
      {createModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass" style={{ padding: 28, width: 360 }}>
            <div style={{ fontWeight: 700, marginBottom: 20 }}>신규 매장 생성</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>매장명 *</label>
              <input value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} placeholder="매장명" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>코드 *</label>
              <input value={newStore.code} onChange={(e) => setNewStore({ ...newStore, code: e.target.value })} placeholder="고유 코드" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>기본 채널</label>
              <select value={newStore.defaultChannel} onChange={(e) => setNewStore({ ...newStore, defaultChannel: e.target.value })} style={{ width: '100%' }}>
                {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>표시 명칭 (로그인 화면)</label>
              <input value={newStore.displayName} onChange={(e) => setNewStore({ ...newStore, displayName: e.target.value })} placeholder="비워두면 매장명 사용" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={newStore.showOnLogin} onChange={(e) => setNewStore({ ...newStore, showOnLogin: e.target.checked })} />
                로그인 화면에 표시
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCreateModal(false)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => createMutation.mutate(newStore)} disabled={!newStore.name || !newStore.code || createMutation.isPending}>생성</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ───
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
    <div style={{ maxWidth: 900 }}>
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
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setShowPins(!showPins)}>
                {showPins ? '숨기기' : '보기'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {hq?.isFirstLogin ? '⚠ 초기 PIN 미변경' : `마지막 변경: ${hq?.pinChangedAt ? new Date(hq.pinChangedAt).toLocaleDateString('ko') : '-'}`}
            </div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setChangingOwnPin(!changingOwnPin)}>PIN 변경</button>
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
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => changePinMutation.mutate()} disabled={changePinMutation.isPending}>변경</button>
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

      {/* 매장별 운영 현황 */}
      <StoreOpsSection />

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
