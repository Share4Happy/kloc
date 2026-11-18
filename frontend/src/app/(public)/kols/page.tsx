import React from 'react';
import { fetchPublicKOLs } from '@/lib/api-server';
import Link from 'next/link';
import KolsGrid from './KolsGrid';
import type { PublicKOL } from './KolsGrid';

export const revalidate = 3600;

export default async function KOLsPage() {
  const kols: PublicKOL[] = await fetchPublicKOLs();

  return (
    <div className="py-12 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900">Mạng lưới KOL Độc Quyền</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Tìm kiếm và kết nối trực tiếp với hàng trăm Content Creator uy tín nhất hiện nay trên đa nền tảng.
        </p>
      </div>

      <KolsGrid kols={kols} />

      {kols.length > 0 && (
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-6">Không tìm thấy KOL phù hợp cho chiến dịch của bạn?</p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-full transition-colors"
          >
            Liên hệ đội ngũ để được tư vấn riêng
          </Link>
        </div>
      )}
    </div>
  );
}
