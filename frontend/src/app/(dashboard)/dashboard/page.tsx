'use client';

import React, { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import { Loader2, Ticket, Users, DollarSign, ShieldCheck } from 'lucide-react';
import { dashboardApi, DashboardSummary } from '@/services/dashboard';
import { useAuthStore } from '@/store/authStore';

const formatMoney = (amount: number) => {
  return amount.toLocaleString('vi-VN') + ' VNĐ';
};

export default function DashboardHomePage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.getSummary();
        setSummary(data);
      } catch (err) {
        const axiosError = err as AxiosError<{ detail?: string }>;
        setError(axiosError.response?.data?.detail || 'Không thể tải dữ liệu tổng quan.');
      } finally {
        setLoading(false);
      }
    };

    void fetchSummary();
  }, []);

  const cards = user?.role === 'kol'
    ? [
        { label: 'Công việc của tôi', value: summary?.total_orders ?? 0, icon: <Ticket size={22} />, tone: 'text-blue-600 bg-blue-50' },
        { label: 'Đơn đang chạy', value: summary?.running_orders ?? 0, icon: <ShieldCheck size={22} />, tone: 'text-orange-600 bg-orange-50' },
        { label: 'Thu nhập tạm tính', value: formatMoney(summary?.total_revenue ?? 0), icon: <DollarSign size={22} />, tone: 'text-emerald-600 bg-emerald-50' },
      ]
    : [
        { label: 'Hồ sơ chờ duyệt', value: summary?.pending_kol_profiles ?? 0, icon: <ShieldCheck size={22} />, tone: 'text-orange-600 bg-orange-50' },
        { label: 'KOL đang hoạt động', value: summary?.active_kols ?? 0, icon: <Users size={22} />, tone: 'text-blue-600 bg-blue-50' },
        { label: 'Doanh thu tạm tính', value: formatMoney(summary?.total_revenue ?? 0), icon: <DollarSign size={22} />, tone: 'text-emerald-600 bg-emerald-50' },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-500">Chào mừng bạn quay lại Hệ thống quản lý KLOC.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 rounded-2xl border bg-white">
          <Loader2 className="animate-spin text-blue-600" size={28} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-4">
                <div className={`flex items-center gap-3 w-fit p-3 rounded-xl ${card.tone}`}>
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{card.label}</h3>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Đơn hàng gần đây</h3>
            </div>
            {summary && summary.recent_orders.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {summary.recent_orders.map((order) => (
                  <div key={order.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-900">#{order.id}</p>
                      <p className="text-sm text-gray-500">
                        {order.kol_name || order.kol_id} • {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatMoney(order.total_amount)}</p>
                      <p className="text-sm text-gray-500 capitalize">{order.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-sm text-gray-500">Chưa có dữ liệu đơn hàng gần đây.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
