'use client';

import React from 'react';
import { X, History, ArrowRight } from 'lucide-react';
import { Order } from '@/services/order';
import { formatCurrency } from '@/lib/currency';

interface OrderHistoryModalProps {
  order: Order;
  onClose: () => void;
}

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined) return '—';
  if (field === 'total_amount' || field === 'deposit_amount') {
    return formatCurrency(value);
  }
  return String(value);
}

export default function OrderHistoryModal({ order, onClose }: OrderHistoryModalProps) {
  const history = order.update_history || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm">
      <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Lịch sử cập nhật</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <History size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Chưa có lịch sử cập nhật nào.</p>
            </div>
          ) : (
            history.map((entry, idx) => (
              <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Lần cập nhật #{idx + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.updated_at).toLocaleString('vi-VN')} · Bởi {entry.updated_by_name}
                      </p>
                    </div>
                    {entry.update_note && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium max-w-xs truncate">
                        {entry.update_note}
                      </span>
                    )}
                  </div>
                </div>

                {/* Changes */}
                <div className="divide-y divide-gray-100">
                  {Object.entries(entry.changes).map(([field, change]) => (
                    <div key={field} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{change.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            {formatValue(field, change.old)}
                          </span>
                          <ArrowRight size={14} className="text-gray-400" />
                          <span className="text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            {formatValue(field, change.new)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
