import { api } from '@/lib/axios';
import type { Order } from '@/services/order';

export type CampaignStatus = 'planning' | 'running' | 'completed' | 'cancelled';

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  budget: number;
  owner_sale_id: string;
  combo_group_id: string;
  total_orders: number;
  total_revenue: number;
  total_deposit: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignDetail extends CampaignSummary {
  orders: Order[];
}

export interface CampaignCreateData {
  name: string;
  budget: number;
  owner_sale_id?: string;
  status?: CampaignStatus;
  atomic?: boolean;
  kol_ids: string[];
  total_amount: number;
  deposit_amount: number;
  customer_name?: string;
  customer_representative?: string;
  campaign_name?: string;
  platform?: string;
  kpi?: string;
  booking_type?: 'custom' | 'combo';
  post_count?: number;
  package_definition?: Record<string, unknown>;
}

export interface CampaignCreateFailure {
  kol_id: string;
  message: string;
}

export interface CampaignCreateResult {
  campaign: CampaignDetail;
  created_orders: Order[];
  failures: CampaignCreateFailure[];
}

export const campaignApi = {
  getCampaigns: async (): Promise<CampaignSummary[]> => {
    const res = await api.get('/campaigns');
    return res.data;
  },

  getCampaignDetail: async (campaignId: string): Promise<CampaignDetail> => {
    const res = await api.get(`/campaigns/${campaignId}`);
    return res.data;
  },

  createCampaign: async (data: CampaignCreateData): Promise<CampaignCreateResult> => {
    const res = await api.post('/campaigns', data);
    return res.data;
  },

  exportCampaignCsv: async (campaignId: string): Promise<void> => {
    const res = await api.get(`/campaigns/${campaignId}/export.csv`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `campaign-${campaignId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};
