import React, { useState } from 'react';
import { orderApi, Order } from '@/services/order';
import { X, Loader2 } from 'lucide-react';

interface ClaimOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimOrderModal({ order, isOpen, onClose, onSuccess }: ClaimOrderModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!order) return;

    try {
      setSubmitting(true);
      setError(null);
      await orderApi.claimOrder(order.id, {});
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lỗi khi nhận đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Nhận Yêu Cầu Tư Vấn</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-xl bg-orange-50 p-4 text-sm text-orange-800">
            <p><strong>Khách hàng:</strong> {order.customer_name || 'Khách vãng lai'}</p>
            <p><strong>SĐT:</strong> {order.customer_phone || 'N/A'}</p>
            {order.customer_email && <p><strong>Email:</strong> {order.customer_email}</p>}
            <p><strong>Nội dung:</strong> {order.kpi || 'Không có mô tả'}</p>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <p className="mb-6 text-sm text-gray-600">
            Bạn sẽ nhận đơn này và được gán làm Sale phụ trách. Thông tin KOL và giá trị hợp đồng có thể điền sau khi đã có đầy đủ thông tin.
          </p>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-70"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Xác nhận nhận đơn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
