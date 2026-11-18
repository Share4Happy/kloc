'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User as UserIcon, Settings, LayoutDashboard, Ticket, Users, Briefcase, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/notifications/NotificationBell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.push('/login');
    }
  }, [isClient, isAuthenticated, router]);

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isClient || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex animate-pulse flex-col items-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary-soft)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--text-soft)]">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    sale: 'Nhân viên Sale',
    kol_manager: 'Quản lý KOL',
    kol: 'KOL',
  };

  const menus = [
    { label: 'Tổng quan hệ thống', href: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['kol_manager', 'kol'] },
    { label: 'Cổng quản trị', href: '/portal/admin', icon: <LayoutDashboard size={20} />, roles: ['admin'] },
    { label: 'Cổng quản lý', href: '/portal/manager', icon: <LayoutDashboard size={20} />, roles: ['manager', 'admin'] },
    { label: 'Khu vực Sale', href: '/portal/sale', icon: <LayoutDashboard size={20} />, roles: ['sale'] },
    { label: 'Công cụ lọc KOL', href: '/portal/sale/tools', icon: <Users size={20} />, roles: ['sale', 'manager', 'admin'] },
    { label: 'Quản lý KOL', href: '/portal/kol_manager', icon: <Users size={20} />, roles: ['admin', 'kol_manager', 'manager'] },
    { label: 'Không gian KOL', href: '/portal/kol', icon: <LayoutDashboard size={20} />, roles: ['kol'] },
    { label: 'Đơn hàng booking', href: '/dashboard/orders', icon: <Ticket size={20} />, roles: ['admin', 'manager', 'sale', 'kol'] },
    { label: 'Campaign combo', href: '/dashboard/campaigns', icon: <Briefcase size={20} />, roles: ['admin', 'manager', 'sale'] },
    { label: 'Cấu hình giao diện', href: '/portal/admin/settings', icon: <Settings size={20} />, roles: ['admin'] },
    { label: 'Thông tin hệ thống', href: '/portal/admin/system', icon: <ShieldCheck size={20} />, roles: ['admin'] },
  ];

  const allowedMenus = menus.filter((m) => m.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden w-72 flex-shrink-0 border-r border-[var(--line)] bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-[var(--line)] px-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-[var(--primary)]">
            KLOC<span className="text-[var(--foreground)]">Portal</span>
          </Link>
        </div>

        <div className="border-b border-[var(--line)] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Vai trò đăng nhập</p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{roleLabels[user.role] || 'Người dùng hệ thống'}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {allowedMenus.map((menu) => {
            const isActive = pathname.startsWith(menu.href) && (pathname === menu.href || menu.href !== '/dashboard');
            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                    : 'text-[var(--text-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {menu.icon}
                {menu.label}
              </Link>
            );
          })}
        </nav>


      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-white/88 px-4 backdrop-blur-sm md:px-6">
          <div className="hidden md:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Khu vực làm việc</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">{roleLabels[user.role] || 'Người dùng hệ thống'}</p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell />
            <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 w-full rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-gray-50 transition"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <UserIcon size={16} />
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-none text-[var(--foreground)]">{user.full_name}</p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">{user.email}</p>
              </div>
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-2 z-50">
                <div className="px-3 py-2 border-b border-gray-100 mb-2 sm:hidden">
                  <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
