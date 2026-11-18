'use client';

import React, { useEffect, useMemo, useState } from 'react';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import type { AxiosError } from 'axios';
import { leadApi, Lead } from '@/services/lead';
import { kolApi, KOLProfile } from '@/services/kol';
import { Users, Loader2, Search, Filter, Download } from 'lucide-react';
import { formatCurrency, parseCurrency, handleCurrencyChange } from '@/lib/currency';

export default function SaleToolsPage() {
  const [activeTab, setActiveTab] = useState<'smart_filter' | 'lead_crm'>('smart_filter');

  const [kols, setKols] = useState<KOLProfile[]>([]);
  const [isLoadingKols, setIsLoadingKols] = useState(false);
  const [kolError, setKolError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    niche: '',
    min_price: '',
    max_price: '',
    platform: '',
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  const fetchKols = async (customFilters?: {
    niche?: string;
    min_price?: number;
    max_price?: number;
    platform?: string;
  }) => {
    try {
      setIsLoadingKols(true);
      setKolError(null);
      const params = customFilters ?? {
        niche: filters.niche || undefined,
        min_price: filters.min_price ? Number(filters.min_price) : undefined,
        max_price: filters.max_price ? Number(filters.max_price) : undefined,
        platform: filters.platform || undefined,
      };
      const data = await kolApi.smartFilter(params);
      setKols(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setKolError(axiosError.response?.data?.detail || 'Không thể tải kết quả Smart Filter.');
    } finally {
      setIsLoadingKols(false);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoadingLeads(true);
      setLeadError(null);
      const data = await leadApi.getLeads();
      setLeads(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setLeadError(axiosError.response?.data?.detail || 'Không thể tải danh sách lead.');
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    void fetchKols({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'lead_crm' && leads.length === 0) {
      void fetchLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleApplyFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchKols();
  };

  const handleResetFilter = async () => {
    const empty = { niche: '', min_price: '', max_price: '', platform: '' };
    setFilters(empty);
    await fetchKols({});
  };

  const handleExportCsv = () => {
    if (kols.length === 0) return;
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ['full_name', 'email', 'niche', 'min_price', 'max_price', 'followers', 'engagement_rate', 'platforms'],
      ...kols.map((kol) => [
        kol.user?.full_name || '',
        kol.user?.email || '',
        (kol.niche || []).join(', '),
        String(kol.min_price ?? ''),
        String(kol.max_price ?? ''),
        String(kol.followers ?? ''),
        String(kol.engagement_rate ?? ''),
        kol.social_links ? Object.keys(kol.social_links).join(', ') : '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-filter-kols-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLeads = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) =>
      [lead.full_name, lead.phone, lead.email, lead.company, lead.subject, lead.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [keyword, leads]);

  return (
    <RoleRouteGuard allowedRoles={['sale', 'manager', 'admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Công cụ Sale</h1>
          <p className="text-gray-500">Smart Filter KOL và Lead CRM cho đội Sale.</p>
        </div>

        <div className="inline-flex rounded-xl border bg-white p-1">
          <button
            onClick={() => setActiveTab('smart_filter')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'smart_filter' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Smart Filter
          </button>
          <button
            onClick={() => setActiveTab('lead_crm')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === 'lead_crm' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Lead CRM
          </button>
        </div>

        {activeTab === 'smart_filter' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <form onSubmit={handleApplyFilter} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lĩnh vực</label>
                  <input
                    value={filters.niche}
                    onChange={(e) => setFilters((prev) => ({ ...prev, niche: e.target.value }))}
                    placeholder="beauty, gaming..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Giá tối thiểu (VNĐ)</label>
                  <input
                    type="text"
                    value={filters.min_price}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setFilters((prev) => ({ ...prev, min_price: raw }));
                    }}
                    placeholder="1.000.000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Giá tối đa (VNĐ)</label>
                  <input
                    type="text"
                    value={filters.max_price}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setFilters((prev) => ({ ...prev, max_price: raw }));
                    }}
                    placeholder="10.000.000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nền tảng</label>
                  <select
                    value={filters.platform}
                    onChange={(e) => setFilters((prev) => ({ ...prev, platform: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoadingKols}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isLoadingKols ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
                    Lọc
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Đặt lại
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-gray-900">Kết quả Smart Filter ({kols.length})</h3>
                <button
                  onClick={handleExportCsv}
                  disabled={kols.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <Download size={14} /> Xuất CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">KOL</th>
                      <th className="px-4 py-3">Lĩnh vực</th>
                      <th className="px-4 py-3">Mức giá</th>
                      <th className="px-4 py-3">Followers</th>
                      <th className="px-4 py-3">Tương tác</th>
                      <th className="px-4 py-3">Nền tảng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingKols ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                          Đang tải kết quả...
                        </td>
                      </tr>
                    ) : kolError ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-red-600">{kolError}</td>
                      </tr>
                    ) : kols.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Không có KOL phù hợp bộ lọc.</td>
                      </tr>
                    ) : kols.map((kol) => (
                      <tr key={kol.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{kol.user?.full_name || 'Không rõ'}</div>
                          <div className="text-xs text-gray-500">{kol.user?.email || '-'}</div>
                        </td>
                        <td className="px-4 py-3">{kol.niche && kol.niche.length > 0 ? kol.niche.join(', ') : '-'}</td>
                        <td className="px-4 py-3">{kol.min_price ?? '-'} &ndash; {kol.max_price ?? '-'}</td>
                        <td className="px-4 py-3">{new Intl.NumberFormat('en-US').format(kol.followers || 0)}</td>
                        <td className="px-4 py-3">{kol.engagement_rate ?? 0}%</td>
                        <td className="px-4 py-3">{kol.social_links ? Object.keys(kol.social_links).join(', ') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'lead_crm' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <p className="text-sm text-gray-500">Tổng số lead</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{leads.length}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <p className="text-sm text-gray-500">Từ form Booking</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{leads.filter((l) => l.source === 'booking_form').length}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <p className="text-sm text-gray-500">Từ trang Liên hệ</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{leads.filter((l) => l.source === 'contact_form').length}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <h3 className="font-semibold text-gray-900">Danh sách lead mới nhất</h3>
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm theo tên, SĐT, email..."
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">Liên hệ</th>
                      <th className="px-4 py-3">Nguồn</th>
                      <th className="px-4 py-3">Chủ đề / Công ty</th>
                      <th className="px-4 py-3">Nội dung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingLeads ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                          Đang tải lead...
                        </td>
                      </tr>
                    ) : leadError ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-red-600">{leadError}</td>
                      </tr>
                    ) : filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          <Users size={20} className="mx-auto mb-2 text-gray-300" />
                          Không có lead phù hợp.
                        </td>
                      </tr>
                    ) : filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(lead.created_at).toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.full_name}</td>
                        <td className="px-4 py-3">
                          <div>{lead.phone}</div>
                          {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lead.source === 'booking_form' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {lead.source === 'booking_form' ? 'BookingForm' : 'Contact'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{lead.subject || lead.company || '-'}</td>
                        <td className="px-4 py-3 max-w-sm truncate" title={lead.message}>{lead.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleRouteGuard>
  );
}
