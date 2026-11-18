'use client';

import React, { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import { X, Loader2, FileSpreadsheet, Eye, ClipboardList, CheckSquare, Square } from 'lucide-react';
import { orderApi } from '@/services/order';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrderOption {
  id: string;
  kol_name: string;
  kol_email: string;
  sale_name: string;
  campaign_name: string;
  platform: string;
  status: string;
  proof_link: string | null;
  proof_file_name: string | null;
  created_at: string;
}

export default function ExportReportModal({ isOpen, onClose }: ExportReportModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'completed'>('overview');
  const [exporting, setExporting] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (statusFilter: 'pending_review' | 'completed') => {
    setLoadingOrders(true);
    setError(null);
    try {
      const data = await orderApi.getExportableOrders(statusFilter);
      setOrders(data);
      setSelectedIds([]);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể tải danh sách đơn.');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'pending') {
      void fetchOrders('pending_review');
    } else if (activeTab === 'completed') {
      void fetchOrders('completed');
    }
  }, [isOpen, activeTab]);

  const toggleOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === orders.length ? [] : orders.map((o) => o.id)
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (activeTab === 'overview') {
        await orderApi.exportProofReport({ export_type: 'overview' });
        onClose();
      } else {
        if (selectedIds.length === 0) {
          setError('Vui lòng chọn ít nhất một đơn hàng.');
          return;
        }
        const reportType = activeTab === 'completed' ? 'completed' : 'pending_review';
        await orderApi.exportSelectedProofReport({ order_ids: selectedIds, report_type: reportType });
        onClose();
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Không thể xuất báo cáo.');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const allSelected = selectedIds.length === orders.length && orders.length > 0;
  const someSelected = selectedIds.length > 0 && selectedIds.length < orders.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Xuất báo cáo nghiệm thu</h2>
              <p className="text-sm text-gray-500">Chọn loại báo cáo bạn muốn xuất</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
          {[
            { key: 'overview' as const, label: 'Tổng quan', icon: ClipboardList, color: 'blue' },
            { key: 'pending' as const, label: 'Chờ nghiệm thu', icon: Eye, color: 'orange' },
            { key: 'completed' as const, label: 'Đã hoàn thành', icon: CheckSquare, color: 'emerald' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? `border-${tab.color}-500 text-${tab.color}-600 bg-white`
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Lỗi:</strong> {error}
            </div>
          )}

          {/* Tab 1: Overview - no selection needed */}
          {activeTab === 'overview' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-semibold text-blue-800 mb-2">📊 Báo cáo Tổng quan</h3>
              <p className="text-sm text-blue-700 mb-3">
                Xuất toàn bộ đơn hàng đã có minh chứng (Đang chạy, Chờ nghiệm thu, Hoàn thành).
                Bao gồm đầy đủ thông tin KOL, link nghiệm thu, file proof và ghi chú.
              </p>
              <div className="text-xs text-blue-600 bg-white/60 rounded-lg px-3 py-2">
                → File Excel đầy đủ, dùng để lưu trữ đối chiếu nội bộ
              </div>
            </div>
          )}

          {/* Tab 2 & 3: Select orders */}
          {(activeTab === 'pending' || activeTab === 'completed') && (
            <div>
              <div className={`rounded-xl border p-4 mb-4 ${
                activeTab === 'pending' ? 'border-orange-200 bg-orange-50' : 'border-emerald-200 bg-emerald-50'
              }`}>
                <h3 className={`font-semibold text-sm mb-1 ${
                  activeTab === 'pending' ? 'text-orange-800' : 'text-emerald-800'
                }`}>
                  {activeTab === 'pending' ? '🔍 Danh sách Chờ nghiệm thu' : '✅ Danh sách Đã hoàn thành'}
                </h3>
                <p className={`text-xs ${
                  activeTab === 'pending' ? 'text-orange-600' : 'text-emerald-600'
                }`}>
                  {activeTab === 'pending'
                    ? 'Chọn đơn cần duyệt, xuất file đầy đủ thông tin để xem trước khi duyệt.'
                    : 'Chọn đơn đã hoàn thành, xuất file gọn (Tên KOL, Trạng thái, Link nghiệm thu) để gửi khách hàng.'}
                </p>
              </div>

              {/* Select All */}
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3 font-medium"
                >
                  {allSelected ? (
                    <CheckSquare size={16} className="text-blue-600" />
                  ) : (
                    <Square size={16} />
                  )}
                  Chọn tất cả ({orders.length} đơn)
                </button>
              )}

              {/* Order list */}
              {loadingOrders ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Đang tải danh sách đơn...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Không có đơn hàng nào ở trạng thái này.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {orders.map((order) => {
                    const isSelected = selectedIds.includes(order.id);
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => toggleOrder(order.id)}
                        className={`w-full text-left rounded-xl border-2 p-3 transition ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {isSelected ? (
                              <CheckSquare size={18} className="text-blue-600" />
                            ) : (
                              <Square size={18} className="text-gray-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-gray-900">{order.kol_name}</span>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                activeTab === 'pending'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {order.status === 'pending_review' ? 'Chờ nghiệm thu' : 'Hoàn thành'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Campaign: {order.campaign_name || '—'}</span>
                              <span>·</span>
                              <span>{order.platform || '—'}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              Sale: {order.sale_name || '—'} · {order.kol_email}
                            </div>
                            {order.proof_file_name && (
                              <div className="text-xs text-purple-600 mt-0.5">
                                📎 {order.proof_file_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedIds.length > 0 && (
                <div className="mt-3 text-sm text-blue-600 font-medium">
                  Đã chọn {selectedIds.length} đơn
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-400">
            {activeTab === 'overview' && 'Xuất toàn bộ đơn có proof'}
            {activeTab === 'pending' && `${selectedIds.length}/${orders.length} đơn đã chọn`}
            {activeTab === 'completed' && `${selectedIds.length}/${orders.length} đơn đã chọn`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || ((activeTab !== 'overview') && selectedIds.length === 0)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-70 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : activeTab === 'pending'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              {activeTab === 'overview' ? 'Xuất Tổng quan' : 'Xuất đã chọn'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
