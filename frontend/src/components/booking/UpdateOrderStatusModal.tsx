'use client';

import React, { useState } from 'react';
import type { AxiosError } from 'axios';
import { orderApi, Order, OrderStatus } from '@/services/order';
import { X, Loader2, CheckCircle } from 'lucide-react';

const STATUS_LABELS: Record<OrderStatus, string> = {
  new_request: 'Yêu cầu mới',
  pending_approval: 'Chờ duyệt',
  pending_sale_info: 'Chờ Sale cập nhật',
  init: 'Khởi tạo',
  deposited: 'Đã cọc',
  running: 'Đang chạy',
  pending_review: 'Chờ nghiệm thu',
  completed: 'Hoàn thành',
  cancel_requested: 'Yêu cầu hủy',
  cancelled: 'Đã hủy',
  refund_requested: 'Yêu cầu hoàn tiền',
  refunded: 'Đã hoàn tiền',
};

const PIPELINE_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  init: ['deposited'],
  deposited: ['running'],
  running: ['pending_review'],
  pending_review: ['completed'],
  completed: [],
};

interface UpdateOrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order | null;
}

export default function UpdateOrderStatusModal({ isOpen, onClose, onSuccess, order }: UpdateOrderStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>(order?.status || 'init');
  const nextStatuses = order ? (PIPELINE_TRANSITIONS[order.status] ?? null) : null;
  const isExceptionalStatus = order ? !(order.status in PIPELINE_TRANSITIONS) : false;

  // Sync state when order changes
  React.useEffect(() => {
    if (order) setStatus(order.status);
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await orderApi.updateStatus(order.id, status);
      onSuccess();
      onClose();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail ?? 'Lỗi khi cập nhật trạng thái đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: { value: OrderStatus, label: string }[] = [
    { value: order.status, label: STATUS_LABELS[order.status] },
    ...((nextStatuses ?? []).map((value) => ({ value, label: STATUS_LABELS[value] }))),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Cập nhật Trạng thái</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm flex gap-2 items-start">
               <span className="font-bold">!</span> {error}
            </div>
          )}

          <div className="mb-4 text-sm text-gray-500">
            Đơn hàng: <span className="font-mono text-gray-900 font-medium">{order.id.split('-')[0]}...</span>
          </div>

          {isExceptionalStatus ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Đơn này đang ở luồng hủy hoặc hoàn tiền. Hãy dùng nút thao tác riêng thay vì cập nhật qua modal trạng thái chuẩn.
            </div>
          ) : nextStatuses?.length === 0 ? (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Trạng thái hiện tại đã là bước cuối của pipeline chuẩn, không còn bước tiếp theo để cập nhật.
            </div>
          ) : null}

          <form id="update-status-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái mới
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="update-status-form"
            disabled={loading || status === order.status || isExceptionalStatus || nextStatuses?.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-70 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Lưu thay đổi
          </button>
        </div>

      </div>
    </div>
  );
}
