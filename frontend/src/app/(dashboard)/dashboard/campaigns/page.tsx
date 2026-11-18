'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { campaignApi, CampaignSummary } from '@/services/campaign';
import { kolApi, KOLProfile } from '@/services/kol';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, parseCurrency, handleCurrencyChange } from '@/lib/currency';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export default function CampaignsPage() {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [kols, setKols] = useState<KOLProfile[]>([]);
  const [selectedKolIds, setSelectedKolIds] = useState<string[]>([]);

  const [searchKol, setSearchKol] = useState('');
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [platform, setPlatform] = useState('TikTok');
  const [kpi, setKpi] = useState('');
  const [postCount, setPostCount] = useState('1');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [campaignData, kolData] = await Promise.all([
        campaignApi.getCampaigns(),
        kolApi.getProfiles('approved'),
      ]);
      setCampaigns(campaignData);
      setKols(kolData.filter((kol) => kol.is_public));
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể tải dữ liệu campaign.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredKols = useMemo(() => {
    const keyword = searchKol.trim().toLowerCase();
    if (!keyword) return kols;
    return kols.filter((kol) => {
      const fullName = kol.user.full_name.toLowerCase();
      const email = kol.user.email.toLowerCase();
      return fullName.includes(keyword) || email.includes(keyword);
    });
  }, [kols, searchKol]);

  const toggleKol = (kolId: string) => {
    setSelectedKolIds((prev) =>
      prev.includes(kolId) ? prev.filter((id) => id !== kolId) : [...prev, kolId],
    );
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedKolIds.length === 0) {
      setError('Vui lòng chọn ít nhất một KOL cho campaign.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      const created = await campaignApi.createCampaign({
        name: name.trim(),
        budget: Number(budget || 0),
        owner_sale_id: user.role === 'sale' ? user.id : undefined,
        status: 'planning',
        atomic: true,
        kol_ids: selectedKolIds,
        total_amount: parseCurrency(totalAmount),
        deposit_amount: parseCurrency(depositAmount),
        campaign_name: name.trim(),
        platform,
        kpi: kpi || undefined,
        booking_type: 'combo',
        post_count: Number(postCount || 1),
      });

      setMessage(
        `Đã tạo campaign ${created.campaign.name} với ${created.created_orders.length} đơn hàng.`,
      );
      setName('');
      setBudget('');
      setTotalAmount('');
      setDepositAmount('');
      setPlatform('TikTok');
      setKpi('');
      setPostCount('1');
      setSelectedKolIds([]);
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string | { message?: string } }>;
      const detail = axiosError.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError(detail?.message || 'Không thể tạo campaign mới.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleRouteGuard allowedRoles={['sale', 'manager', 'admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Combo</h1>
          <p className="text-gray-500">Tạo chiến dịch và gán nhiều KOL trong cùng một nhóm theo dõi.</p>
        </div>

        {error && <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

        <form onSubmit={handleCreateCampaign} className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Plus size={16} /> Tạo campaign mới
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tên campaign</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="VD: Combo Viral Tháng 4"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ngân sách campaign (VNĐ)</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => handleCurrencyChange(e, setBudget)}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Giá trị mỗi đơn (VNĐ)</label>
              <input
                type="text"
                value={totalAmount}
                onChange={(e) => handleCurrencyChange(e, setTotalAmount)}
                onFocus={(e) => e.target.select()}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tiền cọc mỗi đơn (VNĐ)</label>
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => handleCurrencyChange(e, setDepositAmount)}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nền tảng</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              >
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Số lượng content</label>
              <input
                type="number"
                min={1}
                value={postCount}
                onChange={(e) => setPostCount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">KPI</label>
              <input
                value={kpi}
                onChange={(e) => setKpi(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                placeholder="VD: 100k views, 5k likes"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Chọn KOL ({selectedKolIds.length} đã chọn)
            </label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchKol}
                onChange={(e) => setSearchKol(e.target.value)}
                placeholder="Tìm theo tên hoặc email KOL..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200">
              {filteredKols.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">Không có KOL phù hợp</div>
              ) : (
                filteredKols.map((kol) => {
                  const checked = selectedKolIds.includes(kol.user_id);
                  return (
                    <button
                      key={kol.id}
                      type="button"
                      onClick={() => toggleKol(kol.user_id)}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left hover:bg-gray-50"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border-2 ${checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">{kol.user.full_name}</div>
                        <div className="truncate text-xs text-gray-500">{kol.user.email}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || selectedKolIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Tạo campaign
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h2 className="font-semibold text-gray-900">Danh sách campaign</h2>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" /> Đang tải campaign...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">Chưa có campaign nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngân sách</th>
                    <th className="px-4 py-3">Đơn hàng</th>
                    <th className="px-4 py-3">Doanh thu</th>
                    <th className="px-4 py-3">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-xs text-gray-500">{campaign.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{campaign.status}</td>
                      <td className="px-4 py-3">{formatMoney(campaign.budget)}</td>
                      <td className="px-4 py-3">{campaign.total_orders}</td>
                      <td className="px-4 py-3">{formatMoney(campaign.total_revenue)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/campaigns/${campaign.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Xem
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleRouteGuard>
  );
}
