'use client';

import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import { orderApi, Order } from '@/services/order';
import { kolApi, KOLProfile } from '@/services/kol';

interface AssignKolModalProps {
  isOpen: boolean;
  order: Order | null;
  kols: KOLProfile[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignKolModal({ isOpen, order, kols, onClose, onSuccess }: AssignKolModalProps) {
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKolIds, setSelectedKolIds] = useState<string[]>([]);
  const [kolSearch, setKolSearch] = useState('');

  const resetForm = () => {
    setSelectedKolIds([]);
    setKolSearch('');
    setError(null);
  };

  React.useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen]);

  const toggleKol = (id: string) => {
    setSelectedKolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const activeKols = kols.filter((k) => k.user.is_active);
    setSelectedKolIds((prev) =>
      prev.length === activeKols.length ? [] : activeKols.map((k) => k.user_id)
    );
  };

  const handleAssign = async () => {
    if (!order || selectedKolIds.length === 0) {
      setError('Vui lòng chọn ít nhất một KOL.');
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      await orderApi.assignKol(order.id, selectedKolIds);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string | { msg?: string }[] } } };
      const detail = axiosError.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', '));
      } else {
        setError('Không thể phân bổ KOL.');
      }
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen || !order) return null;

  const activeKols = kols.filter((k) => k.user.is_active);
  const filteredKols = kolSearch.trim()
    ? activeKols.filter(
        (k) =>
          k.user.full_name.toLowerCase().includes(kolSearch.trim().toLowerCase()) ||
          k.user.email.toLowerCase().includes(kolSearch.trim().toLowerCase())
      )
    : activeKols;
  const allSelected = filteredKols.length > 0 && filteredKols.every((k) => selectedKolIds.includes(k.user_id));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm">
      <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Phân bổ KOL</h2>
            <p className="text-sm text-gray-500">Đơn #{order.id.slice(0, 8)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6 overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Lỗi:</strong> {error}
            </div>
          )}

          {/* Order info - hide sensitive data */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <h3 className="text-sm font-semibold text-orange-800 mb-2">Yêu cầu từ Sale</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Sale:</span>{' '}
                <span className="font-medium">{order.sale?.full_name || order.sale_id}</span>
              </div>
              <div>
                <span className="text-gray-500">Nền tảng:</span>{' '}
                <span className="font-medium">{order.platform || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Chiến dịch:</span>{' '}
                <span className="font-medium">{order.campaign_name || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Số bài:</span>{' '}
                <span className="font-medium">{order.post_count || '—'}</span>
              </div>
            </div>
            {order.kol_request_notes && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-xs text-gray-500 mb-1">Ghi chú yêu cầu KOL:</p>
                <p className="text-sm text-gray-800">{order.kol_request_notes}</p>
              </div>
            )}
            <p className="mt-2 text-xs text-orange-600 italic">
              ⚠️ Thông tin nhạy cảm (SĐT, giá trị hợp đồng) đã được ẩn để bảo mật.
            </p>
          </div>

          {/* KOL Search */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Tìm KOL <span className="text-gray-400 font-normal">({selectedKolIds.length} đã chọn)</span>
            </label>
            <input
              type="text"
              value={kolSearch}
              onChange={(e) => setKolSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Select All */}
          {filteredKols.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              {allSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
              Chọn tất cả ({filteredKols.length} KOL đang hoạt động)
            </button>
          )}

          {/* KOL List */}
          <div className="max-h-72 overflow-y-auto space-y-2">
            {filteredKols.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Không tìm thấy KOL phù hợp.</p>
            ) : filteredKols.map((kol) => {
              const isSelected = selectedKolIds.includes(kol.user_id);
              return (
                <div
                  key={kol.user_id}
                  onClick={() => toggleKol(kol.user_id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="shrink-0">
                    {isSelected ? (
                      <CheckSquare size={18} className="text-blue-600" />
                    ) : (
                      <Square size={18} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{kol.user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{kol.user.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{new Intl.NumberFormat('vi-VN').format(kol.followers)} followers</span>
                      {kol.kol_booking_price != null && (
                        <span>· Giá booking: {kol.kol_booking_price.toLocaleString('vi-VN')} VNĐ</span>
                      )}
                      {kol.niche && kol.niche.length > 0 && (
                        <span>· {kol.niche.slice(0, 3).join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {selectedKolIds.length === 0
              ? 'Chưa chọn KOL nào'
              : selectedKolIds.length === 1
                ? 'Sẽ cập nhật đơn hiện tại'
                : `Sẽ tạo ${selectedKolIds.length} đơn (mỗi KOL 1 đơn)`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={assigning || selectedKolIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-70 transition"
            >
              {assigning ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Phân bổ ({selectedKolIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
