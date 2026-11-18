'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import { api } from '@/lib/axios';

type FieldType = 'text' | 'email' | 'url' | 'toggle' | 'textarea';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
}

interface SectionDef {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
}

const SETTINGS_SCHEMA: SectionDef[] = [
  {
    id: 'hero',
    title: 'Khu vực Hero Banner',
    description: 'Kiểm soát badge, tiêu đề và CTA mở đầu của landing page.',
    fields: [
      { key: 'show_banner', label: 'Hiển thị Hero Banner', type: 'toggle', hint: 'Tắt để ẩn hoàn toàn khối Hero Banner khỏi trang chủ.' },
      { key: 'hero_badge_text', label: 'Badge nhỏ phía trên', type: 'text', placeholder: 'Khởi chạy Nền tảng KLOC v1.0' },
      { key: 'hero_title', label: 'Tiêu đề chính (H1)', type: 'text', placeholder: 'Kết nối Brand và KOL dễ dàng' },
      { key: 'hero_subtitle', label: 'Tiêu đề phụ', type: 'textarea', placeholder: 'Nền tảng booking hàng đầu Việt Nam...' },
      { key: 'hero_primary_button_label', label: 'Nhãn CTA chính', type: 'text', placeholder: 'Khám phá KOL ngay' },
      { key: 'hero_secondary_button_label', label: 'Nhãn CTA phụ', type: 'text', placeholder: 'Tôi là KOL/KOC' },
    ],
  },
  {
    id: 'kol_section',
    title: 'Khu vực KOL Nổi Bật',
    description: 'Section hiển thị danh sách KOL đã được duyệt trên trang chủ.',
    fields: [
      { key: 'show_kol_section', label: 'Hiển thị KOL section', type: 'toggle', hint: 'Tắt để ẩn toàn bộ grid KOL khỏi trang chủ.' },
      { key: 'kol_section_title', label: 'Tiêu đề section', type: 'text', placeholder: 'KOL Nổi Bật' },
      { key: 'kol_section_subtitle', label: 'Mô tả section', type: 'textarea', placeholder: 'Những gương mặt sáng giá nhất trên hệ thống KLOC' },
    ],
  },
  {
    id: 'booking_cta',
    title: 'Khu vực Booking CTA',
    description: 'Khối CTA đặt lịch nhanh và 3 lợi ích đi kèm trên landing page.',
    fields: [
      { key: 'show_booking_cta', label: 'Hiển thị khối Booking CTA', type: 'toggle', hint: 'Tắt để ẩn section form booking khỏi trang chủ.' },
      { key: 'booking_cta_title', label: 'Tiêu đề CTA', type: 'text', placeholder: 'Bạn đã nhắm được KOL phù hợp?' },
      { key: 'booking_cta_subtitle', label: 'Nội dung giới thiệu', type: 'textarea', placeholder: 'Gửi ngay số liệu chiến dịch...' },
      { key: 'booking_cta_button_label', label: 'Nhãn nút form booking', type: 'text', placeholder: 'Gửi yêu cầu ngay' },
      { key: 'booking_cta_point_1', label: 'Điểm nổi bật số 1', type: 'text', placeholder: 'Hợp đồng pháp lý minh bạch' },
      { key: 'booking_cta_point_2', label: 'Điểm nổi bật số 2', type: 'text', placeholder: 'Chi phí rõ ràng, không phụ phí ẩn' },
      { key: 'booking_cta_point_3', label: 'Điểm nổi bật số 3', type: 'text', placeholder: 'Cam kết KPI hiệu suất chiến dịch' },
    ],
  },
  {
    id: 'about_intro',
    title: 'Trang About: Giới thiệu công ty',
    description: 'Nội dung mở đầu và profile doanh nghiệp cho trang giới thiệu.',
    fields: [
      { key: 'about_page_title', label: 'Tiêu đề trang About', type: 'text', placeholder: 'Về Chúng Tôi' },
      { key: 'about_page_subtitle', label: 'Mô tả mở đầu', type: 'textarea', placeholder: 'KLOC - Nền tảng Booking KOL/KOC chuyên nghiệp...' },
    ],
  },
  {
    id: 'about_values',
    title: 'Trang About: Giá trị cốt lõi',
    description: '4 block nội dung thể hiện giá trị thương hiệu và cách vận hành.',
    fields: [
      { key: 'about_value_1_title', label: 'Value 1: Tiêu đề', type: 'text', placeholder: 'Minh bạch tuyệt đối' },
      { key: 'about_value_1_desc', label: 'Value 1: Nội dung', type: 'textarea', placeholder: 'Mọi quy trình từ báo giá...' },
      { key: 'about_value_2_title', label: 'Value 2: Tiêu đề', type: 'text', placeholder: 'Tốc độ chớp nhoáng' },
      { key: 'about_value_2_desc', label: 'Value 2: Nội dung', type: 'textarea', placeholder: 'Hợp đồng điện tử ký duyệt...' },
      { key: 'about_value_3_title', label: 'Value 3: Tiêu đề', type: 'text', placeholder: 'Đúng Niche, Đúng Target' },
      { key: 'about_value_3_desc', label: 'Value 3: Nội dung', type: 'textarea', placeholder: 'Với tệp Data sâu rộng...' },
      { key: 'about_value_4_title', label: 'Value 4: Tiêu đề', type: 'text', placeholder: 'Đồng hành sát sao' },
      { key: 'about_value_4_desc', label: 'Value 4: Nội dung', type: 'textarea', placeholder: 'Trạm quản lý riêng biệt...' },
    ],
  },
  {
    id: 'about_stats',
    title: 'Trang About: Social Proof',
    description: 'Các metric ngắn để tăng cảm giác trust và company profile.',
    fields: [
      { key: 'show_about_stats', label: 'Hiển thị khối social proof', type: 'toggle', hint: 'Tắt để ẩn toàn bộ dải metrics trên trang About.' },
      { key: 'about_stat_1_value', label: 'Metric 1: Giá trị', type: 'text', placeholder: '300+' },
      { key: 'about_stat_1_label', label: 'Metric 1: Nhãn', type: 'text', placeholder: 'Chiến dịch đã khởi chạy' },
      { key: 'about_stat_2_value', label: 'Metric 2: Giá trị', type: 'text', placeholder: '120+' },
      { key: 'about_stat_2_label', label: 'Metric 2: Nhãn', type: 'text', placeholder: 'Nhãn hàng đồng hành' },
      { key: 'about_stat_3_value', label: 'Metric 3: Giá trị', type: 'text', placeholder: '1.000+' },
      { key: 'about_stat_3_label', label: 'Metric 3: Nhãn', type: 'text', placeholder: 'KOL/KOC trong hệ sinh thái' },
    ],
  },
  {
    id: 'about_cta',
    title: 'Trang About: CTA cuối trang',
    description: 'Khối chốt chuyển đổi ở cuối trang giới thiệu.',
    fields: [
      { key: 'about_cta_title', label: 'Tiêu đề CTA', type: 'text', placeholder: 'Bạn đã sẵn sàng khởi chạy chiến dịch?' },
      { key: 'about_cta_subtitle', label: 'Mô tả CTA', type: 'textarea', placeholder: 'Hàng trăm nhãn hàng đã tin tưởng...' },
      { key: 'about_cta_primary_label', label: 'Nhãn CTA chính', type: 'text', placeholder: 'Book Lịch Tư Vấn' },
      { key: 'about_cta_secondary_label', label: 'Nhãn CTA phụ', type: 'text', placeholder: 'Tôi là KOL/KOC' },
    ],
  },
  {
    id: 'navigation',
    title: 'Nhãn Điều Hướng',
    description: 'Tùy chỉnh nhãn các mục trên thanh điều hướng công khai.',
    fields: [
      { key: 'nav_kols_label', label: 'Nhãn mục KOLs', type: 'text', placeholder: 'Khám phá KOL' },
      { key: 'nav_about_label', label: 'Nhãn mục Giới thiệu', type: 'text', placeholder: 'Về chúng tôi' },
      { key: 'nav_contact_label', label: 'Nhãn mục Liên hệ', type: 'text', placeholder: 'Liên hệ' },
    ],
  },
  {
    id: 'contact_page',
    title: 'Trang Contact',
    description: 'Nội dung mở đầu, thông tin liên hệ và thông điệp form thành công.',
    fields: [
      { key: 'contact_page_title', label: 'Tiêu đề trang Contact', type: 'textarea', placeholder: 'Kết nối với\nĐội ngũ KLOC' },
      { key: 'contact_page_subtitle', label: 'Mô tả mở đầu', type: 'textarea', placeholder: 'Bạn cần tư vấn giải pháp Booking KOL tổng thể...' },
      { key: 'contact_form_title', label: 'Tiêu đề form', type: 'text', placeholder: 'Gửi yêu cầu trực tuyến' },
      { key: 'contact_success_message', label: 'Thông điệp gửi thành công', type: 'textarea', placeholder: 'Cảm ơn bạn đã liên hệ...' },
      { key: 'contact_partner_email', label: 'Email dành cho đối tác / KOL', type: 'email', placeholder: 'partners@kloc.vn' },
      { key: 'contact_hotline_secondary', label: 'Hotline phụ / Zalo', type: 'text', placeholder: '0987 654 321 (Zalo doanh nghiệp)' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer & Thông tin Liên hệ',
    description: 'Địa chỉ, số điện thoại, mạng xã hội và text bản quyền hiển thị cuối trang.',
    fields: [
      { key: 'contact_email', label: 'Email liên hệ chính', type: 'email', placeholder: 'contact@kloc.vn' },
      { key: 'contact_phone', label: 'Số điện thoại chính', type: 'text', placeholder: '1900 1234' },
      { key: 'contact_address', label: 'Địa chỉ công ty', type: 'textarea', placeholder: 'Toà nhà KLOC, Tầng 12\nSố 1 Đường Vành Đai, Quận 1\nTP. Hồ Chí Minh, Việt Nam' },
      { key: 'footer_facebook_url', label: 'URL Facebook', type: 'url', placeholder: 'https://facebook.com/kloc' },
      { key: 'footer_tiktok_url', label: 'URL TikTok', type: 'url', placeholder: 'https://tiktok.com/@kloc' },
      { key: 'footer_copyright', label: 'Văn bản Copyright', type: 'text', placeholder: '© 2026 KLOCPlatform. All rights reserved.' },
    ],
  },
];

const ALL_TOGGLE_KEYS = new Set(['show_banner', 'show_kol_section', 'show_booking_cta', 'show_about_stats']);

function buildDefaultState(): Record<string, string | boolean> {
  const defaults: Record<string, string | boolean> = {};
  for (const section of SETTINGS_SCHEMA) {
    for (const field of section.fields) {
      defaults[field.key] = ALL_TOGGLE_KEYS.has(field.key) ? true : '';
    }
  }
  return defaults;
}

function ToggleField({
  field, value, onChange,
}: { field: FieldDef; value: boolean; onChange: (key: string, v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{field.label}</p>
        {field.hint && <p className="text-xs text-gray-500 mt-0.5">{field.hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(field.key, !value)}
        className={`shrink-0 transition ${value ? 'text-blue-600' : 'text-gray-300'}`}
        aria-pressed={value}
      >
        {value ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
      </button>
    </div>
  );
}

function TextField({
  field, value, onChange,
}: { field: FieldDef; value: string; onChange: (key: string, v: string) => void }) {
  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition resize-y"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
      <input
        type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string | boolean>>(buildDefaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState(SETTINGS_SCHEMA[0].id);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data } = await api.get<Record<string, unknown>>('/configs');
        setConfigs((prev) => ({ ...prev, ...(data as Record<string, string | boolean>) }));
      } catch {
        setMessage({ type: 'error', text: 'Không thể tải cấu hình từ máy chủ.' });
      } finally {
        setLoading(false);
      }
    };

    void fetchConfigs();
  }, []);

  const handleToggle = (key: string, value: boolean) =>
    setConfigs((prev) => ({ ...prev, [key]: value }));

  const handleText = (key: string, value: string) =>
    setConfigs((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/configs', configs);
      setMessage({
        type: 'success',
        text: 'Đã lưu cấu hình thành công. Public pages sẽ được revalidate ngay.',
      });
    } catch {
      setMessage({ type: 'error', text: 'Đã xảy ra lỗi khi lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminRouteGuard>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </AdminRouteGuard>
    );
  }

  const currentSection = SETTINGS_SCHEMA.find((section) => section.id === activeSection) ?? SETTINGS_SCHEMA[0];

  return (
    <AdminRouteGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Giao diện Công khai</h1>
          <p className="text-gray-500 text-sm mt-1">
            Chỉnh sửa landing page, company profile và contact page theo hướng config-driven mà không cần sửa source code.
          </p>
        </div>

        {message && (
          <div
            className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="lg:w-64 shrink-0">
            <ul className="space-y-1">
              {SETTINGS_SCHEMA.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-6 py-5 border-b bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">{currentSection.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{currentSection.description}</p>
            </div>

            <div className="p-6 space-y-5">
              {currentSection.fields.map((field) => (
                field.type === 'toggle' ? (
                  <ToggleField
                    key={field.key}
                    field={field}
                    value={configs[field.key] === true}
                    onChange={handleToggle}
                  />
                ) : (
                  <TextField
                    key={field.key}
                    field={field}
                    value={typeof configs[field.key] === 'string' ? (configs[field.key] as string) : ''}
                    onChange={handleText}
                  />
                )
              ))}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-70 flex items-center gap-2 min-w-[140px] justify-center"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminRouteGuard>
  );
}

