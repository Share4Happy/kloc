'use client';

import React, { useState } from 'react';
import { orderApi } from '@/services/order';
import { useAuthStore } from '@/store/authStore';
import { X, Loader2, DollarSign, Briefcase, Target, Package, MessageSquare, Plus } from 'lucide-react';
import { formatCurrency, parseCurrency, handleCurrencyChange } from '@/lib/currency';

// ---------------------------------------------------------------------------
// Combo preset catalogue
// ---------------------------------------------------------------------------
interface ComboPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  suggested_amount: number;
  post_count: number;
  kpi_hint: string;
  platform: string;
  color: string;
}

const COMBO_PRESETS: ComboPreset[] = [
  {
    id: 'combo_starter',
    name: 'Gói Starter',
    badge: 'Micro · 1-30 KOLs',
    description: 'Phù hợp chiến dịch nhỏ, thử nghiệm thương hiệu. 1 KOL / slot.',
    suggested_amount: 5_000_000,
    post_count: 3,
    kpi_hint: '30k views, 1k likes',
    platform: 'TikTok',
    color: 'border-blue-200 bg-blue-50',
  },
  {
    id: 'combo_standard',
    name: 'Gói Standard',
    badge: 'Mid · 2-60 KOLs',
    description: 'Chiến dịch tầm trung, nhận diện thương hiệu diện rộng. 1 KOL / slot.',
    suggested_amount: 15_000_000,
    post_count: 8,
    kpi_hint: '150k views, 8k likes, 1k shares',
    platform: 'TikTok',
    color: 'border-purple-200 bg-purple-50',
  },
  {
    id: 'combo_viral',
    name: 'Gói Viral Campaign',
    badge: 'Large · Đa nền tảng',
    description: 'Chiến dịch viral quy mô lớn, đa nền tảng. 1 KOL / slot.',
    suggested_amount: 35_000_000,
    post_count: 20,
    kpi_hint: '500k views, 50k likes, 10k comments',
    platform: 'TikTok',
    color: 'border-amber-200 bg-amber-50',
  },
];

// ---------------------------------------------------------------------------

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core info
  const [totalAmount, setTotalAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  // Business / campaign info
  const [customerName, setCustomerName] = useState('');
  const [customerRepresentative, setCustomerRepresentative] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [kpi, setKpi] = useState('');
  const [bookingType, setBookingType] = useState<'custom' | 'combo'>('custom');
  const [postCount, setPostCount] = useState('1');

  // KOL request notes (for KOL Manager to assign later)
  const [kolRequestNotes, setKolRequestNotes] = useState('');

  // Combo preset selection
  const [selectedPreset, setSelectedPreset] = useState<ComboPreset | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setTotalAmount('');
    setDepositAmount('');
    setCustomerName('');
    setCustomerRepresentative('');
    setCampaignName('');
    setPlatform('TikTok');
    setKpi('');
    setBookingType('custom');
    setPostCount('1');
    setSelectedPreset(null);
    setKolRequestNotes('');
  };

  const applyPreset = (preset: ComboPreset) => {
    setSelectedPreset(preset);
    setTotalAmount(formatCurrency(preset.suggested_amount));
    setPostCount(String(preset.post_count));
    setPlatform(preset.platform);
    setKpi(preset.kpi_hint);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!totalAmount || parseCurrency(totalAmount) <= 0) {
      setError('Vui lòng nhập tổng giá trị hợp đồng.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await orderApi.createOrder({
        sale_id: user.id,
        kol_id: undefined, // KOL sẽ được KOL Manager phân bổ sau
        total_amount: parseCurrency(totalAmount),
        deposit_amount: parseCurrency(depositAmount),
        customer_name: customerName || undefined,
        customer_representative: customerRepresentative || undefined,
        campaign_name: campaignName || undefined,
        platform: platform || undefined,
        kpi: kpi || undefined,
        booking_type: bookingType,
        post_count: postCount ? parseInt(postCount, 10) : undefined,
        kol_request_notes: kolRequestNotes.trim() || undefined,
        package_definition: selectedPreset
          ? {
              preset_id: selectedPreset.id,
              preset_name: selectedPreset.name,
              badge: selectedPreset.badge,
              suggested_amount: selectedPreset.suggested_amount,
            }
          : undefined,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { detail?: string } } };
      setError(e2.response?.data?.detail ?? 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'appearance-none block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Tạo Đơn Hàng Mới</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="whitespace-pre-line break-words p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm flex gap-2 items-start">
              <span className="font-bold">!</span> {error}
            </div>
          )}

          <form id="create-order-form" onSubmit={handleSubmit} className="space-y-6">

            {/* ── Section 1: Loại booking ────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Loại Booking</h3>
              </div>
              <div className="flex gap-3">
                {(['custom', 'combo'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setBookingType(type);
                      if (type === 'custom') setSelectedPreset(null);
                    }}
                    className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition ${
                      bookingType === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type === 'custom' ? (
                      <>
                        <Package size={14} className="inline mr-1.5" />
                        Custom (đơn lẻ)
                      </>
                    ) : (
                      <>
                        <Package size={14} className="inline mr-1.5" />
                        Combo (gói)
                      </>
                    )}
                  </button>
                ))}
              </div>

              {/* Combo preset cards */}
              {bookingType === 'combo' && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chọn gói preset (tùy chỉnh sau)</p>
                  {COMBO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition ${
                        selectedPreset?.id === preset.id
                          ? 'border-blue-500 ring-2 ring-blue-100'
                          : `${preset.color} border hover:border-gray-400`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">{preset.name}</span>
                          <span className="ml-2 px-2 py-0.5 text-[11px] font-medium rounded-full bg-white/80 text-gray-600 border border-gray-200">
                            {preset.badge}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(preset.suggested_amount)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{preset.description}</p>
                      <p className="mt-1 text-xs text-gray-400">KPI gợi ý: {preset.kpi_hint} · {preset.post_count} bài · {preset.platform}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 2: Giá trị đơn hàng ────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Giá trị đơn hàng</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Tổng giá trị (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <DollarSign size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={totalAmount}
                      onChange={(e) => handleCurrencyChange(e, setTotalAmount)}
                      onFocus={(e) => e.target.select()}
                      className={`pl-9 ${inputClass}`}
                      placeholder="20.000.000"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Tiền cọc (VNĐ)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <DollarSign size={16} />
                    </div>
                    <input
                      type="text"
                      value={depositAmount}
                      onChange={(e) => handleCurrencyChange(e, setDepositAmount)}
                      onFocus={(e) => e.target.select()}
                      className={`pl-9 ${inputClass}`}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Khách hàng / Brand ─────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={16} className="text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Khách hàng / Brand</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Tên công ty / khách hàng</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={inputClass}
                    placeholder="VD: Công ty ABC"
                  />
                </div>
                <div>
                  <label className={labelClass}>Người đại diện</label>
                  <input
                    type="text"
                    value={customerRepresentative}
                    onChange={(e) => setCustomerRepresentative(e.target.value)}
                    className={inputClass}
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 4: Chiến dịch ──────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-green-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Chiến dịch</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Tên chiến dịch</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className={inputClass}
                    placeholder="VD: Campaign Q1 2026"
                  />
                </div>
                <div>
                  <label className={labelClass}>Nền tảng</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className={inputClass}
                  >
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Số lượng content</label>
                  <input
                    type="number"
                    min="1"
                    value={postCount}
                    onChange={(e) => setPostCount(e.target.value)}
                    className={inputClass}
                    placeholder="1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>KPI / Mục tiêu</label>
                  <input
                    type="text"
                    value={kpi}
                    onChange={(e) => setKpi(e.target.value)}
                    className={inputClass}
                    placeholder="VD: 100k views, 5k likes, 500 comments"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 5: Ghi chú yêu cầu KOL (cho KOL Manager phân bổ) ─ */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Ghi chú yêu cầu KOL
                  <span className="ml-1 text-xs font-normal text-gray-400 normal-case">(KOL Manager sẽ phân bổ)</span>
                </h3>
              </div>
              <textarea
                value={kolRequestNotes}
                onChange={(e) => setKolRequestNotes(e.target.value)}
                rows={4}
                className={`resize-none ${inputClass}`}
                placeholder="VD: Cần KOL nữ 18-28 tuổi, phong cách năng động, niche skincare/beauty, follower 50k-200k, có kinh nghiệm review sản phẩm..."
              />
              <p className="mt-1 text-xs text-gray-400">
                Ghi chú càng chi tiết, KOL Manager càng dễ phân bổ KOL phù hợp.
              </p>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-order-form"
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-70 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Tạo Đơn Hàng
          </button>
        </div>

      </div>
    </div>
  );
}
