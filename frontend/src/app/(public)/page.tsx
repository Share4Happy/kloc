import React from 'react';
import BookingForm from '@/components/booking/BookingForm';
import { fetchUIConfigs, fetchPublicKOLs } from '@/lib/api-server';
import { Youtube, Instagram } from 'lucide-react';
import Link from 'next/link';

// Next.js Route Segment Config for ISR (Revalidate every hour)
export const revalidate = 3600;

export default async function LandingPage() {
  const [configs, kols] = await Promise.all([
    fetchUIConfigs(),
    fetchPublicKOLs()
  ]);

  const showBanner = configs.show_banner !== false;
  const heroBadgeText = configs.hero_badge_text || 'Khoi chay Nen tang KLOC v1.0';
  const heroTitle = configs.hero_title || 'Kết nối Brand và KOL dễ dàng';
  const heroSubtitle = configs.hero_subtitle || 'Nền tảng booking hàng đầu Việt Nam. Tối ưu chi phí, minh bạch hiệu quả.';
  const heroPrimaryButtonLabel = configs.hero_primary_button_label || 'Khám phá KOL ngay';
  const heroSecondaryButtonLabel = configs.hero_secondary_button_label || 'Tôi là KOL/KOC';

  const showKolSection = configs.show_kol_section !== false;
  const kolSectionTitle = configs.kol_section_title || 'KOL Nổi Bật';
  const kolSectionSubtitle = configs.kol_section_subtitle || 'Những gương mặt sáng giá nhất trên hệ thống KLOC';

  const showBookingCta = configs.show_booking_cta !== false;
  const bookingCtaTitle = configs.booking_cta_title || 'Bạn đã nhắm được KOL phù hợp?';
  const bookingCtaSubtitle = configs.booking_cta_subtitle || 'Gửi ngay số liệu chiến dịch, chúng tôi sẽ setup cuộc hẹn và chốt hợp đồng trong chớp mắt mà không cần qua nhiều khâu trung gian.';
  const bookingCtaButtonLabel = configs.booking_cta_button_label || 'Gửi yêu cầu ngay';
  const bookingCtaPoints = [
    configs.booking_cta_point_1 || 'Hợp đồng pháp lý minh bạch',
    configs.booking_cta_point_2 || 'Chi phí rõ ràng, không phụ phí ẩn',
    configs.booking_cta_point_3 || 'Cam kết KPI hiệu suất chiến dịch',
  ];

  // Format currency
  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  return (
    <div className="flex flex-col gap-24 py-12 md:py-24">
      {/* HERO SECTION */}
      {showBanner && (
        <section className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 mb-4">
            {heroBadgeText}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
            {heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
            {heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
             <Link href="#kols" className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition w-full sm:w-auto">
               {heroPrimaryButtonLabel}
             </Link>
             <Link href="/register" className="px-8 py-4 bg-white text-gray-900 border font-semibold rounded-full hover:bg-gray-50 transition shadow-sm w-full sm:w-auto text-center">
               {heroSecondaryButtonLabel}
             </Link>
          </div>
        </section>
      )}

      {/* TOP KOLS GRID */}
      {showKolSection && (
      <section id="kols" className="space-y-12 scroll-mt-24">
         <div className="text-center space-y-3">
             <h2 className="text-3xl font-bold text-gray-900">{kolSectionTitle}</h2>
             <p className="text-gray-500">{kolSectionSubtitle}</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(kols as Array<{ id: string; user_id: string; avatar_path?: string | null; user?: { full_name?: string; email?: string }; niche?: string[]; min_price?: number; social_links?: Record<string, string> | null }>).map((kol) => (
                <div key={kol.id} className="group bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer p-4">
                    <div className="aspect-[4/5] w-full bg-gray-100 rounded-2xl mb-4 overflow-hidden relative">
                    {kol.avatar_path ? (
                      <img
                       src={`/api-backend/kol/${kol.user_id}/avatar`}
                       alt={kol.user?.full_name || 'KOL avatar'}
                       className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-gray-50 mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                    )}
                    </div>
                    
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg line-clamp-1">
                              {kol.user?.full_name || kol.user?.email}
                            </h3>
                            
                            {kol.niche && kol.niche.length > 0 && (
                                <div className="mt-2 text-xs text-gray-600 font-medium truncate">
                                    {kol.niche.join(', ')}
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t flex items-center justify-between text-sm">
                           <div className="font-semibold text-gray-900">
                               {formatMoney(kol.min_price ?? 0)}
                           </div>
                           <div className="flex items-center gap-2 text-gray-400">
                                {Object.keys(kol.social_links ?? {}).includes('youtube') && <Youtube size={16} />}
                                {Object.keys(kol.social_links ?? {}).includes('instagram') && <Instagram size={16} />}
                                {!kol.social_links && <><Youtube size={16} /><Instagram size={16} /></>}
                           </div>
                        </div>
                    </div>
                </div>
            ))}

            {kols.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 border border-dashed rounded-3xl">
                    Chưa có KOL nào công khai
                </div>
            )}
         </div>
         
         {kols.length > 0 && (
             <div className="flex justify-center mt-8">
                 <Link href="/kols" className="px-6 py-2.5 bg-gray-50 hover:bg-gray-100 font-medium text-sm rounded-full border transition text-gray-700">
                     Xem tất cả danh sách
                 </Link>
             </div>
         )}
      </section>
      )}

      {/* QUICK BOOKING SECTION */}
      {showBookingCta && (
      <section className="bg-gray-50 rounded-[2.5rem] p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center">
         <div className="flex-1 space-y-6">
             <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{bookingCtaTitle}</h2>
             <p className="text-gray-500 text-lg">{bookingCtaSubtitle}</p>
             <ul className="space-y-4 pt-4">
                 {bookingCtaPoints.filter(Boolean).map((point, index) => (
                   <li key={point} className="flex items-center gap-3 text-gray-700 font-medium">
                     <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">{index + 1}</div>
                     {point}
                   </li>
                 ))}
             </ul>
         </div>

         <div className="flex-1 w-full max-w-md relative">
             <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-10 rounded-full" />
             <div className="relative">
                 <BookingForm submitLabel={bookingCtaButtonLabel} />
             </div>
         </div>
      </section>
      )}
    </div>
  );
}
