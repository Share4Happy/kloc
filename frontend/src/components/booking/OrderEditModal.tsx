'use client';

import React, { useState } from 'react';
import type { AxiosError } from 'axios';
import { X, Loader2, Save, History, TrendingUp } from 'lucide-react';
import { orderApi, Order, OrderUpsaleData } from '@/services/order';
import { formatCurrency, parseCurrency, handleCurrencyChange } from '@/lib/currency';
import OrderHistoryModal from './OrderHistoryModal';

interface OrderUpsaleModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderEditModal({ isOpen, order, onClose, onSuccess }: OrderUpsaleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Form state - pre-fill with current order values
  const [totalAmount, setTotalAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('');
  const [kpi, setKpi] = useState('');
  const [postCount, setPostCount] = useState('');
  const [kolRequestNotes, setKolRequestNotes] = useState('');
  const [updateNote, setUpdateNote] = useState('');

  // Pre-fill form when order changes
  React.useEffect(() => {
    if (!order) return;
    setTotalAmount(order.total_amount > 0 ? formatCurrency(order.total_amount) : '');
    setDepositAmount(order.deposit_amount > 0 ? formatCurrency(order.deposit_amount) : '');
    setCampaignName(order.campaign_name || '');
    setPlatform(order.platform || '');
    setKpi(order.kpi || '');
    setPostCount(order.post_count ? String(order.post_count) : '');
    setKolRequestNotes(order.kol_request_notes || '');
    setUpdateNote('');
    setError(null);
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const newTotal = parseCurrency(totalAmount);
    const newDeposit = parseCurrency(depositAmount);

    if (newTotal <= 0) {
      setError('Vui lòng nhập tổng giá trị hợp đồng.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data: OrderUpsaleData = {
        total_amount: newTotal,
        deposit_amount: newDeposit,
        campaign_name: campaignName || undefined,
        platform: platform || undefined,
        kpi: kpi || undefined,
        post_count: postCount ? Number(postCount) : undefined,
        kol_request_notes: kolRequestNotes || undefined,
        update_note: updateNote.trim() || undefined,
      };
      await orderApi.upsaleOrder(order.id, data);
      onSuccess();
      onClose();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể cập nhật đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const hasHistory = order.update_history && order.update_history.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm">
        <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa thông tin đơn hàng</h2>
                <p className="text-sm text-gray-500">Sửa thông tin, ngân sách, ghi chú... #{order.id.slice(0, 8)}</p>
              </div>
              {hasHistory && (
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                  title="Xem lịch sử cập nhật"
                >
                  <History size={12} /> Lịch sử ({order.update_history!.length})
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Lỗi:</strong> {error}
              </div>
            )}

            {/* Current values summary */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-800">Giá trị hiện tại</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Tổng giá trị:</span>{' '}
                  <span className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tiền cọc:</span>{' '}
                  <span className="font-semibold text-gray-900">{formatCurrency(order.deposit_amount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Chiến dịch:</span>{' '}
                  <span className="font-medium text-gray-900">{order.campaign_name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Nền tảng:</span>{' '}
                  <span className="font-medium text-gray-900">{order.platform || '—'}</span>
                </div>
              </div>
            </div>

            {/* New values form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Total Amount */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tổng giá trị mới (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={totalAmount}
                    onChange={(e) => handleCurrencyChange(e, setTotalAmount)}
                    placeholder={formatCurrency(order.total_amount)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Deposit Amount */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Tiền cọc mới (VNĐ)</label>
                  <input
                    type="text"
                    value={depositAmount}
                    onChange={(e) => handleCurrencyChange(e, setDepositAmount)}
                    placeholder={formatCurrency(order.deposit_amount)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Campaign Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Chiến dịch</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder={order.campaign_name || 'Giữ nguyên'}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Platform */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nền tảng</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Giữ nguyên ({order.platform || '—'})</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Đa nền tảng">Đa nền tảng</option>
                  </select>
                </div>

                {/* KPI */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">KPI mới</label>
                  <input
                    type="text"
                    value={kpi}
                    onChange={(e) => setKpi(e.target.value)}
                    placeholder={order.kpi || 'Giữ nguyên'}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Post Count */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Số bài đăng mới</label>
                  <input
                    type="number"
                    min="1"
                    value={postCount}
                    onChange={(e) => setPostCount(e.target.value)}
                    placeholder={order.post_count ? String(order.post_count) : 'Giữ nguyên'}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* KOL Request Notes */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Ghi chú yêu cầu KOL mới</label>
                  <textarea
                    rows={2}
                    value={kolRequestNotes}
                    onChange={(e) => setKolRequestNotes(e.target.value)}
                    placeholder={order.kol_request_notes || 'Giữ nguyên'}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Update Note */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Ghi chú lý do cập nhật
                    <span className="ml-1 text-xs text-gray-400">(VD: khách nâng ngân sách, đổi yêu cầu...)</span>
                  </label>
                  <input
                    type="text"
                    value={updateNote}
                    onChange={(e) => setUpdateNote(e.target.value)}
                    placeholder="VD: Khách muốn nâng lên gói Standard, tăng ngân sách thêm 10tr"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 transition"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Lưu cập nhật
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <OrderHistoryModal
          order={order}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
