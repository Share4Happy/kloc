'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { Ticket, Clock, CheckCircle2, Loader2, FileText, Download, Ban, RotateCcw, Edit, TrendingUp, History, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, DashboardSummary } from '@/services/dashboard';
import { orderApi, Order, OrderStatus } from '@/services/order';
import { generateContractFromOrder, downloadContractFile, triggerBlobDownload } from '@/services/contract';
import CancelRefundModal, { type CancelRefundMode } from '@/components/booking/CancelRefundModal';
import ClaimOrderModal from '@/components/booking/ClaimOrderModal';
import UpdateOrderInfoModal from '@/components/booking/UpdateOrderInfoModal';
import OrderEditModal from '@/components/booking/OrderEditModal';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const statusLabels: Record<OrderStatus, string> = {
  new_request: 'Đơn từ Web',
  pending_approval: 'Chờ duyệt',
  pending_sale_info: 'Chờ cập nhật thông tin',
  init: 'Khởi tạo',
  deposited: 'Đã cọc',
  running: 'Đang chạy',
  pending_review: 'Chờ nghiệm thu',
  completed: 'Hoàn thành',
  cancel_requested: 'Yêu cầu hủy',
  cancelled: 'Đã hủy',
  refund_requested: 'Yêu cầu hoàn tiền',
  refunded: 'Đã hoàn tiền',
};

export default function SalePortalPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractLoading, setContractLoading] = useState<string | null>(null); // orderId đang xử lý
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedOrderForCancelRefund, setSelectedOrderForCancelRefund] = useState<Order | null>(null);
  const [cancelRefundMode, setCancelRefundMode] = useState<CancelRefundMode>('direct_cancel');
  const [selectedOrderForClaim, setSelectedOrderForClaim] = useState<Order | null>(null);
  const [selectedOrderForInfoUpdate, setSelectedOrderForInfoUpdate] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, ordersData] = await Promise.all([
        dashboardApi.getSummary(),
        orderApi.getOrders(),
      ]);
      setSummary(summaryData);
      setOrders(ordersData);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể tải dữ liệu góc làm việc của Sale.');
    } finally {
      setLoading(false);
    }
  };

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
      setActionError((err as Error).message || 'Đơn hàng này chưa có hợp đồng.');
    } finally {
      setContractLoading(null);
    }
  };

  const handleDownloadProof = async (order: Order) => {
    try {
      await orderApi.downloadProofFile(order.id, order.proof_file_name || undefined);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể tải tệp proof.');
    }
  };

  const handleApprove = async (orderId: string) => {
    setApprovingId(orderId);
    setActionError(null);
    try {
      await orderApi.updateStatus(orderId, 'completed');
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể duyệt đơn hàng.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveClaim = async (orderId: string) => {
    setApprovingId(orderId);
    setActionError(null);
    try {
      await orderApi.approveClaim(orderId);
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể duyệt đơn yêu cầu.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectClaim = async (orderId: string) => {
    setApprovingId(orderId);
    setActionError(null);
    try {
      await orderApi.rejectClaim(orderId);
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể từ chối đơn yêu cầu.');
    } finally {
      setApprovingId(null);
    }
  };

  const openCancelRefund = (order: Order, mode: CancelRefundMode) => {
    setActionError(null);
    setSelectedOrderForCancelRefund(order);
    setCancelRefundMode(mode);
  };

  useEffect(() => {
      void fetchData();
  }, []);

  // Auto-refresh every 8s to keep data in sync with other users' actions
  const { refresh: autoRefresh } = useAutoRefresh(
    async () => {
      const [summaryData, ordersData] = await Promise.all([
        dashboardApi.getSummary(),
        orderApi.getOrders(),
      ]);
      return { summaryData, ordersData };
    },
    (data) => {
      setSummary(data.summaryData);
      setOrders(data.ordersData);
    },
    { intervalMs: 8000 }
  );

  // Group orders by combo_group_id to display as one row
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    const orderList: Order[][] = [];

    orders.forEach(o => {
      const key = o.combo_group_id || `single-${o.id}`;
      if (!groups[key]) {
        groups[key] = [];
        orderList.push(groups[key]);
      }
      groups[key].push(o);
    });

    // Sort groups: ensure single orders (no combo) stay in original order, combos together
    return orderList;
  }, [orders]);

  return (
    <RoleRouteGuard allowedRoles={['sale', 'admin', 'manager']}>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Góc làm việc của {user?.full_name}</h1>
              <p className="text-gray-500">Quản lý Booking, Khách hàng, tạo hợp đồng nhanh.</p>
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

        {/* METRICS FOR SALE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-blue-600 bg-blue-50 w-fit p-3 rounded-xl">
              <Ticket size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Đơn của bạn</h3>
              <p className="text-3xl font-bold text-gray-900">{summary?.total_orders ?? 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-orange-600 bg-orange-50 w-fit p-3 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Đơn chờ nghiệm thu</h3>
              <p className="text-3xl font-bold text-gray-900">{summary?.pending_review_orders ?? 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 w-fit p-3 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Doanh số cá nhân</h3>
              <p className="text-3xl font-bold text-gray-900">{formatMoney(summary?.total_revenue ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* ORDERS TABLE - PERSONAL */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mt-8">
            {actionError && (
              <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Lỗi thao tác:</strong> {actionError}
              </div>
            )}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">Danh sách Đơn Booking của tôi</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-white text-xs uppercase text-gray-500 border-b">
                        <tr>
                            <th className="px-6 py-4 font-medium">Mã Đơn</th>
                            <th className="px-6 py-4 font-medium">KOL Nhận Job</th>
                            <th className="px-6 py-4 font-medium">Giá trị Hợp đồng</th>
                          <th className="px-6 py-4 font-medium">Đã Cọc</th>
                            <th className="px-6 py-4 font-medium">Ngày tạo</th>
                            <th className="px-6 py-4 font-medium">Hợp đồng</th>
                            <th className="px-6 py-4 font-medium">Minh chứng</th>
                            <th className="px-6 py-4 font-medium">Trạng thái</th>
                            <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                              <Loader2 size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                              Đang tải dữ liệu...
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-10 text-center text-red-600">{error}</td>
                          </tr>
                        ) : groupedOrders.map((group) => {
                            const isCombo = group.length > 1;
                            const firstOrder = group[0];
                            const displayOrder = firstOrder; // Use first order for base info
                            
                            // Compute combined values
                            const totalVal = group.reduce((sum, o) => sum + o.total_amount, 0);
                            const depositVal = group.reduce((sum, o) => sum + o.deposit_amount, 0);
                            const kolNames = group.map(o => o.kol?.full_name || o.kol_id).filter(Boolean).join(', ');
                            const allHaveProof = group.some(o => o.proof_file_name || o.proof_link);

                            return (
                            <tr key={firstOrder.id} className="hover:bg-gray-50 transition bg-white">
                                <td className="px-6 py-4 font-semibold text-gray-900">
                                    {displayOrder.id.slice(0, 8)}…
                                    {isCombo && (
                                        <span className="block text-[10px] text-blue-500 font-normal">
                                            ({group.length} KOL)
                                        </span>
                                    )}
                                </td>
                            <td className="px-6 py-4 font-medium text-blue-600 text-sm" title={kolNames}>
                                {kolNames || 'Chưa phân công'}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">{totalVal > 0 ? formatMoney(totalVal) : 'Thỏa thuận'}</td>
                            <td className="px-6 py-4">{depositVal > 0 ? formatMoney(depositVal) : '-'}</td>
                            <td className="px-6 py-4">{new Date(displayOrder.created_at).toLocaleDateString('vi-VN')}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {displayOrder.status === 'new_request' || displayOrder.status === 'pending_approval' ? (
                                      <span className="text-gray-400 text-xs">Chưa có</span>
                                    ) : contractLoading === displayOrder.id ? (
                                      <Loader2 size={16} className="animate-spin text-blue-600" />
                                    ) : allHaveProof || displayOrder.contract_file_path ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleDownloadContract(displayOrder)}
                                        className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                                      >
                                        <Download size={12} /> Tải lại
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => void handleGenerateContract(displayOrder)}
                                        className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                                      >
                                        <FileText size={12} /> Tạo
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {allHaveProof ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleDownloadProof(displayOrder)}
                                      className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition"
                                    >
                                      <Download size={12} /> Tải proof
                                    </button>
                                  ) : displayOrder.proof_link ? (
                                    <a
                                      href={displayOrder.proof_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                                    >
                                      <Download size={12} /> Xem link
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Chưa có</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${
                                displayOrder.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                displayOrder.status === 'running' ? 'bg-blue-100 text-blue-700' :
                                displayOrder.status === 'deposited' ? 'bg-indigo-100 text-indigo-700' :
                                displayOrder.status === 'init' ? 'bg-gray-100 text-gray-700' :
                                displayOrder.status === 'new_request' ? 'bg-purple-100 text-purple-700' :
                                displayOrder.status === 'pending_approval' ? 'bg-orange-100 text-orange-700' :
                                        'bg-pink-100 text-pink-700'
                                    }`}>
                                {statusLabels[displayOrder.status]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {displayOrder.status === 'new_request' ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedOrderForClaim(displayOrder)}
                                        className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5"
                                      >
                                        Nhận đơn
                                      </button>
                                    ) : null}

                                    {displayOrder.status === 'pending_approval' ? (
                                      (user?.role === 'manager' || user?.role === 'admin') ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => void handleApproveClaim(displayOrder.id)}
                                            disabled={approvingId === displayOrder.id}
                                            className="text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 disabled:opacity-70"
                                          >
                                            {approvingId === displayOrder.id ? (
                                              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                              'Duyệt'
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void handleRejectClaim(displayOrder.id)}
                                            disabled={approvingId === displayOrder.id}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition disabled:opacity-70"
                                          >
                                            Từ chối
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-orange-600 text-xs font-medium inline-flex items-center gap-1">
                                          <Clock size={14} /> Chờ quản lý duyệt
                                        </span>
                                      )
                                    ) : null}

                                    {displayOrder.status === 'pending_review' ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleApprove(displayOrder.id)}
                                        disabled={approvingId === displayOrder.id}
                                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 disabled:opacity-70"
                                      >
                                        {approvingId === displayOrder.id ? (
                                          <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                          'Duyệt đơn'
                                        )}
                                      </button>
                                    ) : null}

                                    {/* INIT status: show "Update Info" button when no KOL assigned or sale_id is null (assigned by manager) */}
                                    {displayOrder.status === 'init' && (!displayOrder.kol_id || !displayOrder.sale_id) ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedOrderForInfoUpdate(displayOrder)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                                      >
                                        <Edit size={12} /> Cập nhật thông tin
                                      </button>
                                    ) : null}

                                    {/* PENDING_SALE_INFO: Sale must update info before KOL Manager can see */}
                                    {displayOrder.status === 'pending_sale_info' ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedOrderForInfoUpdate(displayOrder)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
                                        title="Cập nhật thông tin để chuyển sang trạng thái phân bổ KOL"
                                      >
                                        <Edit size={12} /> Cập nhật thông tin
                                      </button>
                                    ) : null}

                                    {/* Orders with KOL assigned - show Edit button */}
                                    {['init', 'deposited', 'running'].includes(displayOrder.status) && displayOrder.kol_id ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedOrderForEdit(displayOrder)}
                                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                                          title="Chỉnh sửa thông tin đơn hàng"
                                        >
                                          <Edit size={12} /> Chỉnh sửa
                                        </button>
                                        {displayOrder.update_history && displayOrder.update_history.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedOrderForEdit(displayOrder)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                                            title="Xem lịch sử cập nhật"
                                          >
                                            <History size={12} /> {displayOrder.update_history.length}
                                          </button>
                                        )}
                                      </div>
                                    ) : null}

                                    {['init', 'deposited', 'running', 'pending_review'].includes(displayOrder.status) ? (
                                      <button
                                        type="button"
                                        onClick={() => openCancelRefund(displayOrder, 'direct_cancel')}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                                      >
                                        <Ban size={12} /> Hủy đơn
                                      </button>
                                    ) : null}

                                    {displayOrder.status === 'cancelled' && depositVal > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => openCancelRefund(displayOrder, 'request_refund')}
                                        className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 hover:bg-pink-100 transition"
                                      >
                                        <RotateCcw size={12} /> Yêu cầu hoàn tiền
                                      </button>
                                    ) : null}

                                    {displayOrder.status === 'completed' ? (
                                      <span className="text-emerald-600 text-xs font-medium inline-flex items-center gap-1">
                                        <CheckCircle2 size={14} /> Đã duyệt
                                      </span>
                                    ) : null}

                                    {displayOrder.status !== 'pending_review' &&
                                    displayOrder.status !== 'init' &&
                                    !['deposited', 'running', 'pending_review'].includes(displayOrder.status) &&
                                    !(displayOrder.status === 'cancelled' && depositVal > 0) &&
                                    !['new_request', 'pending_approval', 'completed'].includes(displayOrder.status) ? (
                                      <span className="text-xs text-gray-400">Không có thao tác</span>
                                    ) : null}
                                  </div>
                                </td>
                            </tr>
                        );
                    })}
                        {!loading && !error && orders.length === 0 && (
                            <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Bạn chưa tạo đơn hàng nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <CancelRefundModal
          isOpen={selectedOrderForCancelRefund !== null}
          onClose={() => setSelectedOrderForCancelRefund(null)}
          onSuccess={() => void fetchData()}
          order={selectedOrderForCancelRefund}
          mode={cancelRefundMode}
        />

        <ClaimOrderModal
          isOpen={selectedOrderForClaim !== null}
          order={selectedOrderForClaim}
          onClose={() => setSelectedOrderForClaim(null)}
          onSuccess={() => void fetchData()}
        />

        <UpdateOrderInfoModal
          isOpen={selectedOrderForInfoUpdate !== null}
          order={selectedOrderForInfoUpdate}
          onClose={() => setSelectedOrderForInfoUpdate(null)}
          onSuccess={() => void fetchData()}
        />

        <OrderEditModal
          isOpen={selectedOrderForEdit !== null}
          order={selectedOrderForEdit}
          onClose={() => setSelectedOrderForEdit(null)}
          onSuccess={() => void fetchData()}
        />
      </div>
    </RoleRouteGuard>
  );
}
