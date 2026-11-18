import { api } from '@/lib/axios';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'action_required';
  ref_type: string | null;
  ref_id: string | null;
  data_json: Record<string, unknown> | null;
  is_read: boolean;
  viewed: boolean;
  created_at: string;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  action_required: number;
}

export const notificationApi = {
  getNotifications: async (params?: { is_read?: boolean; limit?: number }): Promise<Notification[]> => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },

  getSummary: async (): Promise<NotificationSummary> => {
    const res = await api.get('/notifications/summary');
    return res.data;
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    const res = await api.patch(`/notifications/${notificationId}/read`, { is_read: true });
    return res.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },

  markAsViewed: async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/viewed`);
  },
};
