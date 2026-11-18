'use client';

import React, { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { CheckCircle2, Ticket, DollarSign, Users, Loader2, FileText, Download, Ban, RotateCcw, Wallet, CircleDollarSign, XCircle, X, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { dashboardApi, DashboardSummary } from '@/services/dashboard';
import { orderApi, Order, OrderStatus } from '@/services/order';
import { generateContractFromOrder, downloadContractFile, triggerBlobDownload } from '@/services/contract';
import CancelRefundModal, { type CancelRefundMode } from '@/components/booking/CancelRefundModal';
import ExportReportModal from '@/components/booking/ExportReportModal';
import { payoutApi, Payout } from '@/services/payout';
import { kolApi, KOLProfile } from '@/services/kol';
import { userApi, UserSale } from '@/services/user';
import { formatCurrency, parseCurrency, handleCurrencyChange } from '@/lib/currency';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const statusLabels: Record<OrderStatus, string> = {
  new_request: 'Yêu cầu mới',
  pending_approval: 'Chờ duyệt',
  pending_sale_info: 'Chờ Sale cập nhật',
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

export default function ManagerPortalPage() {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [contractLoading, setContractLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [kolProfiles, setKolProfiles] = useState<KOLProfile[]>([]);
  const [sales, setSales] = useState<UserSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderForCancelRefund, setSelectedOrderForCancelRefund] = useState<Order | null>(null);
  const [cancelRefundMode, setCancelRefundMode] = useState<CancelRefundMode>('direct_cancel');
  const [payoutFilterKolId, setPayoutFilterKolId] = useState('all');
  const [selectedPayoutKolId, setSelectedPayoutKolId] = useState('');
  const [selectedPayoutOrderId, setSelectedPayoutOrderId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [creatingPayout, setCreatingPayout] = useState(false);
  const [updatingPayoutId, setUpdatingPayoutId] = useState<string | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedAssignSaleId, setSelectedAssignSaleId] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, ordersData, payoutsData, kolProfilesData, salesData] = await Promise.all([
        dashboardApi.getSummary(),
        orderApi.getOrders(),
        payoutApi.getAllPayouts(),
        kolApi.getProfiles(),
        userApi.getSales(),
      ]);
      setSummary(summaryData);
      setOrders(ordersData);
      setPayouts(payoutsData);
      setKolProfiles(kolProfilesData);
      setSales(salesData);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể tải dữ liệu manager portal.');
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
      const [summaryData, ordersData, payoutsData] = await Promise.all([
        dashboardApi.getSummary(),
        orderApi.getOrders(),
        payoutApi.getAllPayouts(),
      ]);
      return { summaryData, ordersData, payoutsData };
    },
    (data) => {
      setSummary(data.summaryData);
      setOrders(data.ordersData);
      setPayouts(data.payoutsData);
    },
    { intervalMs: 8000 }
  );

  const handleApprove = async (id: string) => {
    try {
      setApprovingId(id);
      setActionError(null);
      await orderApi.updateStatus(id, 'completed');
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể duyệt đơn hàng.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveClaim = async (id: string) => {
    try {
      setApprovingId(id);
      setActionError(null);
      await orderApi.approveClaim(id);
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể duyệt đơn yêu cầu.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectClaim = async (id: string) => {
    try {
      setApprovingId(id);
      setActionError(null);
      await orderApi.rejectClaim(id);
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể từ chối đơn yêu cầu.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleAssignSale = async (orderId: string, saleId: string) => {
    if (!saleId) {
      setActionError('Vui lòng chọn Sale phụ trách.');
      return;
    }
    try {
      setAssigningOrderId(orderId);
      setActionError(null);
      await orderApi.assignSale(orderId, saleId);
      setSelectedAssignSaleId('');
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể chỉ định Sale.');
    } finally {
      setAssigningOrderId(null);
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
      setActionError((err as Error).message || 'Không thể tải hợp đồng.');
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

  const openCancelRefund = (order: Order, mode: CancelRefundMode) => {
    setActionError(null);
    setSelectedOrderForCancelRefund(order);
    setCancelRefundMode(mode);
  };

  const handleCreatePayout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPayoutKolId) {
      setActionError('Vui lòng chọn KOL nhận payout.');
      return;
    }

    const amount = parseCurrency(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Số tiền payout phải lớn hơn 0.');
      return;
    }

    try {
      setCreatingPayout(true);
      setActionError(null);
      await payoutApi.createPayout({
        kol_id: selectedPayoutKolId,
        order_id: selectedPayoutOrderId || null,
        amount,
        note: payoutNote.trim() || null,
      });
      setSelectedPayoutOrderId('');
      setPayoutAmount('');
      setPayoutNote('');
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể tạo payout mới.');
    } finally {
      setCreatingPayout(false);
    }
  };

  const handleUpdatePayout = async (payoutId: string, nextStatus: 'paid' | 'cancelled') => {
    try {
      setUpdatingPayoutId(payoutId);
      setActionError(null);
      await payoutApi.updatePayout(payoutId, { status: nextStatus });
      await fetchData();
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setActionError(axiosError.response?.data?.detail || 'Không thể cập nhật trạng thái payout.');
    } finally {
      setUpdatingPayoutId(null);
    }
  };

  const selectedKolOrders = selectedPayoutKolId
    ? orders.filter((order) => order.kol_id === selectedPayoutKolId)
    : [];

  const filteredPayouts = payoutFilterKolId === 'all'
    ? payouts
    : payouts.filter((payout) => payout.kol_id === payoutFilterKolId);

  const pendingPayouts = payouts.filter((payout) => payout.status === 'pending').length;
  const paidPayoutTotal = payouts
    .filter((payout) => payout.status === 'paid')
    .reduce((sum, payout) => sum + payout.amount, 0);
  const payoutKols = kolProfiles.map((profile) => ({
    id: profile.user_id,
    label: profile.user.full_name || profile.user.email,
  }));

  return (
    <RoleRouteGuard allowedRoles={['manager', 'admin']}>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Portal</h1>
              <p className="text-gray-500">Quản lý duyệt đơn hàng, kiểm soát dòng tiền của đội Sale.</p>
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

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-blue-600 bg-blue-50 w-fit p-3 rounded-xl">
              <Ticket size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Đơn chờ nghiệm thu</h3>
              <p className="text-3xl font-bold text-gray-900">{summary?.pending_review_orders ?? 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 w-fit p-3 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Tổng cọc giữ (Deposit)</h3>
              <p className="text-3xl font-bold text-gray-900">{formatMoney(summary?.total_deposit ?? 0)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-purple-600 bg-purple-50 w-fit p-3 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Sale hoạt động</h3>
              <p className="text-3xl font-bold text-gray-900">{summary?.active_sales ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.4fr]">
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <h3 className="text-lg font-bold text-gray-900">Tạo payout mới</h3>
              <p className="mt-1 text-sm text-gray-500">Tạo bản ghi thanh toán cho KOL, có thể gắn với một order cụ thể hoặc tạo payout độc lập.</p>
            </div>
            <form onSubmit={(event) => void handleCreatePayout(event)} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">KOL nhận payout</label>
                <select
                  value={selectedPayoutKolId}
                  onChange={(event) => {
                    setSelectedPayoutKolId(event.target.value);
                    setSelectedPayoutOrderId('');
                  }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn KOL</option>
                  {payoutKols.map((kol) => (
                    <option key={kol.id} value={kol.id}>{kol.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Order liên quan</label>
                <select
                  value={selectedPayoutOrderId}
                  onChange={(event) => setSelectedPayoutOrderId(event.target.value)}
                  disabled={!selectedPayoutKolId}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Không gắn order cụ thể</option>
                  {selectedKolOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.campaign_name || order.id.slice(0, 8)} · {formatMoney(order.total_amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Số tiền payout</label>
                <input
                  type="text"
                  value={payoutAmount}
                  onChange={(event) => handleCurrencyChange(event, setPayoutAmount)}
                  placeholder="VD: 5.000.000"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ghi chú</label>
                <textarea
                  rows={3}
                  value={payoutNote}
                  onChange={(event) => setPayoutNote(event.target.value)}
                  placeholder="VD: Payout đợt 1 cho chiến dịch tháng 3"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={creatingPayout}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {creatingPayout ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                Tạo payout
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="rounded-xl bg-amber-50 p-3"><CircleDollarSign size={22} /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payout chờ xử lý</p>
                  <p className="text-3xl font-bold text-gray-900">{pendingPayouts}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-emerald-600">
                <div className="rounded-xl bg-emerald-50 p-3"><DollarSign size={22} /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Đã thanh toán</p>
                  <p className="text-3xl font-bold text-gray-900">{formatMoney(paidPayoutTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Payout Management</h3>
              <p className="mt-1 text-sm text-gray-500">Xem toàn bộ payout, lọc theo từng KOL và cập nhật trạng thái thanh toán.</p>
            </div>
            <div className="w-full lg:w-72">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Lọc theo KOL</label>
              <select
                value={payoutFilterKolId}
                onChange={(event) => setPayoutFilterKolId(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả KOL</option>
                {payoutKols.map((kol) => (
                  <option key={kol.id} value={kol.id}>{kol.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Ngày tạo</th>
                  <th className="px-6 py-4 font-medium">KOL</th>
                  <th className="px-6 py-4 font-medium">Chiến dịch / Order</th>
                  <th className="px-6 py-4 font-medium">Số tiền</th>
                  <th className="px-6 py-4 font-medium">Trạng thái</th>
                  <th className="px-6 py-4 font-medium">Ngày trả</th>
                  <th className="px-6 py-4 font-medium">Ghi chú</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                      Đang tải payouts...
                    </td>
                  </tr>
                ) : filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">Chưa có payout nào khớp với bộ lọc hiện tại.</td>
                  </tr>
                ) : filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">{new Date(payout.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{payout.kol_name || payout.kol_id}</td>
                    <td className="px-6 py-4">
                      {payout.order_campaign ? (
                        <span className="font-medium text-gray-900">{payout.order_campaign}</span>
                      ) : payout.order_id ? (
                        <span className="font-mono text-xs text-gray-500">{payout.order_id.slice(0, 8)}…</span>
                      ) : (
                        <span className="text-gray-400">Không gắn order</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{formatMoney(payout.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        payout.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : payout.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {payout.status === 'paid' ? 'Đã thanh toán' : payout.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{payout.paid_at ? new Date(payout.paid_at).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{payout.note || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      {payout.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleUpdatePayout(payout.id, 'paid')}
                            disabled={updatingPayoutId === payout.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-70"
                          >
                            {updatingPayoutId === payout.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Đánh dấu paid
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleUpdatePayout(payout.id, 'cancelled')}
                            disabled={updatingPayoutId === payout.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-70"
                          >
                            {updatingPayoutId === payout.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Hủy payout
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Không có thao tác</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ORDERS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mt-8">
            {actionError && (
              <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Lỗi thao tác:</strong> {actionError}
              </div>
            )}
            <div className="p-6 border-b flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Danh sách Đơn hàng (Toàn hệ thống)</h3>
                    <p className="text-sm text-gray-500 mt-1">Quản lý tất cả đơn hàng trên hệ thống.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowExportModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
                >
                    <FileSpreadsheet size={16} />
                    Xuất báo cáo nghiệm thu (Excel)
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                        <tr>
                            <th className="px-6 py-4 font-medium">Mã Đơn</th>
                            <th className="px-6 py-4 font-medium">Sale Phụ Trách</th>
                            <th className="px-6 py-4 font-medium">KOL</th>
                            <th className="px-6 py-4 font-medium">Doanh thu</th>
                            <th className="px-6 py-4 font-medium">Tiền cọc</th>
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
                      ) : orders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-10 text-center text-gray-500">Chưa có đơn hàng nào trong hệ thống.</td>
                        </tr>
                      ) : orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 font-semibold text-gray-900">{order.id}</td>
                          <td className="px-6 py-4">{order.sale?.full_name || order.sale_id}</td>
                          <td className="px-6 py-4">{order.kol?.full_name || order.kol_id}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{formatMoney(order.total_amount)}</td>
                          <td className="px-6 py-4">{formatMoney(order.deposit_amount)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {contractLoading === order.id ? (
                                <Loader2 size={16} className="animate-spin text-blue-600" />
                              ) : order.contract_file_path ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadContract(order)}
                                  className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                                >
                                  <Download size={12} /> Tải lại
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
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {order.proof_file_name ? (
                              <button
                                type="button"
                                onClick={() => void handleDownloadProof(order)}
                                className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition"
                                title={`Tải file: ${order.proof_file_name}`}
                              >
                                <Download size={12} /> Tải proof
                              </button>
                            ) : order.proof_link ? (
                              <a
                                href={order.proof_link}
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
                              order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'running' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'deposited' ? 'bg-indigo-100 text-indigo-700' :
                              order.status === 'init' ? 'bg-gray-100 text-gray-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {statusLabels[order.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* PENDING_APPROVAL: Sale đã claim, chờ Manager duyệt */}
                              {order.status === 'pending_approval' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleApproveClaim(order.id)}
                                    disabled={approvingId === order.id}
                                    className="text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 disabled:opacity-70"
                                  >
                                    {approvingId === order.id ? (
                                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 size={12} /> Duyệt
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleRejectClaim(order.id)}
                                    disabled={approvingId === order.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition disabled:opacity-70"
                                  >
                                    <X size={12} /> Từ chối
                                  </button>
                                </div>
                              ) : null}

                              {/* NEW_REQUEST: Khách nhập, chưa có sale → Manager chỉ định sale */}
                              {order.status === 'new_request' ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={selectedAssignSaleId}
                                    onChange={(e) => setSelectedAssignSaleId(e.target.value)}
                                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Chọn Sale</option>
                                    {sales.map((sale) => (
                                      <option key={sale.id} value={sale.id}>
                                        {sale.full_name || sale.email}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => void handleAssignSale(order.id, selectedAssignSaleId)}
                                    disabled={assigningOrderId === order.id}
                                    className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 disabled:opacity-70"
                                  >
                                    {assigningOrderId === order.id ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <>
                                        <Users size={12} /> Chỉ định
                                      </>
                                    )}
                                  </button>
                                </div>
                              ) : null}

                              {order.status === 'pending_review' ? (
                                <button
                                  onClick={() => void handleApprove(order.id)}
                                  disabled={approvingId === order.id}
                                  className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ml-auto disabled:opacity-70"
                                >
                                  {approvingId === order.id ? (
                                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : 'Duyệt đơn'}
                                </button>
                              ) : null}

                              {['init', 'deposited', 'running', 'pending_review'].includes(order.status) ? (
                                <button
                                  type="button"
                                  onClick={() => openCancelRefund(order, 'direct_cancel')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                                >
                                  <Ban size={12} /> Hủy đơn
                                </button>
                              ) : null}

                              {order.status === 'cancel_requested' ? (
                                <button
                                  type="button"
                                  onClick={() => openCancelRefund(order, 'approve_cancel')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                                >
                                  <CheckCircle2 size={12} /> Duyệt hủy
                                </button>
                              ) : null}

                              {order.status === 'cancelled' && order.deposit_amount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => openCancelRefund(order, 'request_refund')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 hover:bg-pink-100 transition"
                                >
                                  <RotateCcw size={12} /> Yêu cầu hoàn tiền
                                </button>
                              ) : null}

                              {order.status === 'refund_requested' ? (
                                <button
                                  type="button"
                                  onClick={() => openCancelRefund(order, 'approve_refund')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition"
                                >
                                  <CheckCircle2 size={12} /> Duyệt hoàn tiền
                                </button>
                              ) : null}

                              {order.status === 'completed' ? (
                                <span className="text-emerald-600 text-xs font-medium flex items-center justify-end gap-1">
                                  <CheckCircle2 size={14} /> Đã duyệt
                                </span>
                              ) : null}

                              {order.status !== 'pending_review' &&
                              order.status !== 'pending_approval' &&
                              order.status !== 'new_request' &&
                              !['init', 'deposited', 'running', 'pending_review'].includes(order.status) &&
                              order.status !== 'cancel_requested' &&
                              !(order.status === 'cancelled' && order.deposit_amount > 0) &&
                              order.status !== 'refund_requested' &&
                              order.status !== 'completed' ? (
                                <span className="text-xs text-gray-400">Không có thao tác</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
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

        <ExportReportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      </div>
    </RoleRouteGuard>
  );
}
