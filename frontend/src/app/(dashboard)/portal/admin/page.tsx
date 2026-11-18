 'use client';

import React, { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import { LayoutDashboard, Users, Ticket, DollarSign, Loader2 } from 'lucide-react';
import { dashboardApi, DashboardSummary } from '@/services/dashboard';

const formatMoney = (amount: number) => {
  return amount.toLocaleString('vi-VN') + ' VNĐ';
};

export default function AdminOverviewPage() {
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
        setError(axiosError.response?.data?.detail || 'Không thể tải tổng quan admin.');
      } finally {
        setLoading(false);
      }
    };

    void fetchSummary();
  }, []);

  const cards = [
    {
      label: 'Tổng đơn hàng',
      value: summary?.total_orders ?? 0,
      icon: <Ticket size={24} />,
      tone: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'KOL đã duyệt',
      value: summary?.active_kols ?? 0,
      icon: <Users size={24} />,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Doanh thu tạm tính',
      value: formatMoney(summary?.total_revenue ?? 0),
      icon: <DollarSign size={24} />,
      tone: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Chiến dịch đang chạy',
      value: summary?.running_orders ?? 0,
      icon: <LayoutDashboard size={24} />,
      tone: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <AdminRouteGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cổng quản trị Admin</h1>
          <p className="text-gray-500">Tổng quan toàn bộ hệ thống KLOC Booking Platform.</p>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border bg-white">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm">
                  <div className={`flex w-fit items-center gap-3 rounded-xl p-3 ${card.tone}`}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-gray-500">{card.label}</h3>
                    <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-bold text-gray-900">Đơn hàng gần đây</h3>
              </div>
              {summary && summary.recent_orders.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {summary.recent_orders.map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">#{order.id}</p>
                        <p className="text-sm text-gray-500">
                          Sale: {order.sale_name || order.sale_id} • KOL: {order.kol_name || order.kol_id}
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
    </AdminRouteGuard>
  );
}
