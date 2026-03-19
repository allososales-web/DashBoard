import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface MonthGoal {
  month: number;
  targetAmount: number;
  targetContracts: number;
  targetConsults: number;
}

function makeEmptyGoals(): MonthGoal[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    targetAmount: 0,
    targetContracts: 0,
    targetConsults: 0,
  }));
}

export default function StoreMetricsInputPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [annualGoals, setAnnualGoals] = useState<MonthGoal[]>(makeEmptyGoals());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [form, setForm] = useState({ targetAmount: '', targetContracts: '', targetConsults: '' });

  const { data: goalData } = useQuery({
    queryKey: ['goal', storeId, year, month],
    queryFn: () => api.get(`/goals?storeId=${storeId}&year=${year}&month=${month}&limit=1`).then(r => r.data?.[0] ?? null),
    enabled: !!storeId,
  });

  useEffect(() => {
    if (goalData) {
      setForm({
        targetAmount: String(goalData.targetAmount ?? ''),
        targetContracts: String(goalData.targetContracts ?? ''),
        targetConsults: String(goalData.targetConsults ?? ''),
      });
    } else {
      setForm({ targetAmount: '', targetContracts: '', targetConsults: '' });
    }
  }, [goalData]);

  const { data: annualData } = useQuery({
    queryKey: ['goals-annual', storeId, year],
    queryFn: () => api.get(`/goals?storeId=${storeId}&year=${year}&limit=12`).then(r => r.data ?? []),
    enabled: !!storeId,
  });

  useEffect(() => {
    const base = makeEmptyGoals();
    if (Array.isArray(annualData)) {
      annualData.forEach((g: any) => {
        const idx = base.findIndex(b => b.month === g.month);
        if (idx >= 0) {
          base[idx] = {
            month: g.month,
            targetAmount: Number(g.targetAmount ?? 0),
            targetContracts: Number(g.targetContracts ?? 0),
            targetConsults: Number(g.targetConsults ?? 0),
          };
        }
      });
    }
    setAnnualGoals(base);
  }, [annualData, year]);

  const saveMutation = useMutation({
    mutationFn: () => api.post('/goals', {
      storeId, year, month,
      targetAmount: Number(form.targetAmount) || 0,
      targetContracts: Number(form.targetContracts) || 0,
      targetConsults: Number(form.targetConsults) || 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal', storeId, year, month] });
      qc.invalidateQueries({ queryKey: ['goals-annual', storeId, year] });
      alert('목표가 저장되었습니다.');
    },
    onError: () => alert('저장 중 오류가 발생했습니다.'),
  });

  async function handleBulkSave() {
    if (!storeId) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        annualGoals.map(g =>
          api.post('/goals', {
            storeId, year, month: g.month,
            targetAmount: g.targetAmount,
            targetContracts: g.targetContracts,
            targetConsults: g.targetConsults,
          })
        )
      );
      qc.invalidateQueries({ queryKey: ['goals-annual', storeId, year] });
      alert('연간 목표가 저장되었습니다.');
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setBulkSaving(false);
    }
  }

  function updateAnnualGoal(m: number, field: keyof Omit<MonthGoal, 'month'>, value: string) {
    setAnnualGoals(prev => prev.map(g => g.month === m ? { ...g, [field]: Number(value) || 0 } : g));
  }

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>목표 입력</div>

      <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>단월 목표 설정</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ fontSize: 13, padding: '6px 10px' }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ fontSize: 13, padding: '6px 10px' }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>매출 목표 (원)</label>
            <input type="number" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="예: 50000000" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>계약 목표 (건)</label>
            <input type="number" value={form.targetContracts} onChange={e => setForm({ ...form, targetContracts: e.target.value })} placeholder="예: 10" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>상담 목표 (건)</label>
            <input type="number" value={form.targetConsults} onChange={e => setForm({ ...form, targetConsults: e.target.value })} placeholder="예: 30" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="glass" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>연간 목표 일괄 입력</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ fontSize: 13, padding: '6px 10px' }}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={handleBulkSave} disabled={bulkSaving}>
              {bulkSaving ? '저장 중...' : '일괄 저장'}
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', minWidth: 50 }}>월</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', minWidth: 160 }}>매출 목표 (원)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', minWidth: 120 }}>계약 목표 (건)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', minWidth: 120 }}>상담 목표 (건)</th>
              </tr>
            </thead>
            <tbody>
              {annualGoals.map(g => (
                <tr key={g.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{g.month}월</td>
                  <td style={{ padding: '6px 12px' }}>
                    <input type="number" value={g.targetAmount || ''} onChange={e => updateAnnualGoal(g.month, 'targetAmount', e.target.value)} placeholder="0" style={{ width: '100%', fontSize: 12 }} />
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    <input type="number" value={g.targetContracts || ''} onChange={e => updateAnnualGoal(g.month, 'targetContracts', e.target.value)} placeholder="0" style={{ width: '100%', fontSize: 12 }} />
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    <input type="number" value={g.targetConsults || ''} onChange={e => updateAnnualGoal(g.month, 'targetConsults', e.target.value)} placeholder="0" style={{ width: '100%', fontSize: 12 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
