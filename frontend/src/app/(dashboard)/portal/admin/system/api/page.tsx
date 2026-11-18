'use client';

import React, { useState } from 'react';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import { ShieldCheck, ChevronDown, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  summary: string;
  roles: string[];
  auth: boolean;
}

interface Module {
  name: string;
  prefix: string;
  description: string;
  endpoints: Endpoint[];
}

const apiModules: Module[] = [
  {
    name: 'Authentication',
    prefix: '/auth',
    description: 'Xác thực, đăng ký, đăng nhập và quản lý session.',
    endpoints: [
      { method: 'POST', path: '/auth/login', summary: 'Đăng nhập hệ thống', roles: ['public'], auth: false },
      { method: 'POST', path: '/auth/register', summary: 'Đăng ký tài khoản mới', roles: ['public'], auth: false },
      { method: 'GET', path: '/auth/me', summary: 'Lấy thông tin user hiện tại', roles: ['admin', 'manager', 'sale', 'kol_manager', 'kol'], auth: true },
    ],
  },
  {
    name: 'Orders',
    prefix: '/orders',
    description: 'Quản lý đơn hàng booking, trạng thái và cập nhật.',
    endpoints: [
      { method: 'POST', path: '/orders', summary: 'Tạo đơn hàng mới', roles: ['sale', 'manager'], auth: true },
      { method: 'GET', path: '/orders', summary: 'Lấy danh sách đơn hàng', roles: ['admin', 'manager', 'sale', 'kol_manager', 'kol'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/status', summary: 'Cập nhật trạng thái đơn', roles: ['sale', 'manager', 'kol_manager'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/price', summary: 'Cập nhật giá trị đơn hàng', roles: ['sale', 'manager', 'admin'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/assign-sale', summary: 'Manager chỉ định Sale cho đơn', roles: ['manager', 'admin'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/assign-kol', summary: 'KOL Manager phân bổ KOL', roles: ['kol_manager', 'manager', 'admin'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/update-info', summary: 'Sale cập nhật thông tin đơn', roles: ['sale', 'manager'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/upsale', summary: 'Sale cập nhật đơn (lưu lịch sử)', roles: ['sale', 'manager'], auth: true },
      { method: 'POST', path: '/orders/{id}/cancel', summary: 'Hủy đơn hàng trực tiếp', roles: ['sale', 'manager', 'admin'], auth: true },
      { method: 'POST', path: '/orders/{id}/request-cancel', summary: 'KOL yêu cầu hủy đơn', roles: ['kol'], auth: true },
      { method: 'POST', path: '/orders/{id}/approve-cancel', summary: 'Duyệt hủy đơn hàng', roles: ['manager', 'admin'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/claim', summary: 'Sale nhận đơn từ public', roles: ['sale'], auth: true },
      { method: 'PATCH', path: '/orders/{id}/approve-claim', summary: 'Duyệt đơn Sale nhận', roles: ['manager', 'admin'], auth: true },
      { method: 'GET', path: '/orders/export-proof-report', summary: 'Xuất báo cáo nghiệm thu Excel', roles: ['admin', 'manager', 'kol_manager'], auth: true },
    ],
  },
  {
    name: 'KOL Profiles',
    prefix: '/kol',
    description: 'Quản lý hồ sơ KOL, xác thực và phân bổ.',
    endpoints: [
      { method: 'GET', path: '/kol/profile', summary: 'KOL lấy profile của mình', roles: ['kol'], auth: true },
      { method: 'PUT', path: '/kol/profile', summary: 'KOL cập nhật profile', roles: ['kol'], auth: true },
      { method: 'GET', path: '/kol/profiles', summary: 'Lấy danh sách KOL (nội bộ)', roles: ['admin', 'manager', 'sale', 'kol_manager'], auth: true },
      { method: 'GET', path: '/kol/filters', summary: 'Lọc KOL thông minh', roles: ['admin', 'manager', 'sale', 'kol_manager'], auth: true },
      { method: 'PATCH', path: '/kol/{id}/verify', summary: 'Duyệt/từ chối hồ sơ KOL', roles: ['admin', 'manager', 'kol_manager'], auth: true },
      { method: 'PATCH', path: '/kol/{id}/visibility', summary: 'Bật/tắt hiển thị KOL', roles: ['admin', 'manager', 'kol_manager'], auth: true },
      { method: 'POST', path: '/kol/profile/avatar', summary: 'KOL upload ảnh đại diện', roles: ['kol'], auth: true },
      { method: 'POST', path: '/kol/profile/evidence', summary: 'KOL upload minh chứng', roles: ['kol'], auth: true },
    ],
  },
  {
    name: 'Leads',
    prefix: '/leads',
    description: 'Quản lý lead từ Landing Page và Contact Form.',
    endpoints: [
      { method: 'POST', path: '/leads', summary: 'Tạo lead từ form công khai', roles: ['public'], auth: false },
      { method: 'GET', path: '/leads', summary: 'Xem danh sách lead', roles: ['admin', 'manager', 'sale'], auth: true },
    ],
  },
  {
    name: 'Campaigns',
    prefix: '/campaigns',
    description: 'Quản lý chiến dịch và combo booking.',
    endpoints: [
      { method: 'POST', path: '/campaigns', summary: 'Tạo chiến dịch mới', roles: ['sale', 'manager'], auth: true },
      { method: 'GET', path: '/campaigns', summary: 'Lấy danh sách chiến dịch', roles: ['admin', 'manager', 'sale'], auth: true },
      { method: 'GET', path: '/campaigns/{id}', summary: 'Chi tiết chiến dịch', roles: ['admin', 'manager', 'sale'], auth: true },
    ],
  },
  {
    name: 'Contracts',
    prefix: '/contracts',
    description: 'Tạo và quản lý hợp đồng booking.',
    endpoints: [
      { method: 'POST', path: '/contracts/generate', summary: 'Tạo hợp đồng từ đơn hàng', roles: ['sale', 'manager', 'kol_manager'], auth: true },
      { method: 'GET', path: '/contracts/{id}/download', summary: 'Tải file hợp đồng', roles: ['sale', 'manager', 'kol_manager', 'admin'], auth: true },
    ],
  },
  {
    name: 'Payouts',
    prefix: '/payouts',
    description: 'Quản lý thanh toán cho KOL.',
    endpoints: [
      { method: 'POST', path: '/payouts', summary: 'Tạo payout mới', roles: ['manager', 'admin'], auth: true },
      { method: 'GET', path: '/payouts', summary: 'Lấy danh sách payouts', roles: ['manager', 'admin'], auth: true },
      { method: 'GET', path: '/payouts/me', summary: 'KOL xem payouts của mình', roles: ['kol'], auth: true },
      { method: 'PATCH', path: '/payouts/{id}', summary: 'Cập nhật trạng thái payout', roles: ['manager', 'admin'], auth: true },
    ],
  },
  {
    name: 'Dashboard',
    prefix: '/dashboard',
    description: 'Thống kê tổng quan hệ thống.',
    endpoints: [
      { method: 'GET', path: '/dashboard/summary', summary: 'Lấy tóm tắt dashboard', roles: ['admin', 'manager', 'sale', 'kol_manager', 'kol'], auth: true },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-emerald-100 text-emerald-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PUT: 'bg-purple-100 text-purple-700',
};

function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${endpoint.method} ${endpoint.path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition group">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="text-sm text-gray-700 font-mono truncate">{endpoint.path}</code>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-500 hidden md:inline">{endpoint.summary}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition"
          title="Copy endpoint"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

function ModuleSection({ mod }: { mod: Module }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{mod.name}</h4>
            <p className="text-xs text-gray-500">{mod.prefix} · {mod.endpoints.length} endpoints</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 hidden sm:inline">{mod.description}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-gray-100 p-2 bg-white">
          {mod.endpoints.map((ep, idx) => (
            <EndpointRow key={idx} endpoint={ep} />
          ))}
          <div className="px-3 py-2 text-xs text-gray-400 flex items-center gap-1">
            <ExternalLink size={12} />
            <span>Swagger UI: <code className="text-blue-600">/docs</code></span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <AdminRouteGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={24} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tài liệu API Nội bộ</h1>
            <p className="text-sm text-gray-500">Danh sách endpoint, phương thức và phân quyền.</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border bg-blue-50 border-blue-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-sm font-medium text-blue-800">📖 Truy cập nhanh:</span>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Swagger UI (OpenAPI)
            <ExternalLink size={12} />
          </a>
          <span className="text-xs text-blue-400">·</span>
          <a
            href="/redoc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ReDoc Documentation
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Module Sections */}
        <div className="space-y-3">
          {apiModules.map((mod) => (
            <ModuleSection key={mod.prefix} mod={mod} />
          ))}
        </div>

        {/* Role Legend */}
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Chú thích Roles</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { role: 'admin', label: 'Quản trị viên', color: 'bg-red-100 text-red-700' },
              { role: 'manager', label: 'Quản lý', color: 'bg-purple-100 text-purple-700' },
              { role: 'sale', label: 'Nhân viên Sale', color: 'bg-blue-100 text-blue-700' },
              { role: 'kol_manager', label: 'Quản lý KOL', color: 'bg-orange-100 text-orange-700' },
              { role: 'kol', label: 'KOL/KOC', color: 'bg-emerald-100 text-emerald-700' },
              { role: 'public', label: 'Không cần đăng nhập', color: 'bg-gray-100 text-gray-600' },
            ].map((r) => (
              <span key={r.role} className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${r.color}`}>
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
