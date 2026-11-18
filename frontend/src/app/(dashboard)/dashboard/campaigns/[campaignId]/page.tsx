'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import { Download, Loader2, Edit2, X, Check } from 'lucide-react';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { campaignApi, CampaignDetail } from '@/services/campaign';
import { orderApi } from '@/services/order';
import type { Order } from '@/services/order';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editDeposit, setEditDeposit] = useState<number>(0);
  const [savingPrice, setSavingPrice] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await campaignApi.getCampaignDetail(campaignId);
      setCampaign(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể tải chi tiết campaign.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaignId) {
      void fetchDetail();
    }
  }, [campaignId, fetchDetail]);

  const handleExportCsv = async () => {
    await campaignApi.exportCampaignCsv(campaignId);
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order.id);
    setEditTotal(order.total_amount);
    setEditDeposit(order.deposit_amount);
  };

  const cancelEdit = () => {
    setEditingOrder(null);
  };

  const saveEdit = async (orderId: string) => {
    try {
      setSavingPrice(true);
      await orderApi.updatePrice(orderId, {
        total_amount: editTotal,
        deposit_amount: editDeposit,
      });
      setEditingOrder(null);
      void fetchDetail();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      alert(axiosError.response?.data?.detail || 'Không thể cập nhật giá.');
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <RoleRouteGuard allowedRoles={['sale', 'manager', 'admin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết campaign</h1>
            <p className="text-sm text-gray-500">Theo dõi ngân sách, tiến độ rollout và danh sách order con.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleExportCsv()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} /> Xuất CSV
            </button>
            <Link
              href="/dashboard/campaigns"
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Quay lại
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-gray-500">
            <Loader2 size={22} className="mx-auto mb-2 animate-spin" /> Đang tải dữ liệu campaign...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : !campaign ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500">Không tìm thấy campaign.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs text-gray-500">Tên campaign</p>
                <p className="mt-1 font-semibold text-gray-900">{campaign.name}</p>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs text-gray-500">Ngân sách</p>
                <p className="mt-1 font-semibold text-gray-900">{formatMoney(campaign.budget)}</p>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs text-gray-500">Tổng đơn</p>
                <p className="mt-1 font-semibold text-gray-900">{campaign.total_orders}</p>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs text-gray-500">Tổng cọc</p>
                <p className="mt-1 font-semibold text-gray-900">{formatMoney(campaign.total_deposit)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-white">
              <div className="border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">Danh sách order con</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">KOL</th>
                      <th className="px-4 py-3">Sale</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Giá trị</th>
                      <th className="px-4 py-3">Cọc</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {campaign.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3">{order.kol?.full_name || order.kol_id}</td>
                        <td className="px-4 py-3">{order.sale?.full_name || order.sale_id}</td>
                        <td className="px-4 py-3 capitalize">{order.status.replace('_', ' ')}</td>
                        <td className="px-4 py-3">
                          {editingOrder === order.id ? (
                            <input
                              type="number"
                              className="w-24 rounded border px-2 py-1 text-sm outline-none"
                              value={editTotal}
                              onChange={(e) => setEditTotal(Number(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              disabled={savingPrice}
                            />
                          ) : (
                            formatMoney(order.total_amount)
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingOrder === order.id ? (
                            <input
                              type="number"
                              className="w-24 rounded border px-2 py-1 text-sm outline-none"
                              value={editDeposit}
                              onChange={(e) => setEditDeposit(Number(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              disabled={savingPrice}
                            />
                          ) : (
                            formatMoney(order.deposit_amount)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingOrder === order.id ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => void saveEdit(order.id)} disabled={savingPrice} className="text-green-600 hover:text-green-800">
                                {savingPrice ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                              </button>
                              <button onClick={cancelEdit} disabled={savingPrice} className="text-red-500 hover:text-red-700">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            (order.status === 'init' || order.status === 'deposited') && (
                              <button onClick={() => startEdit(order)} className="text-blue-500 hover:text-blue-700">
                                <Edit2 size={16} />
                              </button>
                            )
                          )}
                        </td>
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
