import React from 'react';

import ContactPageClient from '@/components/contact/ContactPageClient';
import { fetchUIConfigs } from '@/lib/api-server';

export const revalidate = 3600;

export default async function ContactPage() {
  const configs = await fetchUIConfigs();

  return (
    <ContactPageClient
      pageTitle={configs.contact_page_title || 'Kết nối với\nĐội ngũ KLOC'}
      pageSubtitle={configs.contact_page_subtitle || 'Bạn cần tư vấn giải pháp Booking KOL tổng thể, hay đang gặp khó khăn trong quá trình đăng ký trở thành đối tác? Đừng ngần ngại để lại lời nhắn.'}
      contactEmail={configs.contact_email || 'support@kloc.vn'}
      partnerEmail={configs.contact_partner_email || 'partners@kloc.vn'}
      contactPhone={configs.contact_phone || '1900 1234'}
      secondaryPhone={configs.contact_hotline_secondary || '0987 654 321 (Zalo doanh nghiệp)'}
      contactAddress={configs.contact_address || 'Toà nhà KLOC, Tầng 12\nSố 1 Đường Vành Đai, Quận 1\nTP. Hồ Chí Minh, Việt Nam'}
      formTitle={configs.contact_form_title || 'Gửi yêu cầu trực tuyến'}
      successMessage={configs.contact_success_message || 'Cảm ơn bạn đã liên hệ. Đội ngũ KLOC sẽ phản hồi vào hòm thư của bạn trong vòng 24 giờ tới.'}
    />
  );
}
