'use client';

import React, { useState } from 'react';
import type { AxiosError } from 'axios';
import { X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { orderApi, Order } from '@/services/order';

export type CancelRefundMode = 'direct_cancel' | 'request_cancel' | 'approve_cancel' | 'request_refund' | 'approve_refund';

interface CancelRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order | null;
  mode: CancelRefundMode;
}

const MODE_CONFIG: Record<CancelRefundMode, { title: string; buttonLabel: string; buttonColor: string; ringColor: string }> = {
  direct_cancel: {
    title: 'Hủy đơn hàng',
    buttonLabel: 'Xác nhận hủy đơn',
    buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    ringColor: 'focus:ring-red-400 focus:border-red-400',
  },
  request_cancel: {
    title: 'Yêu cầu hủy đơn hàng',
    buttonLabel: 'Gửi yêu cầu hủy',
    buttonColor: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
    ringColor: 'focus:ring-orange-400 focus:border-orange-400',
  },
  approve_cancel: {
    title: 'Phê duyệt hủy đơn hàng',
    buttonLabel: 'Xác nhận hủy đơn',
    buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    ringColor: 'focus:ring-red-400 focus:border-red-400',
  },
  request_refund: {
    title: 'Yêu cầu hoàn tiền',
    buttonLabel: 'Gửi yêu cầu hoàn tiền',
    buttonColor: 'bg-pink-600 hover:bg-pink-700 focus:ring-pink-500',
    ringColor: 'focus:ring-pink-400 focus:border-pink-400',
  },
  approve_refund: {
    title: 'Phê duyệt hoàn tiền',
    buttonLabel: 'Xác nhận hoàn tiền',
    buttonColor: 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500',
    ringColor: 'focus:ring-teal-400 focus:border-teal-400',
  },
};

export default function CancelRefundModal({ isOpen, onClose, onSuccess, order, mode }: CancelRefundModalProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setNote('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const config = MODE_CONFIG[mode];
  const needsReason = mode === 'direct_cancel' || mode === 'request_cancel' || mode === 'request_refund';

  const getErrorMessage = (err: unknown): string => {
    const axiosError = err as AxiosError<{ detail?: string }>;
    return axiosError.response?.data?.detail ?? 'Đã xảy ra lỗi, vui lòng thử lại.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsReason && reason.trim().length < 5) {
      setError('Lý do phải có ít nhất 5 ký tự.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === 'direct_cancel') await orderApi.cancelOrder(order.id, reason.trim());
      else if (mode === 'request_cancel') await orderApi.requestCancel(order.id, reason.trim());
      else if (mode === 'approve_cancel') await orderApi.approveCancel(order.id, note.trim() || undefined);
      else if (mode === 'request_refund') await orderApi.requestRefund(order.id, reason.trim());
      else await orderApi.approveRefund(order.id, note.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm flex gap-2 items-start">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="text-sm text-gray-500">
            Đơn hàng:{' '}
            <span className="font-mono text-gray-900 font-medium">{order.id.split('-')[0]}…</span>
            {order.campaign_name && (
              <span className="ml-1 text-blue-600">· {order.campaign_name}</span>
            )}
          </div>

          {/* Show existing cancel/refund reason for approve modes */}
          {(mode === 'approve_cancel' || mode === 'approve_refund') && order.cancel_reason && (
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 mb-1">Lý do yêu cầu</p>
              <p className="text-gray-800">{order.cancel_reason}</p>
            </div>
          )}

          {/* Reason textarea for request modes */}
          {needsReason && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Lý do <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                className={`w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 resize-none ${config.ringColor}`}
                placeholder={
                  mode === 'direct_cancel'
                    ? 'Nhập lý do hủy đơn ngay...'
                    : mode === 'request_cancel'
                    ? 'Nhập lý do yêu cầu hủy đơn...'
                    : 'Nhập lý do yêu cầu hoàn tiền...'
                }
              />
            </div>
          )}

          {/* Note textarea for approve modes */}
          {!needsReason && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ghi chú phê duyệt <span className="text-gray-400">(tuỳ chọn)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Thêm ghi chú nếu cần..."
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-sm font-medium text-white rounded-xl ${config.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:opacity-70 flex items-center gap-2`}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {config.buttonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
