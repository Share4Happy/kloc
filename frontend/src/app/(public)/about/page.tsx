import React from 'react';
import Link from 'next/link';
import { Shield, Zap, Target, Users } from 'lucide-react';
import { fetchUIConfigs } from '@/lib/api-server';

export const revalidate = 3600;

const VALUE_ICONS = [Shield, Zap, Target, Users] as const;
const VALUE_ACCENTS = [
  'bg-blue-100 text-blue-600',
  'bg-orange-100 text-orange-600',
  'bg-purple-100 text-purple-600',
  'bg-green-100 text-green-600',
] as const;

export default async function AboutPage() {
  const configs = await fetchUIConfigs();

  const pageTitle = configs.about_page_title || 'Về Chúng Tôi';
  const pageSubtitle = configs.about_page_subtitle || 'KLOC - Nền tảng Booking KOL/KOC chuyên nghiệp, minh bạch và hiệu quả nhất Việt Nam. Chúng tôi tin rằng mọi chiến dịch Marketing đều xứng đáng với những gương mặt xuất sắc nhất.';
  const values = [
    {
      title: configs.about_value_1_title || 'Minh bạch tuyệt đối',
      description: configs.about_value_1_desc || 'Mọi quy trình từ báo giá, xét duyệt hợp đồng đến nghiệm thu KPIs đều được quản lý chặt chẽ. Khách hàng luôn biết chính xác nguồn tiền của mình đang được tối ưu như thế nào.',
    },
    {
      title: configs.about_value_2_title || 'Tốc độ chớp nhoáng',
      description: configs.about_value_2_desc || 'Hợp đồng điện tử ký duyệt trong 1 click. Đội ngũ Sale tinh nhuệ luôn trực sẵn cùng bộ công cụ lọc thông minh giúp tìm đúng KOL chỉ trong chưa đầy 30 phút.',
    },
    {
      title: configs.about_value_3_title || 'Đúng Niche, Đúng Target',
      description: configs.about_value_3_desc || 'Với tệp Data sâu rộng, KLOC không chỉ book KOL theo danh tiếng mà còn dựa trên mức độ phù hợp bối cảnh, insight người xem và khả năng chuyển đổi thực tế.',
    },
    {
      title: configs.about_value_4_title || 'Đồng hành sát sao',
      description: configs.about_value_4_desc || 'Trạm quản lý riêng biệt cho Manager và KOL đảm bảo không một báo cáo nào bị bỏ sót hay sai lệch so với điều khoản nghiệm thu ban đầu.',
    },
  ];
  const showAboutStats = configs.show_about_stats !== false;
  const stats = [
    {
      value: configs.about_stat_1_value || '300+',
      label: configs.about_stat_1_label || 'Chiến dịch đã khởi chạy',
    },
    {
      value: configs.about_stat_2_value || '120+',
      label: configs.about_stat_2_label || 'Nhãn hàng đồng hành',
    },
    {
      value: configs.about_stat_3_value || '1.000+',
      label: configs.about_stat_3_label || 'KOL/KOC trong hệ sinh thái',
    },
  ];
  const ctaTitle = configs.about_cta_title || 'Bạn đã sẵn sàng khởi chạy chiến dịch?';
  const ctaSubtitle = configs.about_cta_subtitle || 'Hàng trăm nhãn hàng đã tin tưởng lựa chọn KLOC để mở rộng quy mô. Hãy để chúng tôi đồng hành cùng sự đột phá của bạn.';
  const ctaPrimaryLabel = configs.about_cta_primary_label || 'Book Lịch Tư Vấn';
  const ctaSecondaryLabel = configs.about_cta_secondary_label || 'Tôi là KOL/KOC';

  return (
    <div className="min-h-screen py-16 md:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center space-y-6 mb-20">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900">{pageTitle}</h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          {pageSubtitle}
        </p>
      </div>

      <div className="w-full h-[400px] bg-gray-100 rounded-[2.5rem] mb-20 relative overflow-hidden flex items-center justify-center">
         <div className="absolute inset-0 border-[40px] border-white/20 mix-blend-overlay z-10" />
         <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-blue-50 relative">
             <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
             <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
         </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-20">
        {values.map((item, index) => {
          const Icon = VALUE_ICONS[index];
          return (
            <div key={item.title} className="space-y-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${VALUE_ACCENTS[index]}`}>
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>

      {showAboutStats && (
        <div className="grid gap-4 md:grid-cols-3 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-gray-900">{stat.value}</div>
              <div className="mt-2 text-sm font-medium text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-900 rounded-[2.5rem] p-12 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">{ctaTitle}</h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          {ctaSubtitle}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/contact" className="px-8 py-4 bg-white text-gray-900 font-semibold hover:bg-gray-100 rounded-full transition-colors">
            {ctaPrimaryLabel}
          </Link>
          <Link href="/register" className="px-8 py-4 bg-gray-800 text-white font-semibold hover:bg-gray-700 border border-gray-700 rounded-full transition-colors">
            {ctaSecondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
