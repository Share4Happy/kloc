'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { notificationApi, Notification, NotificationSummary } from '@/services/notification';
import { Bell, Check, CheckCheck, Clock, AlertTriangle, Info, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info size={16} className="text-blue-500 shrink-0" />,
  success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
  action_required: <AlertTriangle size={16} className="text-red-500 shrink-0" />,
};

const typeColors: Record<string, string> = {
  info: 'border-l-blue-400',
  success: 'border-l-emerald-400',
  warning: 'border-l-amber-400',
  action_required: 'border-l-red-400',
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({ total: 0, unread: 0, action_required: 0 });
  const [loading, setLoading] = useState(true);
  const [hasNewToast, setHasNewToast] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; type: string }>>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [notifs, summ] = await Promise.all([
        notificationApi.getNotifications({ limit: 20 }),
        notificationApi.getSummary(),
      ]);

      // Only show toast for notifications that have NOT been viewed yet
      const unviewedNotifs = notifs.filter(n => !n.viewed);
      if (unviewedNotifs.length > 0) {
        unviewedNotifs.slice(0, 3).forEach(n => {
          setToasts(prev => [...prev, { id: n.id, title: n.title, message: n.message, type: n.type }]);
          // Mark as viewed in DB so it never shows toast again
          notificationApi.markAsViewed(n.id).catch(() => {});
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== n.id)), 6000);
        });
      }
      
      setNotifications(notifs);
      setSummary(summ);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Polling every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setSummary(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch { /* silent */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setSummary(prev => ({ ...prev, unread: 0, action_required: 0 }));
    } catch { /* silent */ }
  };

  return (
    <>
      {/* Toast Push Notifications */}
      <div className="fixed top-20 right-4 z-[100] space-y-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border-l-4 bg-white shadow-lg p-4 animate-slide-in ${
              typeColors[toast.type] || 'border-l-gray-400'
            }`}
          >
            <div className="flex items-start gap-3">
              {typeIcons[toast.type] || <Info size={16} className="text-gray-400 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{toast.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bell Icon */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full hover:bg-gray-100 transition"
          title="Thông báo"
        >
          <Bell size={20} className="text-gray-600" />
          {summary.unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {summary.unread > 99 ? '99+' : summary.unread}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 max-h-[500px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {summary.unread > 0 ? `${summary.unread} thông báo chưa đọc` : 'Không có thông báo mới'}
                </p>
              </div>
              {summary.unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Đánh dấu tất cả
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có thông báo nào</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition cursor-pointer border-l-2 ${
                        notif.is_read ? 'border-l-transparent' : typeColors[notif.type] || 'border-l-gray-300'
                      }`}
                      onClick={() => void handleMarkAsRead(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        {typeIcons[notif.type] || <Info size={16} className="text-gray-400 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${notif.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Clock size={10} className="text-gray-400" />
                            <span className="text-[10px] text-gray-400">{formatRelativeTime(notif.created_at)}</span>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-gray-50 border-t text-center shrink-0">
              <span className="text-xs text-gray-400">Tổng: {summary.total} thông báo</span>
            </div>
          </div>
        )}
      </div>

      {/* Toast animation keyframes */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
