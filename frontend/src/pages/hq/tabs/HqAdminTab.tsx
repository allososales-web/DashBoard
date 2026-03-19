import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { useMetricsStores } from '../../../hooks/useMetricsStores';

const CHANNEL_OPTIONS = [
  { value: 'ROAD', label: '로드' },
  { value: 'DEPARTMENT', label: '백화점' },
  { value: 'MALL', label: '몰' },
  { value: 'STARFIELD', label: '스타필드' },
  { value: 'POPUP', label: '팝업' },
  { value: 'OTHER', label: '기타' },
];

const CHANNEL_COLORS: Record<string, string> = {
  ROAD: 'rgba(200,149,108,0.25)',
  DEPARTMENT: 'rgba(124,106,247,0.25)',
  MALL: 'rgba(16,185,129,0.25)',
  STARFIELD: 'rgba(245,158,11,0.25)',
  POPUP: 'rgba(239,68,68,0.25)',
  OTHER: 'rgba(100,100,100,0.25)',
};

function ChannelBadge({ channel }: { channel: string }) {
  const labels: Record<string, string> = { ROAD: '로드', DEPARTMENT: '백화점', MALL: '몰', STARFIELD: '스타필드', POPUP: '팝업', OTHER: '기타' };
  return (
    <span style={{ background: CHANNEL_COLORS[channel] ?? 'rgba(100,100,100,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      {labels[channel] ?? channel}
    </span>
  );
}

// ─── 실적 반영 매장 섹터 ───
function MetricsStoresSection() {
  const { includedIds, toggle, isIncluded } = useMetricsStores();
  const [search, setSearch] = useState('');
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => api.get('/stores/admin/all').then((r) => r.data),
  });
  const activeStores = (stores as any[]).filter((s: any) => s.showOnLogin);
  const filtered = activeStores.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="glass" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>실적 반영 매장</span>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{includedIds.size}개 선택됨</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— 브랜드 실적 탭 KPI에 반영되는 매장</span>
        </div>
        <input placeholder="매장명 / 코드 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180, fontSize: 12, padding: '6px 10px' }} />
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>불러오는 중...</div>
      ) : (
        <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {filtered.map((s: any) => {
            const checked = isIncluded(s.id);
            return (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: checked ? 600 : 400, background: checked ? 'rgba(200,149,108,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? 'var(--accent)' : 'var(--glass-border)'}`, transition: 'all 0.15s', userSelect: 'none' }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                <span>{s.displayName ?? s.name}</span>
                <ChannelBadge channel={s.defaultChannel ?? 'ROAD'} />
              </label>
            );
          })}
          {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>운영 중인 매장 없음</div>}
        </div>
      )}
    </div>
  );
}

type SortKey = 'name' | 'code' | 'showOnLogin' | 'defaultChannel';
type SortDir = 'asc' | 'desc';

// ─── 매장 운영 현황 섹터 (정렬 + 실시간 체크박스) ───
function StoreOpsSection() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingDisplayName, setEditingDisplayName] = useState<Record<string, string>>({});
  const [overrideModal, setOverrideModal] = useState<{ storeId: string; storeName: string } | null>(null);
  const [overrideYear, setOverrideYear] = useState(new Date().getFullYear());
  const [overrideMonth, setOverrideMonth] = useState(new Date().getMonth() + 1);
  const [overrideChannel, setOverrideChannel] = useState('ROAD');
  const [createModal, setCreateModal] = useState(false);
  const [newStore, setNewStore] = useState({ name: '', code: '', defaultChannel: 'ROAD', showOnLogin: false, displayName: '' });
  const [msg, setMsg] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => api.get('/stores/admin/all').then((r) => r.data),
  });

  const settingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/stores/${id}/settings`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stores'] }); flash('저장되었습니다'); },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.post(`/stores/${id}/channel-override`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stores'] }); setOverrideModal(null); flash('오버라이드 설정됨'); },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/stores', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stores'] }); setCreateModal(false); setNewStore({ name: '', code: '', defaultChannel: 'ROAD', showOnLogin: false, displayName: '' }); flash('매장이 생성되었습니다'); },
  });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortedStores = useMemo(() => {
    const list = (stores as any[]).filter((s: any) =>
      s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
    );
    const active = list.filter((s: any) => s.showOnLogin);
    const hidden = list.filter((s: any) => !s.showOnLogin);
    const sortFn = (a: any, b: any) => {
      let av: any, bv: any;
      if (sortKey === 'name') { av = (a.displayName ?? a.name).toLowerCase(); bv = (b.displayName ?? b.name).toLowerCase(); }
      else if (sortKey === 'code') { av = a.code; bv = b.code; }
      else if (sortKey === 'showOnLogin') { av = a.showOnLogin ? 1 : 0; bv = b.showOnLogin ? 1 : 0; }
      else if (sortKey === 'defaultChannel') { av = a.defaultChannel ?? ''; bv = b.defaultChannel ?? ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    };
    return showHidden ? [...active.sort(sortFn), ...hidden.sort(sortFn)] : active.sort(sortFn);
  }, [stores, search, sortKey, sortDir, showHidden]);

  const hiddenCount = (stores as any[]).filter((s: any) => !s.showOnLogin).length;

  const SortTh = ({ label, k }: { label: string; k: SortKey }) => (
    <th onClick={() => handleSort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label} {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );

  return (
    <div style={{ marginTop: 24 }}>
      {msg && <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#6ee7b7' }}>{msg}</div>}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600 }}>매장별 운영 현황</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              운영 {(stores as any[]).filter((s: any) => s.showOnLogin).length}개
              {hiddenCount > 0 && ` / 숨김 ${hiddenCount}개`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="매장명 / 코드 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180, fontSize: 12, padding: '6px 10px' }} />
            {hiddenCount > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowHidden(!showHidden)}>
                {showHidden ? '숨김 접기 ▲' : `숨김 보기 (${hiddenCount}) ▼`}
              </button>
            )}
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setCreateModal(true)}>+ 신규 매장</button>
          </div>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <SortTh label="매장명" k="name" />
                  <SortTh label="코드" k="code" />
                  <SortTh label="운영" k="showOnLogin" />
                  <th>표시 명칭</th>
                  <SortTh label="기본 채널" k="defaultChannel" />
                  <th>월별 오버라이드</th>
                </tr>
              </thead>
              <tbody>
                {sortedStores.map((s: any) => (
                  <StoreRow
                    key={s.id}
                    store={s}
                    displayNameValue={editingDisplayName[s.id] ?? (s.displayName ?? '')}
                    onDisplayNameChange={(v) => setEditingDisplayName((prev) => ({ ...prev, [s.id]: v }))}
                    onDisplayNameSave={() => {
                      settingsMutation.mutate({ id: s.id, data: { displayName: editingDisplayName[s.id] ?? s.displayName } });
                    }}
                    onToggleShow={() => settingsMutation.mutate({ id: s.id, data: { showOnLogin: !s.showOnLogin } })}
                    onChannelChange={(ch) => settingsMutation.mutate({ id: s.id, data: { defaultChannel: ch } })}
                    onAddOverride={() => { setOverrideModal({ storeId: s.id, storeName: s.name }); setOverrideChannel(s.defaultChannel ?? 'ROAD'); }}
                  />
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
            {[
              { label: '매장명 *', key: 'name', placeholder: '매장명' },
              { label: '코드 *', key: 'code', placeholder: '고유 코드' },
              { label: '표시 명칭', key: 'displayName', placeholder: '비워두면 매장명 사용' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={(newStore as any)[key]} onChange={(e) => setNewStore({ ...newStore, [key]: e.target.value })} placeholder={placeholder} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>기본 채널</label>
              <select value={newStore.defaultChannel} onChange={(e) => setNewStore({ ...newStore, defaultChannel: e.target.value })} style={{ width: '100%' }}>
                {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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

function StoreRow({ store, displayNameValue, onDisplayNameChange, onDisplayNameSave, onToggleShow, onChannelChange, onAddOverride }: {
  store: any;
  displayNameValue: string;
  onDisplayNameChange: (v: string) => void;
  onDisplayNameSave: () => void;
  onToggleShow: () => void;
  onChannelChange: (ch: string) => void;
  onAddOverride: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  return (
    <tr style={!store.showOnLogin ? { opacity: 0.55 } : undefined}>
      <td style={{ fontWeight: 500 }}>{store.name}</td>
      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{store.code}</td>
      <td>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={store.showOnLogin} onChange={onToggleShow} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
          <span style={{ fontSize: 12, color: store.showOnLogin ? '#6ee7b7' : 'var(--text-muted)' }}>
            {store.showOnLogin ? '운영' : '비운영'}
          </span>
        </label>
      </td>
      <td>
        {editingName ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={displayNameValue} onChange={(e) => onDisplayNameChange(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', width: 110 }} autoFocus />
            <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { onDisplayNameSave(); setEditingName(false); }}>저장</button>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setEditingName(false)}>취소</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>{store.displayName ?? '-'}</span>
            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => setEditingName(true)}>변경</button>
          </div>
        )}
      </td>
      <td>
        <select value={store.defaultChannel ?? 'ROAD'} onChange={(e) => onChannelChange(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 6, color: '#fff' }}>
          {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {store.channelOverrides?.slice(0, 2).map((o: any) => (
            <span key={o.id} style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 6px' }}>
              {o.year}/{String(o.month).padStart(2, '0')} <ChannelBadge channel={o.channel} />
            </span>
          ))}
          <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 6px' }} onClick={onAddOverride}>+ 추가</button>
        </div>
      </td>
    </tr>
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
    mutationFn: ({ storeId, pin }: { storeId: string; pin: string }) => api.post('/auth/reset-pin', { storeId, newPin: pin }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hq-pins'] }); setResetTarget(null); setNewPin(''); flash('PIN이 초기화되었습니다'); },
  });

  const changePinMutation = useMutation({
    mutationFn: () => api.post('/auth/change-pin', { currentPin: ownCurrentPin, newPin: ownNewPin }),
    onSuccess: () => { setChangingOwnPin(false); setOwnCurrentPin(''); setOwnNewPin(''); flash('본사 PIN이 변경되었습니다'); },
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const stores = data?.stores ?? [];
      await Promise.all(stores.map((s: any) => api.post('/auth/reset-pin', { storeId: s.storeId, newPin: s.storeCode.slice(-4).padStart(4, '1') })));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hq-pins'] }); flash('전체 PIN이 초기화되었습니다'); },
  });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  if (isLoading) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>불러오는 중...</div>;

  const hq = data?.hq;
  const stores = (data?.stores ?? []).filter((s: any) => s.showOnLogin !== false);

  return (
    <div style={{ maxWidth: 900 }}>
      {msg && <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#6ee7b7' }}>{msg}</div>}

      <MetricsStoresSection />
      <StoreOpsSection />

      {/* 본사 PIN */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: changingOwnPin ? 16 : 0 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>본사 PIN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 6, color: 'var(--accent)', fontFamily: 'monospace' }}>
                {showPins ? (hq?.currentPin ?? '****') : '••••'}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setShowPins(!showPins)}>{showPins ? '숨기기' : '보기'}</button>
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
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>운영중 매장만 표시</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowPins(!showPins)}>{showPins ? '🙈 PIN 숨기기' : '👁 PIN 보기'}</button>
            <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => { if (confirm('전체 매장 PIN을 초기화하시겠습니까?')) resetAllMutation.mutate(); }} disabled={resetAllMutation.isPending}>전체 초기화</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>매장</th><th>코드</th><th>현재 PIN</th><th>상태</th><th>마지막 변경</th><th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s: any) => (
              <tr key={s.storeId}>
                <td style={{ fontWeight: 500 }}>{s.storeName}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.storeCode}</td>
                <td><span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: 4, color: 'var(--accent)' }}>{showPins ? (s.currentPin ?? '----') : '••••'}</span></td>
                <td>
                  {s.isFirstLogin
                    ? <span className="badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>초기 PIN</span>
                    : <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7' }}>변경됨</span>}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.pinChangedAt ? new Date(s.pinChangedAt).toLocaleDateString('ko') : '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { setResetTarget({ id: s.storeId, name: s.storeName }); setNewPin(''); }}>초기화</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass" style={{ padding: 28, width: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{resetTarget.name} PIN 초기화</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>새 PIN을 입력하세요 (4자리)</div>
            <input type="password" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="새 PIN" style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setResetTarget(null)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => resetMutation.mutate({ storeId: resetTarget.id, pin: newPin })} disabled={newPin.length !== 4 || resetMutation.isPending}>초기화</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
