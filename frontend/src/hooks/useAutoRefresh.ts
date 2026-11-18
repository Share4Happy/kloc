import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoRefreshOptions {
  /** Polling interval in milliseconds (default: 10000 = 10s) */
  intervalMs?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook tự động polling data theo interval.
 * Dùng cho các trang cần cập nhật realtime khi có thay đổi từ user khác.
 *
 * @param fetchFn - Hàm async trả về data cần fetch
 * @param setData - Hàm setter để update state với data mới
 * @param options - Cấu hình interval, enabled
 *
 * @returns { refresh } - Hàm gọi manual refresh
 *
 * @example
 * const { refresh } = useAutoRefresh(fetchData, setOrders, { intervalMs: 8000 });
 * // Dừng khi tab ẩn, resume khi tab hiện
 */
export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  setData: (data: T) => void,
  options: UseAutoRefreshOptions = {}
) {
  const { intervalMs = 10000, enabled = true } = options;
  const fetchFnRef = useRef(fetchFn);
  const setDataRef = useRef(setData);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [lastRefresh, setLastRefresh] = useState(Date.now());

  fetchFnRef.current = fetchFn;
  setDataRef.current = setData;

  const doRefresh = useCallback(async () => {
    try {
      const data = await fetchFnRef.current();
      setDataRef.current(data);
      setLastRefresh(Date.now());
    } catch {
      // Silent fail - sẽ retry lần sau
    }
  }, []);

  // Start/stop polling based on enabled + tab visibility
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        void doRefresh();
      }, intervalMs);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Start polling
    startPolling();

    // Stop when tab hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        void doRefresh(); // Refresh ngay khi tab hiện lại
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, doRefresh]);

  return {
    /** Gọi manual refresh (VD: sau khi submit form thành công) */
    refresh: doRefresh,
    /** Timestamp lần refresh cuối */
    lastRefresh,
  };
}
