'use client';

import axios from 'axios';
import React, { useState } from 'react';
import { CheckCircle2, Loader2, Mail, MapPin, Phone, Send } from 'lucide-react';

import { leadApi } from '@/services/lead';

interface ContactPageClientProps {
  pageTitle: string;
  pageSubtitle: string;
  contactEmail: string;
  partnerEmail: string;
  contactPhone: string;
  secondaryPhone: string;
  contactAddress: string;
  formTitle: string;
  successMessage: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
    return error.response.data.detail;
  }

  return fallback;
}

export default function ContactPageClient({
  pageTitle,
  pageSubtitle,
  contactEmail,
  partnerEmail,
  contactPhone,
  secondaryPhone,
  contactAddress,
  formTitle,
  successMessage,
}: ContactPageClientProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      await leadApi.createLead({
        full_name: String(formData.get('full_name') || ''),
        phone: String(formData.get('phone') || ''),
        email: String(formData.get('email') || '') || undefined,
        subject: String(formData.get('subject') || '') || undefined,
        message: String(formData.get('message') || ''),
        source: 'contact_form',
      });

      form.reset();
      setSuccess(true);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Khong the gui lien he. Vui long thu lai.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="grid lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 whitespace-pre-line">{pageTitle}</h1>
            <p className="text-lg text-gray-500 whitespace-pre-line">{pageSubtitle}</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Email Hỗ Trợ</h3>
                <p className="text-gray-500">{contactEmail}</p>
                <p className="text-gray-500">{partnerEmail} (Dành cho KOL)</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Hotline (24/7)</h3>
                <p className="text-gray-500">{contactPhone}</p>
                <p className="text-gray-500">{secondaryPhone}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Trụ sở chính</h3>
                <p className="text-gray-500 leading-relaxed whitespace-pre-line">{contactAddress}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-gray-200/40 border border-gray-100">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="text-green-500 bg-green-50 p-4 rounded-full mb-4">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Gửi thành công!</h3>
              <p className="text-gray-500 whitespace-pre-line">{successMessage}</p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-8 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-colors"
              >
                Gửi tin nhắn khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">{formTitle}</h3>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Họ và tên *</label>
                  <input name="full_name" type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="Nguyễn Văn A" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Số điện thoại *</label>
                  <input name="phone" type="tel" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="0912..." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input name="email" type="email" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="name@company.com" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Chủ đề mong muốn</label>
                <select name="subject" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-700">
                  <option>Tư vấn chiến dịch Booking</option>
                  <option>Báo lỗi nền tảng</option>
                  <option>Đăng ký trở thành KOL</option>
                  <option>Khác</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nội dung chi tiết *</label>
                <textarea name="message" required rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none" placeholder="Vui lòng mô tả chi tiết yêu cầu của bạn..." />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang vận chuyển...</>
                ) : (
                  <><Send size={18} /> Gửi tin nhắn ngay</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}