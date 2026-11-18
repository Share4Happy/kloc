'use client';

import axios from 'axios';
import React, { useState } from 'react';
import { Users, DollarSign, Package, UserCheck, MessageSquare } from 'lucide-react';
import { leadApi } from '@/services/lead';

interface BookingFormProps {
  submitLabel?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
    return error.response.data.detail;
  }

  return fallback;
}

export default function BookingForm({ submitLabel = 'Gửi yêu cầu ngay' }: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'combo' | 'individual'>('combo');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Build structured message with all booking details
      const structuredMessage = [
        `Loại booking: ${bookingType === 'combo' ? 'Theo gói Combo' : 'Book KOL/KOC lẻ'}`,
        `Ngân sách: ${formData.get('budget') || 'Chưa xác định'}`,
        `Số lượng KOL: ${formData.get('kol_count') || 'Chưa xác định'}`,
        `Nền tảng: ${formData.get('platform') || 'Chưa xác định'}`,
        `---`,
        `Chi tiết: ${formData.get('message') || ''}`,
      ].join('\n');

      await leadApi.createLead({
        full_name: String(formData.get('full_name') || ''),
        phone: String(formData.get('phone') || ''),
        company: String(formData.get('company') || '') || undefined,
        message: structuredMessage,
        source: 'booking_form',
      });

      form.reset();
      setSuccess(true);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Khong the gui yeu cau. Vui long thu lai.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
      return (
          <div className="bg-green-50 text-green-700 p-8 rounded-2xl text-center border border-green-100">
              <h3 className="text-xl font-bold mb-2">Gửi yêu cầu thành công!</h3>
              <p>Đội ngũ chuyên viên của chúng tôi sẽ liên hệ trong 24h tới.</p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-6 text-sm font-medium underline"
              >
                  Gửi yêu cầu khác
              </button>
          </div>
      )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border space-y-6">
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Section 1: Thông tin liên hệ */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users size={14} className="text-blue-500" />
            Thông tin liên hệ
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                required
                className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 outline-none transition border"
                placeholder="VD: Nguyễn Văn A"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 outline-none transition border"
                    placeholder="0912 345 678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu / Công ty</label>
                  <input
                    type="text"
                    name="company"
                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 outline-none transition border"
                    placeholder="Brand Name"
                  />
                </div>
            </div>
          </div>
        </div>

        {/* Section 2: Hình thức dịch vụ */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Package size={14} className="text-purple-500" />
            Hình thức dịch vụ <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBookingType('combo')}
              className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                bookingType === 'combo'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package size={16} />
                <span className="text-sm font-medium">Theo gói Combo</span>
              </div>
              <p className="text-xs mt-1 opacity-70">Starter, Standard, Viral...</p>
            </button>
            <button
              type="button"
              onClick={() => setBookingType('individual')}
              className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                bookingType === 'individual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck size={16} />
                <span className="text-sm font-medium">Book KOL/KOC lẻ</span>
              </div>
              <p className="text-xs mt-1 opacity-70">Chọn từng KOL/KOC</p>
            </button>
          </div>
        </div>

        {/* Section 3: Ngân sách & Chi tiết chiến dịch */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <DollarSign size={14} className="text-emerald-500" />
            Ngân sách & Chi tiết chiến dịch
          </h3>
          <div className="space-y-4">
            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mức ngân sách <span className="text-red-500">*</span>
              </label>
              <select
                name="budget"
                required
                className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 outline-none transition border bg-white"
              >
                <option value="">-- Chọn khoảng ngân sách --</option>
                <option value="Dưới 10 triệu">Dưới 10.000.000 VNĐ</option>
                <option value="10 - 30 triệu">10.000.000 - 30.000.000 VNĐ</option>
                <option value="30 - 50 triệu">30.000.000 - 50.000.000 VNĐ</option>
                <option value="50 - 100 triệu">50.000.000 - 100.000.000 VNĐ</option>
                <option value="100 - 200 triệu">100.000.000 - 200.000.000 VNĐ</option>
                <option value="Trên 200 triệu">Trên 200.000.000 VNĐ</option>
                <option value="Thỏa thuận">Thỏa thuận</option>
              </select>
            </div>

            {/* Platform & KOL Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[40px] flex items-end">
                  Nền tảng chính <span className="text-red-500">*</span>
                </label>
                <select
                  name="platform"
                  required
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                >
                  <option value="">-- Chọn nền tảng --</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Đa nền tảng">Đa nền tảng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[40px] flex items-end">
                  Số lượng KOL/KOC dự kiến
                </label>
                <select
                  name="kol_count"
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                >
                  <option value="">-- Chọn số lượng --</option>
                  <option value="1-5 KOL">1-5 KOL/KOC</option>
                  <option value="5-10 KOL">5-10 KOL/KOC</option>
                  <option value="10-30 KOL">10-30 KOL/KOC</option>
                  <option value="30-50 KOL">30-50 KOL/KOC</option>
                  <option value="Trên 50 KOL">Trên 50 KOL/KOC</option>
                </select>
              </div>
            </div>

            {/* Campaign Details */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                 <MessageSquare size={14} className="text-gray-400" />
                 Mô tả chi tiết chiến dịch <span className="text-red-500">*</span>
               </label>
               <textarea
                 name="message"
                 required
                 rows={4}
                 className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 outline-none transition border resize-none"
                 placeholder="VD: Chiến dịch ra mắt sản phẩm skincare mới, đối tượng nữ 18-30 tuổi, muốn tập trung vào TikTok Review và YouTube Vlog..."
               />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gray-900 px-4 py-3.5 font-medium text-white hover:bg-gray-800 transition disabled:opacity-70 flex justify-center items-center gap-2"
      >
        {loading ? (
            <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
            <>
              <DollarSign size={16} />
              {submitLabel}
            </>
        )}
      </button>
    </form>
  );
}
