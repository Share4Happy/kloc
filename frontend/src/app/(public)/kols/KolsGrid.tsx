'use client';

import React, { useState, useMemo } from 'react';
import { Youtube, Instagram, Search } from 'lucide-react';

export interface KOLUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export interface PublicKOL {
  id: string;
  user_id: string;
  user: KOLUser;
  followers: number;
  engagement_rate: number;
  social_links: Record<string, string> | null;
  bio: string | null;
  avatar_path?: string | null;
  niche: string[] | null;
  min_price: number | null;
  max_price: number | null;
  is_public: boolean;
  verification_status: string;
}

function SocialIcons({ links }: { links: Record<string, string> | null }) {
  const keys = Object.keys(links ?? {});
  return (
    <div className="flex items-center gap-2 text-gray-400">
      {(keys.includes('youtube') || keys.length === 0) && <Youtube size={16} />}
      {(keys.includes('instagram') || keys.length === 0) && <Instagram size={16} />}
    </div>
  );
}

const formatMoney = (amount: number) =>
  amount.toLocaleString('vi-VN') + ' VNĐ';

export default function KolsGrid({ kols }: { kols: PublicKOL[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return kols;
    const q = query.toLowerCase();
    return kols.filter(
      (kol) =>
        kol.user?.full_name?.toLowerCase().includes(q) ||
        kol.niche?.some((n) => n.toLowerCase().includes(q)) ||
        kol.bio?.toLowerCase().includes(q),
    );
  }, [kols, query]);

  return (
    <>
      <div className="bg-white p-4 rounded-full border border-gray-200 shadow-sm flex items-center gap-4 mb-12 max-w-3xl mx-auto">
        <div className="pl-4 text-gray-400">
          <Search size={20} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc ngách nội dung (VD: Beauty, Tech)..."
          className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="pr-2 text-sm text-gray-400 transition-colors hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((kol) => (
          <div
            key={kol.id}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl"
          >
            <div className="relative mb-4 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100">
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

            <div className="flex flex-1 flex-col justify-between space-y-3">
              <div>
                <h3 className="line-clamp-1 text-lg font-bold text-gray-900">
                  {kol.user?.full_name || kol.user?.email}
                </h3>

                {kol.niche && kol.niche.length > 0 && (
                  <div className="mt-2 text-xs font-medium text-gray-600">
                    {kol.niche.join(', ')}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <div className="font-semibold text-gray-900">
                  Từ {formatMoney(kol.min_price ?? 0)}
                </div>
                <SocialIcons links={kol.social_links} />
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && kols.length > 0 && (
          <div className="col-span-full rounded-3xl border border-dashed py-12 text-center text-gray-500">
            Không tìm thấy KOL phù hợp với từ khóa &quot;{query}&quot;
          </div>
        )}

        {kols.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed py-20 text-center text-gray-500">
            Hiện tại chưa có KOL nào được công khai trên hệ thống.
          </div>
        )}
      </div>
    </>
  );
}
