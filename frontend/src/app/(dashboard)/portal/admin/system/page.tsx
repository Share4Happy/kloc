'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import { BookOpen, GitBranch, ArrowRight, ShieldCheck, Server, Loader2 } from 'lucide-react';

export default function SystemInfoPage() {
  const router = useRouter();
  const [latestVersion, setLatestVersion] = useState<string>('...');

  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(data => setLatestVersion(data.version))
      .catch(() => setLatestVersion('0.9'));
  }, []);

  const sections = [
    {
      id: 'api',
      title: 'Tài liệu API Nội bộ',
      description: 'Xem danh sách endpoint, phương thức xác thực và tài liệu Swagger UI.',
      icon: <Server size={24} />,
      color: 'blue',
      href: '/portal/admin/system/api',
      features: [
        'Swagger UI tự động sinh từ OpenAPI',
        'Danh sách endpoint theo module',
        'Hướng dẫn xác thực & phân quyền',
      ],
    },
    {
      id: 'changelog',
      title: 'Cập nhật Hệ thống',
      description: 'Lịch sử phiên bản, tính năng mới và fix bug theo từng release.',
      icon: <GitBranch size={24} />,
      color: 'emerald',
      href: '/portal/admin/system/changelog',
      features: [
        `Phiên bản hiện tại: ${latestVersion}`,
        'Chi tiết tính năng từng bản',
        'Ghi chú nâng cấp & fix bug',
      ],
    },
  ];

  return (
    <AdminRouteGuard>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={28} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Thông tin Hệ thống</h1>
          </div>
          <p className="text-gray-500">Quản lý tài liệu kỹ thuật, API và lịch sử cập nhật hệ thống.</p>
        </div>

        {/* Version Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-2">
          <span className="text-sm font-medium text-blue-700">Phiên bản hiện tại</span>
          <span className="text-sm font-bold text-blue-900 bg-blue-100 px-3 py-0.5 rounded-full">
            {latestVersion === '...' ? <Loader2 size={14} className="animate-spin" /> : `v${latestVersion}`}
          </span>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => router.push(section.href)}
              className={`text-left rounded-2xl border-2 border-gray-200 p-6 transition hover:border-${section.color}-300 hover:bg-${section.color}-50/30 group`}
            >
              <div className="flex items-start gap-4">
                <div className={`rounded-xl bg-${section.color}-100 p-3 text-${section.color}-600 group-hover:bg-${section.color}-200 transition`}>
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <ArrowRight size={18} className={`text-gray-400 group-hover:text-${section.color}-600 transition`} />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{section.description}</p>
                  <ul className="space-y-1.5">
                    {section.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className={`w-1 h-1 rounded-full bg-${section.color}-400`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Tổng quan hệ thống</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{latestVersion === '...' ? '...' : `v${latestVersion}`}</p>
              <p className="text-xs text-gray-500 mt-1">Phiên bản</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">2026-04</p>
              <p className="text-xs text-gray-500 mt-1">Tháng phát hành</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">15+</p>
              <p className="text-xs text-gray-500 mt-1">Endpoint API</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">5</p>
              <p className="text-xs text-gray-500 mt-1">Role hệ thống</p>
            </div>
          </div>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
