import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

function pad2(n: number) { return String(n).padStart(2, '0'); }

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export default function StoreMetricsInputPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const now = new Date();
  const qc = useQueryClient();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [targetAmount, setTargetAmount] = useState('');
  const [targetContracts, setTargetContracts] = useState('');
  const [targetConsults, setTargetConsults] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: currentGoal } = useQuery({
    queryKey: ['store-goal', storeId, year, month],
    queryFn: () => api.get(`/goals?storeId=${storeId}&year=${year}&month=${month}`).then(r => {
      const goals = r.data?.data ?? [];
      return goals[0] ?? null;
    }).catch(() => null),
    enabled: !!storeId,
    onSuccess: (data: any) => {
      if (data) {
        setTargetAmount(data.targetAmount ? String(data.targetAmount) : '');
        setTargetContracts(data.targetContracts ? String(data.targetContracts) : '');
        setTargetConsults(data.targetConsults ? String(data.targetConsults) : '');
      } else {
        setTargetAmount(''); setTargetContracts(''); setTargetConsults('');
      }
    },
  } as any);

  const { data: hqGoal } = useQuery({
    queryKey: ['hq-goal', year, month],
    queryFn: () => api.get(`/hq/goal?year=${year}&month=${month}`).then(r => r.data).catch(() => null),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post('/goals', {
      storeId,
      year,
      month,
      targetAmount: Number(targetAmount || 0),
      targetContracts: Number(targetContracts || 0),
      targetConsults: Number(targetConsults || 0),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-goal', storeId, year, month] });
      alert('목표가 저장되었습니다.');
    },
  });

  const myTargetAmount = Number(targetAmount || 0);
  const hqTargetAmount = hqGoal?.targetAmount ?? 0;
  const diff = myTargetAmount - hqTargetAmount;
  const diffPct = hqTargetAmount > 0 ? ((diff / hqTargetAmount) * 100).toFixed(1) : null;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>수치 입력</div>

      {/* 기간 선택 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90, fontSize: 13 }}>
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 70, fontSize: 13 }}>
          {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 목표 입력 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>매장 목표 입력</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: '매출 목표 (원)', value: targetAmount, setter: setTargetAmount, placeholder: '예: 50000000' },
              { label: '판매건수 목표 (건)', value: targetContracts, setter: setTargetContracts, placeholder: '예: 20' },
              { label: '방문건수 목표 (건)', value: targetConsults, setter: setTargetConsults, placeholder: '예: 100' },
            ].map(field => (
              <div key={field.label}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{field.label}</div>
                <input value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
            <button className="btn btn-primary" style={{ fontSize: 13, padding: '10px 0', marginTop: 4 }} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '저장 중...' : '저장 (본사 연동)'}
            </button>
          </div>
        </div>

        {/* 사업부 목표 비교 */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>사업부 목표 비교</div>
          {hqGoal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '14px 16px', background: 'rgba(200,149,108,0.08)', borderRadius: 10, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>사업부 매출 목표</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{Number(hqGoal.targetAmount).toLocaleString()}원</div>
              </div>
              <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>매장 목표</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{myTargetAmount > 0 ? `${myTargetAmount.toLocaleString()}원` : '미입력'}</div>
              </div>
              {myTargetAmount > 0 && diffPct && (
                <div style={{ padding: '12px 16px', background: diff > 0 ? 'rgba(16,185,129,0.08)' : diff < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', borderRadius: 10, borderLeft: `3px solid ${diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : 'var(--glass-border)'}` }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>사업부 대비 차이</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: diff > 0 ? 'var(--success)' : diff < 0 ? '#f87171' : '#fff' }}>
                    {diff > 0 ? '+' : ''}{diff.toLocaleString()}원 ({diff > 0 ? '+' : ''}{diffPct}%)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {diff > 0 ? '매장 목표가 사업부 목표보다 높습니다' : diff < 0 ? '매장 목표가 사업부 목표보다 낮습니다' : '사업부 목표와 동일합니다'}
                  </div>
                </div>
              )}
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>사업부 목표 (계약/견적)</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>계약 목표</div><div style={{ fontSize: 14, fontWeight: 700 }}>{hqGoal.targetContracts}건</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>견적 목표</div><div style={{ fontSize: 14, fontWeight: 700 }}>{hqGoal.targetQuotes}건</div></div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
              본사에서 사업부 목표를 설정하지 않았습니다
            </div>
          )}
        </div>
      </div>

      {/* 연간 목표 현황 */}
      <div className="glass" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>연간 목표 현황 ({year}년)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)' }}>월</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>매출 목표</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>판매건수</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>방문건수</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((label, idx) => {
                const m = idx + 1;
                const isCurrent = m === month && year === now.getFullYear();
                return (
                  <tr key={m} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isCurrent ? 'rgba(200,149,108,0.06)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'var(--accent)' : '#fff' }}>{label}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
