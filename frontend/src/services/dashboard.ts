import { api } from '@/lib/axios';

export type DashboardRole = 'admin' | 'manager' | 'sale' | 'kol_manager' | 'kol';
export type DashboardOrderStatus = 'init' | 'deposited' | 'running' | 'pending_review' | 'completed';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface DashboardOrderSummary {
  id: string;
  status: DashboardOrderStatus;
  total_amount: number;
  deposit_amount: number;
  created_at: string;
  sale_id: string;
  sale_name?: string | null;
  kol_id: string;
  kol_name?: string | null;
}

export interface DashboardSummary {
  role: DashboardRole;
  total_orders: number;
  pending_review_orders: number;
  running_orders: number;
  completed_orders: number;
  total_revenue: number;
  total_deposit: number;
  active_kols?: number | null;
  active_sales?: number | null;
  pending_kol_profiles?: number | null;
  total_leads?: number | null;
  current_profile_status?: VerificationStatus | null;
  recent_orders: DashboardOrderSummary[];
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await api.get('/dashboard/summary');
    return res.data;
  },
};