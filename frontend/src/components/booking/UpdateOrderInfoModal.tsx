'use client';

import React, { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import { X, Loader2, Save, MessageSquare } from 'lucide-react';
import { orderApi, Order, OrderInfoUpdateData } from '@/services/order';
import { formatCurrency, parseCurrency, handleCurrencyChange } from '@/lib/currency';

interface UpdateOrderInfoModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdateOrderInfoModal({ isOpen, order, onClose, onSuccess }: UpdateOrderInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalAmount, setTotalAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('');
  const [kpi, setKpi] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerRepresentative, setCustomerRepresentative] = useState('');
  const [bookingType, setBookingType] = useState<'custom' | 'combo'>('custom');
  const [postCount, setPostCount] = useState('');
  const [kolRequestNotes, setKolRequestNotes] = useState('');
  const [budgetInfo, setBudgetInfo] = useState('');

  useEffect(() => {
    if (!order) return;
    setTotalAmount(order.total_amount > 0 ? formatCurrency(order.total_amount) : '');
    setDepositAmount(order.deposit_amount > 0 ? formatCurrency(order.deposit_amount) : '');
    setCampaignName(order.campaign_name || '');
    setPlatform(order.platform || '');
    setKpi(order.kpi || '');
    setCustomerName(order.customer_name || '');
    setCustomerRepresentative(order.customer_representative || '');
    setBookingType(order.booking_type || 'custom');
    setPostCount(order.post_count ? String(order.post_count) : '');
    
    // Parse kol_request_notes: tách ngân sách ra banner, phần còn lại vào textarea
    const rawNotes = order.kol_request_notes || '';
    const lines = rawNotes.split('\n');
    let budget = '';
    const noteLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('💰 Ngân sách:')) {
        budget = line.replace('💰 Ngân sách:', '').trim();
      } else {
        noteLines.push(line);
      }
    }
    setBudgetInfo(budget);
    setKolRequestNotes(noteLines.join('\n').trim());
    setError(null);
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (parseCurrency(totalAmount) <= 0) {
      setError('Vui lòng nhập tổng giá trị hợp đồng.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Ghép lại kol_request_notes đầy đủ khi lưu
      const finalNotes = [
        budgetInfo ? `💰 Ngân sách: ${budgetInfo}` : null,
        kolRequestNotes.trim(),
      ].filter(Boolean).join('\n');

      const data: OrderInfoUpdateData = {
        total_amount: parseCurrency(totalAmount),
        deposit_amount: parseCurrency(depositAmount),
        campaign_name: campaignName || undefined,
        platform: platform || undefined,
        kpi: kpi || undefined,
        customer_name: customerName || undefined,
        customer_representative: customerRepresentative || undefined,
        booking_type: bookingType,
        post_count: postCount ? Number(postCount) : undefined,
        kol_request_notes: finalNotes || undefined,
      };
      await orderApi.updateOrderInfo(order.id, data);
      onSuccess();
      onClose();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể cập nhật thông tin đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm">
      <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cập nhật thông tin đơn hàng</h2>
            <p className="text-sm text-gray-500">#{order.id.slice(0, 8)}</p>
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

          {/* Budget Banner - tách riêng, không vào ô nào */}
          {budgetInfo && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">💰 Ngân sách dự kiến từ khách hàng</p>
              <p className="text-xl font-bold text-amber-900 mt-1">{budgetInfo}</p>
              <p className="text-xs text-amber-700 mt-1">Thông tin tự động trích xuất từ form landing page</p>
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> KOL sẽ được Quản lý Talent phân bổ. Bạn chỉ cần cập nhật thông tin chiến dịch và ghi chú yêu cầu KOL.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Total Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tổng giá trị hợp đồng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={totalAmount}
                onChange={(e) => handleCurrencyChange(e, setTotalAmount)}
                placeholder="VD: 10.000.000"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Số tiền cọc</label>
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => handleCurrencyChange(e, setDepositAmount)}
                placeholder="VD: 3.000.000"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Campaign Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên chiến dịch</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="VD: Chiến dịch Tết 2026"
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
                <option value="">Chọn nền tảng</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            {/* Booking Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Loại booking</label>
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value as 'custom' | 'combo')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="custom">Custom</option>
                <option value="combo">Combo</option>
              </select>
            </div>

            {/* Post Count */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Số bài đăng</label>
              <input
                type="number"
                min="1"
                value={postCount}
                onChange={(e) => setPostCount(e.target.value)}
                placeholder="VD: 3"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* KPI */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">KPI</label>
              <input
                type="text"
                value={kpi}
                onChange={(e) => setKpi(e.target.value)}
                placeholder="VD: 100k views, 5k likes"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên khách hàng</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="VD: Công ty ABC"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customer Representative */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Người đại diện ký hợp đồng</label>
              <input
                type="text"
                value={customerRepresentative}
                onChange={(e) => setCustomerRepresentative(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* KOL Request Notes */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageSquare size={14} className="text-gray-400" />
                Ghi chú yêu cầu KOL
                <span className="ml-1 text-xs font-normal text-gray-400">(KOL Manager sẽ phân bổ)</span>
              </label>
              <textarea
                rows={3}
                value={kolRequestNotes}
                onChange={(e) => setKolRequestNotes(e.target.value)}
                placeholder="VD: Cần KOL nữ 18-28 tuổi, phong cách năng động, niche skincare/beauty, follower 50k-200k..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
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
              Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
