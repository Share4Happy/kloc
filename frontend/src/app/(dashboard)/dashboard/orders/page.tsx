'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { Ticket, Search, Filter, Loader2, Eye, Plus, Edit, UploadCloud, Download, X, Ban, RotateCcw, CheckCircle } from 'lucide-react';
import { orderApi, Order, OrderStatus } from '@/services/order';
import { useAuthStore } from '@/store/authStore';
import CreateOrderModal from '@/components/booking/CreateOrderModal';
import UpdateOrderStatusModal from '@/components/booking/UpdateOrderStatusModal';
import SubmitOrderProofModal from '@/components/booking/SubmitOrderProofModal';
import CancelRefundModal, { type CancelRefundMode } from '@/components/booking/CancelRefundModal';

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const configs: Record<OrderStatus, { color: string, label: string }> = {
    new_request: { color: 'bg-purple-100 text-purple-800', label: 'Yêu cầu mới' },
    pending_approval: { color: 'bg-indigo-100 text-indigo-800', label: 'Chờ duyệt' },
    pending_sale_info: { color: 'bg-amber-100 text-amber-800', label: 'Chờ Sale cập nhật' },
    init: { color: 'bg-gray-100 text-gray-700', label: 'Khởi tạo' },
    deposited: { color: 'bg-blue-100 text-blue-700', label: 'Đã cọc' },
    running: { color: 'bg-yellow-100 text-yellow-700', label: 'Đang chạy' },
    pending_review: { color: 'bg-purple-100 text-purple-700', label: 'Chờ nghiệm thu' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Hoàn thành' },
    cancel_requested: { color: 'bg-orange-100 text-orange-700', label: 'Yêu cầu hủy' },
    cancelled: { color: 'bg-red-100 text-red-700', label: 'Đã hủy' },
    refund_requested: { color: 'bg-pink-100 text-pink-700', label: 'Yêu cầu hoàn tiền' },
    refunded: { color: 'bg-teal-100 text-teal-700', label: 'Đã hoàn tiền' },
  };
  const config = configs[status];
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${config.color}`}>
      {config.label}
    </span>
  );
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [campaignIdFilter, setCampaignIdFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<Order | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [selectedOrderForCancelRefund, setSelectedOrderForCancelRefund] = useState<Order | null>(null);
  const [cancelRefundMode, setCancelRefundMode] = useState<CancelRefundMode>('request_cancel');

  const openCancelRefund = (order: Order, mode: CancelRefundMode) => {
    setCancelRefundMode(mode);
    setSelectedOrderForCancelRefund(order);
  };

  const getErrorMessage = (err: unknown, fallback: string) => {
    const axiosError = err as AxiosError<{ detail?: string }>;
    return axiosError.response?.data?.detail || fallback;
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderApi.getOrders();
      setOrders(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Lỗi khi tải danh sách đơn hàng'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleDownloadProofFile = async (order: Order) => {
    try {
      await orderApi.downloadProofFile(order.id, order.proof_file_name || undefined);
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể tải tệp proof.'));
    }
  };

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      const fromDate = createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;
      const toDate = createdTo ? new Date(`${createdTo}T23:59:59`) : null;

      const matchesKeyword = !normalizedKeyword || [
        order.id,
        order.kol?.full_name,
        order.kol?.email,
        order.sale?.full_name,
        order.sale?.email,
        order.status,
        order.customer_name,
        order.campaign_name,
        order.platform,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedKeyword));

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const normalizedCampaign = campaignIdFilter.trim().toLowerCase();
      const matchesCampaign = !normalizedCampaign || (order.campaign_id || '').toLowerCase().includes(normalizedCampaign);
      const matchesFrom = !fromDate || createdAt >= fromDate;
      const matchesTo = !toDate || createdAt <= toDate;

      return matchesKeyword && matchesStatus && matchesCampaign && matchesFrom && matchesTo;
    });
  }, [orders, keyword, statusFilter, campaignIdFilter, createdFrom, createdTo]);

  const hasActiveFilter = keyword || statusFilter !== 'all' || campaignIdFilter || createdFrom || createdTo;

  const resetFilters = () => {
    setKeyword('');
    setStatusFilter('all');
    setCampaignIdFilter('');
    setCreatedFrom('');
    setCreatedTo('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-gray-500 text-sm mt-1">Xem và xử lý các Booking đã được tạo trên hệ thống.</p>
        </div>
        
        {/* Only Sale/Manager/Admin can create orders */}
        {user && ['admin', 'manager', 'sale'].includes(user.role) && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm shadow-blue-200 flex items-center gap-2"
          >
            <Plus size={18} />
            Tạo Đơn Hàng Mới
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9 appearance-none block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              placeholder="Tìm mã đơn, tên KOL, tên Sale..."
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <Filter size={16} />
            {showFilters ? 'Ẩn bộ lọc' : 'Lọc kết quả'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 border-b border-gray-100 bg-white p-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="new_request">Yêu cầu mới</option>
                <option value="pending_approval">Chờ duyệt</option>
                <option value="init">Khởi tạo</option>
                <option value="deposited">Đã cọc</option>
                <option value="running">Đang chạy</option>
                <option value="pending_review">Chờ nghiệm thu</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancel_requested">Yêu cầu hủy</option>
                <option value="cancelled">Đã hủy</option>
                <option value="refund_requested">Yêu cầu hoàn tiền</option>
                <option value="refunded">Đã hoàn tiền</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Campaign ID</label>
              <input
                type="text"
                value={campaignIdFilter}
                onChange={(e) => setCampaignIdFilter(e.target.value)}
                placeholder="Nhập campaign id..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Từ ngày</label>
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Đến ngày</label>
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilter}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        )}

        <div className="border-b border-gray-100 bg-white px-4 py-3 text-sm text-gray-500">
          Hiển thị {filteredOrders.length} / {orders.length} đơn hàng
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="p-4">Mã Đơn</th>
                <th className="p-4">KOL</th>
                <th className="p-4">Sale</th>
                <th className="p-4">Tổng Giá Trị</th>
                <th className="p-4">Đã Cọc</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4">Ngày Tạo</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-red-500 font-medium">
                    {error}
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
                    <Ticket size={48} className="mb-4 text-gray-200" />
                    <p className="font-medium text-gray-600 mb-1">Không có đơn hàng phù hợp</p>
                    <p className="text-sm">Thử đổi từ khóa hoặc bộ lọc để xem kết quả khác.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4">
                      <div className="font-mono text-xs text-gray-600" title={order.id}>{order.id.slice(0, 8)}…</div>
                      {order.campaign_name && (
                        <div className="text-xs text-blue-600 mt-0.5">{order.campaign_name}</div>
                      )}
                      {order.booking_type && (
                        <span className={`mt-0.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${order.booking_type === 'combo' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
                          {order.booking_type}
                        </span>
                      )}
                      {order.combo_group_id && (
                        <div className="mt-0.5 text-[10px] text-purple-600" title={order.combo_group_id}>
                          Nhóm combo: {order.combo_group_id.slice(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{order.kol?.full_name || 'Không rõ'}</div>
                      <div className="text-xs text-gray-500">{order.kol?.email || order.kol_id}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{order.sale?.full_name || 'Không rõ'}</div>
                      <div className="text-xs text-gray-500">{order.sale?.email || order.sale_id}</div>
                    </td>
                    <td className="p-4 font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                    <td className="p-4 text-gray-600">{formatCurrency(order.deposit_amount)}</td>
                    <td className="p-4"><StatusBadge status={order.status} /></td>
                    <td className="p-4 text-gray-500">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Status Update (Admin, Manager, Sale, KOL_Manager) */}
                        {user && ['admin', 'manager', 'sale', 'kol_manager'].includes(user.role) && (
                          <button 
                            onClick={() => setSelectedOrderForStatus(order)}
                            className="text-gray-600 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition tooltip-trigger inline-flex items-center"
                            title="Cập nhật trạng thái"
                          >
                            <Edit size={16} />
                          </button>
                        )}

                        {/* Cancel / Refund actions */}
                        {user && (
                          <>
                            {/* Cancel actions: direct for internal roles, request for KOL */}
                            {['init', 'deposited', 'running', 'pending_review'].includes(order.status) &&
                              ['sale', 'kol', 'manager', 'admin'].includes(user.role) && (
                                <button
                                  onClick={() => openCancelRefund(order, user.role === 'kol' ? 'request_cancel' : 'direct_cancel')}
                                  className={`p-1.5 rounded-lg transition inline-flex items-center ${user.role === 'kol' ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                                  title={user.role === 'kol' ? 'Yêu cầu hủy đơn' : 'Hủy đơn ngay'}
                                >
                                  <Ban size={16} />
                                </button>
                              )}

                            {/* Approve cancel: Manager/Admin when cancel_requested */}
                            {order.status === 'cancel_requested' &&
                              ['manager', 'admin'].includes(user.role) && (
                                <button
                                  onClick={() => openCancelRefund(order, 'approve_cancel')}
                                  className="text-orange-600 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition inline-flex items-center"
                                  title="Phê duyệt hủy đơn"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}

                            {/* Request refund: cancelled + deposit > 0, Sale/Manager */}
                            {order.status === 'cancelled' && order.deposit_amount > 0 &&
                              ['sale', 'manager', 'admin'].includes(user.role) && (
                                <button
                                  onClick={() => openCancelRefund(order, 'request_refund')}
                                  className="text-gray-500 hover:text-pink-600 p-1.5 rounded-lg hover:bg-pink-50 transition inline-flex items-center"
                                  title="Yêu cầu hoàn tiền"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              )}

                            {/* Approve refund: Manager/Admin when refund_requested */}
                            {order.status === 'refund_requested' &&
                              ['manager', 'admin'].includes(user.role) && (
                                <button
                                  onClick={() => openCancelRefund(order, 'approve_refund')}
                                  className="text-pink-600 hover:text-teal-700 p-1.5 rounded-lg hover:bg-teal-50 transition inline-flex items-center"
                                  title="Phê duyệt hoàn tiền"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                          </>
                        )}

                        {/* Submit Proof (KOL) */}
                        {user && user.role === 'kol' && (
                          <button 
                            onClick={() => setSelectedOrderForProof(order)}
                            className="text-gray-600 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 transition tooltip-trigger inline-flex items-center"
                            title="Nộp kết quả (Proof)"
                          >
                            <UploadCloud size={16} />
                          </button>
                        )}

                        {order.proof_file_name && user && ['admin', 'manager', 'sale', 'kol_manager'].includes(user.role) && (
                          <button
                            onClick={() => handleDownloadProofFile(order)}
                            className="text-gray-600 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition tooltip-trigger inline-flex items-center"
                            title={`Tai file: ${order.proof_file_name}`}
                          >
                            <Download size={16} />
                          </button>
                        )}

                        <button 
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition tooltip-trigger inline-flex items-center"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <CreateOrderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchOrders} 
      />

      <UpdateOrderStatusModal
        isOpen={!!selectedOrderForStatus}
        onClose={() => setSelectedOrderForStatus(null)}
        onSuccess={fetchOrders}
        order={selectedOrderForStatus}
      />

      <SubmitOrderProofModal
        isOpen={!!selectedOrderForProof}
        onClose={() => setSelectedOrderForProof(null)}
        onSuccess={fetchOrders}
        order={selectedOrderForProof}
      />

      <CancelRefundModal
        isOpen={!!selectedOrderForCancelRefund}
        onClose={() => setSelectedOrderForCancelRefund(null)}
        onSuccess={fetchOrders}
        order={selectedOrderForCancelRefund}
        mode={cancelRefundMode}
      />

      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chi tiết đơn hàng</h2>
                <p className="text-sm text-gray-500">#{selectedOrderForDetail.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">KOL</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrderForDetail.kol?.full_name || 'Không rõ'}</p>
                  <p className="text-sm text-gray-500">{selectedOrderForDetail.kol?.email || selectedOrderForDetail.kol_id}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sale phụ trách</p>
                  <p className="mt-2 font-semibold text-gray-900">{selectedOrderForDetail.sale?.full_name || 'Không rõ'}</p>
                  <p className="text-sm text-gray-500">{selectedOrderForDetail.sale?.email || selectedOrderForDetail.sale_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tổng giá trị</p>
                  <p className="mt-2 font-semibold text-gray-900">{formatCurrency(selectedOrderForDetail.total_amount)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Đã cọc</p>
                  <p className="mt-2 font-semibold text-gray-900">{formatCurrency(selectedOrderForDetail.deposit_amount)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</p>
                  <div className="mt-2">
                    <StatusBadge status={selectedOrderForDetail.status} />
                  </div>
                </div>
              </div>

              {/* Business / campaign info */}
              {(selectedOrderForDetail.customer_name ||
                selectedOrderForDetail.campaign_name ||
                selectedOrderForDetail.platform ||
                selectedOrderForDetail.combo_group_id ||
                selectedOrderForDetail.kpi) && (
                <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Thông tin chiến dịch</p>
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    {selectedOrderForDetail.customer_name && (
                      <div>
                        <span className="font-medium text-gray-900">Khách hàng: </span>
                        <span className="text-gray-700">{selectedOrderForDetail.customer_name}</span>
                      </div>
                    )}
                    {selectedOrderForDetail.customer_representative && (
                      <div>
                        <span className="font-medium text-gray-900">Người đại diện: </span>
                        <span className="text-gray-700">{selectedOrderForDetail.customer_representative}</span>
                      </div>
                    )}
                    {selectedOrderForDetail.campaign_name && (
                      <div>
                        <span className="font-medium text-gray-900">Chiến dịch: </span>
                        <span className="text-gray-700">{selectedOrderForDetail.campaign_name}</span>
                      </div>
                    )}
                    {selectedOrderForDetail.platform && (
                      <div>
                        <span className="font-medium text-gray-900">Nền tảng: </span>
                        <span className="text-gray-700">{selectedOrderForDetail.platform}</span>
                      </div>
                    )}
                    {selectedOrderForDetail.post_count != null && (
                      <div>
                        <span className="font-medium text-gray-900">Số content: </span>
                        <span className="text-gray-700">{selectedOrderForDetail.post_count}</span>
                      </div>
                    )}
                    {selectedOrderForDetail.booking_type && (
                      <div>
                        <span className="font-medium text-gray-900">Loại booking: </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selectedOrderForDetail.booking_type === 'combo' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {selectedOrderForDetail.booking_type === 'combo' ? 'Combo' : 'Custom'}
                        </span>
                      </div>
                    )}
                    {selectedOrderForDetail.combo_group_id && (
                      <div>
                        <span className="font-medium text-gray-900">Mã nhóm combo: </span>
                        <span className="font-mono text-gray-700">{selectedOrderForDetail.combo_group_id}</span>
                      </div>
                    )}
                    {selectedOrderForDetail.kpi && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-900">KPI: </span>
                        <span className="text-gray-700">{selectedOrderForDetail.kpi}</span>
                      </div>
                    )}
                    {selectedOrderForDetail.package_definition && (() => {
                      const packageDefinition = selectedOrderForDetail.package_definition;
                      const presetName = String(packageDefinition.preset_name ?? '');
                      const badge = packageDefinition.badge;
                      const hasBadge = badge != null && String(badge).trim() !== '';

                      return (
                        <div className="md:col-span-2 mt-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                          <span className="font-semibold">Gói preset: </span>
                          {presetName}
                          {hasBadge ? (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-white/70 border border-indigo-200 text-indigo-600">
                              {String(badge)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ngày tạo</p>
                  <p className="mt-2 text-sm text-gray-900">{new Date(selectedOrderForDetail.created_at).toLocaleString('vi-VN')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cập nhật lần cuối</p>
                  <p className="mt-2 text-sm text-gray-900">{new Date(selectedOrderForDetail.updated_at).toLocaleString('vi-VN')}</p>
                </div>
              </div>

              {/* Cancel / Refund audit info */}
              {(selectedOrderForDetail.cancel_reason || selectedOrderForDetail.cancel_note) && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Thông tin hủy / hoàn tiền</p>
                  {selectedOrderForDetail.cancel_reason && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Lý do: </span>
                      <span className="text-gray-700">{selectedOrderForDetail.cancel_reason}</span>
                    </div>
                  )}
                  {selectedOrderForDetail.cancel_note && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Ghi chú phê duyệt: </span>
                      <span className="text-gray-700">{selectedOrderForDetail.cancel_note}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Proof / nghiệm thu</p>
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  <div>
                    <span className="font-medium text-gray-900">Link proof: </span>
                    {selectedOrderForDetail.proof_link ? (
                      <a
                        href={selectedOrderForDetail.proof_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-blue-600 hover:underline"
                      >
                        {selectedOrderForDetail.proof_link}
                      </a>
                    ) : (
                      <span>Chưa có</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Ghi chú: </span>
                    <span>{selectedOrderForDetail.proof_notes || 'Không có'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      <span className="font-medium text-gray-900">Tệp proof: </span>
                      {selectedOrderForDetail.proof_file_name || 'Không có'}
                    </span>
                    {selectedOrderForDetail.proof_file_name && (
                      <button
                        type="button"
                        onClick={() => void handleDownloadProofFile(selectedOrderForDetail)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Download size={14} /> Tải tệp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
