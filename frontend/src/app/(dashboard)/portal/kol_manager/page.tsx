'use client';

import React, { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { Users, Loader2, CheckCircle2, XCircle, FileText, Download, Edit, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { orderApi, Order } from '@/services/order';
import { kolApi, KOLProfile } from '@/services/kol';
import { generateContractFromOrder, downloadContractFile, triggerBlobDownload } from '@/services/contract';
import AssignKolModal from '@/components/booking/AssignKolModal';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const verificationStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Bị từ chối', color: 'bg-red-100 text-red-700' },
};

export default function KolManagerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [kols, setKols] = useState<KOLProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractLoading, setContractLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedOrderForKol, setSelectedOrderForKol] = useState<Order | null>(null);
  const [kolProfileFilter, setKolProfileFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [verifyingKolId, setVerifyingKolId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersData, kolsData] = await Promise.all([
        orderApi.getOrders(),
        kolApi.getProfiles(),
      ]);
      setOrders(ordersData);
      setKols(kolsData);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Auto-refresh every 8s to keep data in sync with other users' actions
  const { refresh: autoRefresh } = useAutoRefresh(
    async () => {
      const [ordersData, kolsData] = await Promise.all([
        orderApi.getOrders(),
        kolApi.getProfiles(),
      ]);
      return { ordersData, kolsData };
    },
    (data) => {
      setOrders(data.ordersData);
      setKols(data.kolsData);
    },
    { intervalMs: 8000 }
  );

  const handleGenerateContract = async (order: Order) => {
    setContractLoading(order.id);
    setActionError(null);
    try {
      const blob = await generateContractFromOrder(order.id);
      triggerBlobDownload(blob, `hop-dong-order-${order.id}.docx`);
      await fetchData();
    } catch (err) {
      setActionError((err as Error).message || 'Không thể tạo hợp đồng.');
    } finally {
      setContractLoading(null);
    }
  };

  const handleDownloadContract = async (order: Order) => {
    setContractLoading(order.id);
    setActionError(null);
    try {
      const blob = await downloadContractFile(order.id);
      triggerBlobDownload(blob, order.contract_file_name || `hop-dong-order-${order.id}.docx`);
    } catch (err) {
      setActionError((err as Error).message || 'Không thể tải hợp đồng.');
    } finally {
      setContractLoading(null);
    }
  };

  const handleVerifyKol = async (kolId: string, status: 'approved' | 'rejected') => {
    setVerifyingKolId(kolId);
    setActionError(null);
    try {
      await kolApi.verifyProfile(kolId, status, status === 'rejected' ? rejectionReason : undefined);
      setShowRejectModal(null);
      setRejectionReason('');
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể cập nhật trạng thái hồ sơ.');
    } finally {
      setVerifyingKolId(null);
    }
  };

  const handleToggleKolVisibility = async (kolId: string, currentVisibility: boolean) => {
    setActionError(null);
    try {
      await kolApi.toggleVisibility(kolId, !currentVisibility);
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể cập nhật hiển thị.');
    }
  };

  // Filter: orders that need KOL assignment (INIT status with no kol_id)
  // PENDING_SALE_INFO orders are NOT shown - Sale must update info first
  const pendingKolAssignment = orders.filter(
    (o) => o.status === 'init' && !o.kol_id
  );
  const assignedOrders = orders.filter(
    (o) => o.status === 'init' && o.kol_id
  );

  // Filter KOL profiles
  const filteredKolProfiles = kols.filter((k) => {
    if (kolProfileFilter === 'all') return true;
    return k.verification_status === kolProfileFilter;
  });

  const pendingCount = kols.filter((k) => k.verification_status === 'pending').length;
  const approvedCount = kols.filter((k) => k.verification_status === 'approved').length;
  const rejectedCount = kols.filter((k) => k.verification_status === 'rejected').length;

  return (
    <RoleRouteGuard allowedRoles={['kol_manager', 'admin', 'manager']}>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Talent (KOL Manager)</h1>
              <p className="text-gray-500">Duyệt hồ sơ KOL, phân bổ KOL cho chiến dịch và quản lý hiển thị.</p>
            </div>
            <button
              type="button"
              onClick={() => void autoRefresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
        </div>

        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Lỗi:</strong> {actionError}
          </div>
        )}

        {/* ======================================== */}
        {/* SECTION 1: KOL PROFILE VERIFICATION     */}
        {/* ======================================== */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-purple-50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-purple-800">🎓 Duyệt hồ sơ KOL</h3>
              <p className="text-sm text-purple-600 mt-1">Kiểm tra và phê duyệt hồ sơ đăng ký của KOL/KOC.</p>
            </div>
            <div className="flex gap-2">
              {[
                { key: 'pending' as const, label: 'Chờ duyệt', count: pendingCount, active: true },
                { key: 'approved' as const, label: 'Đã duyệt', count: approvedCount },
                { key: 'rejected' as const, label: 'Bị từ chối', count: rejectedCount },
                { key: 'all' as const, label: 'Tất cả', count: kols.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setKolProfileFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    kolProfileFilter === tab.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-medium">KOL</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Followers</th>
                  <th className="px-6 py-4 font-medium">Giá Booking</th>
                  <th className="px-6 py-4 font-medium">Trạng thái</th>
                  <th className="px-6 py-4 font-medium text-center">Hiển thị</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                      Đang tải...
                    </td>
                  </tr>
                ) : filteredKolProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      Không có hồ sơ nào.
                    </td>
                  </tr>
                ) : (
                  filteredKolProfiles.map((kol) => {
                    const statusInfo = verificationStatusLabels[kol.verification_status] || {
                      label: kol.verification_status,
                      color: 'bg-gray-100 text-gray-700',
                    };
                    return (
                      <tr key={kol.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{kol.user.full_name || kol.user.email}</div>
                          <div className="text-xs text-gray-500">{kol.niche?.join(', ') || 'Chưa có niche'}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">{kol.user.email}</td>
                        <td className="px-6 py-4">{new Intl.NumberFormat('vi-VN').format(kol.followers)}</td>
                        <td className="px-6 py-4">
                          {kol.kol_booking_price != null
                            ? `${kol.kol_booking_price.toLocaleString('vi-VN')} VNĐ`
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {kol.is_public ? (
                            <button
                              type="button"
                              onClick={() => void handleToggleKolVisibility(kol.id, true)}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs"
                              title="Ẩn khỏi Landing Page"
                            >
                              <Eye size={14} /> Hiện
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleToggleKolVisibility(kol.id, false)}
                              className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs"
                              title="Hiện trên Landing Page"
                            >
                              <EyeOff size={14} /> Ẩn
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {kol.verification_status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handleVerifyKol(kol.id, 'approved')}
                                disabled={verifyingKolId === kol.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-70 transition"
                              >
                                {verifyingKolId === kol.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowRejectModal(kol.id)}
                                disabled={verifyingKolId === kol.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-100 disabled:opacity-70 transition"
                              >
                                <XCircle size={12} /> Từ chối
                              </button>
                            </div>
                          ) : kol.verification_status === 'approved' ? (
                            <span className="text-xs text-emerald-600 inline-flex items-center gap-1 justify-end">
                              <ShieldCheck size={12} /> Đã tích xanh
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reject Reason Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Lý do từ chối hồ sơ</h3>
              <p className="text-sm text-gray-500 mb-4">KOL sẽ nhìn thấy lý do này để sửa lại.</p>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="VD: Ảnh đại diện không rõ mặt, số liệu followers không khớp..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowRejectModal(null); setRejectionReason(''); }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerifyKol(showRejectModal, 'rejected')}
                  disabled={!rejectionReason.trim()}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================== */}
        {/* SECTION 2: ORDER KOL ASSIGNMENT         */}
        {/* ======================================== */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-orange-50">
            <h3 className="text-lg font-bold text-orange-800">📋 Đơn chờ phân bổ KOL</h3>
            <p className="text-sm text-orange-600 mt-1">Sale đã tạo đơn, cần bạn chọn KOL/KOC phù hợp dựa trên ghi chú yêu cầu.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Mã Đơn</th>
                  <th className="px-6 py-4 font-medium">Sale</th>
                  <th className="px-6 py-4 font-medium">Chiến dịch</th>
                  <th className="px-6 py-4 font-medium">Nền tảng</th>
                  <th className="px-6 py-4 font-medium">Số bài</th>
                  <th className="px-6 py-4 font-medium">Ghi chú yêu cầu KOL</th>
                  <th className="px-6 py-4 font-medium">Gói</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                      Đang tải...
                    </td>
                  </tr>
                ) : pendingKolAssignment.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />
                      Không có đơn nào chờ phân bổ KOL.
                    </td>
                  </tr>
                ) : pendingKolAssignment.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{order.id.slice(0, 8)}…</td>
                    <td className="px-6 py-4">{order.sale?.full_name || order.sale_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.campaign_name || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {order.platform || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-700">{order.post_count || '—'}</td>
                    <td className="px-6 py-4 max-w-xs">
                      {order.kol_request_notes ? (
                        <div className="text-xs text-gray-700 line-clamp-3" title={order.kol_request_notes}>
                          {order.kol_request_notes}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Chưa có ghi chú</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.package_definition && (order.package_definition as any).preset_name ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          (order.package_definition as any).preset_id === 'combo_starter' ? 'bg-blue-100 text-blue-700' :
                          (order.package_definition as any).preset_id === 'combo_standard' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {(order.package_definition as any).preset_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Custom</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForKol(order)}
                        className="text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
                      >
                        <Users size={12} /> Phân bổ KOL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ASSIGNED ORDERS */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold text-gray-900">Đơn đã phân bổ KOL</h3>
            <p className="text-sm text-gray-500 mt-1">Các đơn đã có KOL, Sale sẽ tiếp tục xử lý hợp đồng.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Mã Đơn</th>
                  <th className="px-6 py-4 font-medium">Sale</th>
                  <th className="px-6 py-4 font-medium">KOL</th>
                  <th className="px-6 py-4 font-medium">Chiến dịch</th>
                  <th className="px-6 py-4 font-medium">Hợp đồng</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Chưa có đơn nào được phân bổ KOL.
                    </td>
                  </tr>
                ) : assignedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{order.id.slice(0, 8)}…</td>
                    <td className="px-6 py-4">{order.sale?.full_name || order.sale_id}</td>
                    <td className="px-6 py-4 font-medium text-blue-600">{order.kol?.full_name || order.kol_id}</td>
                    <td className="px-6 py-4">{order.campaign_name || '—'}</td>
                    <td className="px-6 py-4">
                      {contractLoading === order.id ? (
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                      ) : order.contract_file_path ? (
                        <button
                          type="button"
                          onClick={() => void handleDownloadContract(order)}
                          className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <Download size={12} /> Tải
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleGenerateContract(order)}
                          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                        >
                          <FileText size={12} /> Tạo
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-emerald-600 text-xs font-medium inline-flex items-center gap-1">
                        <CheckCircle2 size={14} /> Đã phân bổ
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KOL ASSIGNMENT MODAL */}
        <AssignKolModal
          isOpen={selectedOrderForKol !== null}
          order={selectedOrderForKol}
          kols={kols}
          onClose={() => setSelectedOrderForKol(null)}
          onSuccess={() => void fetchData()}
        />
      </div>
    </RoleRouteGuard>
  );
}
