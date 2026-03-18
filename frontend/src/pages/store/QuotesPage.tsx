import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesApi } from '../../services/quotes';
import { QuoteStatus, CreateQuoteDto, CreateQuoteItemDto } from '../../types/quote.types';
import { Collection } from '../../types/common.types';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: '초안',
  [QuoteStatus.SENT]: '발송',
  [QuoteStatus.ACCEPTED]: '수락',
  [QuoteStatus.REJECTED]: '거절',
  [QuoteStatus.EXPIRED]: '만료',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: '#6b7280',
  [QuoteStatus.SENT]: '#3b82f6',
  [QuoteStatus.ACCEPTED]: '#10b981',
  [QuoteStatus.REJECTED]: '#ef4444',
  [QuoteStatus.EXPIRED]: '#9ca3af',
};

export default function QuotesPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', storeId, statusFilter, page],
    queryFn: () => quotesApi.getAll(storeId!, { status: statusFilter || undefined, page, limit: 20 }),
    enabled: !!storeId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateQuoteDto) => quotesApi.create(storeId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', storeId] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotesApi.remove(storeId!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes', storeId] }),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>견적 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as QuoteStatus | ''); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db' }}>
            <option value="">전체 상태</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            + 새 견적
          </button>
        </div>
      </div>

      {showForm && <QuoteForm onSubmit={(dto) => createMutation.mutate(dto)} onCancel={() => setShowForm(false)} loading={createMutation.isPending} />}

      {createMutation.isError && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          견적 저장 실패: {(createMutation.error as any)?.response?.data?.message || '서버 오류가 발생했습니다.'}
        </div>
      )}

      {deleteMutation.isError && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          삭제 실패: {(deleteMutation.error as any)?.response?.data?.message || '서버 오류가 발생했습니다.'}
        </div>
      )}

      {isLoading ? <div>로딩 중...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13 }}>견적번호</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 13 }}>고객명</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 13 }}>금액</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13 }}>상태</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13 }}>생성일</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13 }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((q) => (
              <tr key={q.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{q.quoteNumber}</td>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{q.customerName}</td>
                <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: 14 }}>{Number(q.totalAmount).toLocaleString()}원</td>
                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, color: '#fff', background: STATUS_COLORS[q.status] }}>
                    {STATUS_LABELS[q.status]}
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>{new Date(q.createdAt).toLocaleDateString('ko-KR')}</td>
                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                  <button onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(q.id); }}
                    style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>삭제</button>
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>견적이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, cursor: page <= 1 ? 'not-allowed' : 'pointer', background: '#fff' }}>이전</button>
          <span style={{ padding: '6px 12px', fontSize: 14 }}>{page} / {data.meta.totalPages}</span>
          <button disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 4, cursor: page >= data.meta.totalPages ? 'not-allowed' : 'pointer', background: '#fff' }}>다음</button>
        </div>
      )}
    </div>
  );
}

/* Quote creation form */
function QuoteForm({ onSubmit, onCancel, loading }: { onSubmit: (dto: CreateQuoteDto) => void; onCancel: () => void; loading: boolean }) {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<CreateQuoteItemDto[]>([{ productName: '', collection: Collection.SATI, quantity: 1, unitPrice: 0 }]);

  const addItem = () => setItems([...items, { productName: '', collection: Collection.SATI, quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof CreateQuoteItemDto, value: string | number) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ customerName, items });
  };

  const inputStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>새 견적 작성</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>고객명 *</label>
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>항목</label>
          <button type="button" onClick={addItem} style={{ padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>+ 항목 추가</button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 120px 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input placeholder="제품명" value={item.productName} onChange={(e) => updateItem(idx, 'productName', e.target.value)} required style={inputStyle} />
            <select value={item.collection} onChange={(e) => updateItem(idx, 'collection', e.target.value)} style={inputStyle}>
              {Object.values(Collection).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={inputStyle} />
            <input type="number" min={0} value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="단가" style={inputStyle} />
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(idx)} style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕</button>
            )}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>합계: {total.toLocaleString()}원</div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 4, cursor: 'pointer' }}>취소</button>
        <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {loading ? '저장 중...' : '견적 저장'}
        </button>
      </div>
    </form>
  );
}
