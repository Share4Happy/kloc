import { api } from '@/lib/axios';

export type PayoutStatus = 'pending' | 'paid' | 'cancelled';

export interface Payout {
  id: string;
  kol_id: string;
  order_id: string | null;
  amount: number;
  status: PayoutStatus;
  note: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  kol_name?: string | null;
  order_campaign?: string | null;
}

export interface PayoutCreate {
  kol_id: string;
  order_id?: string | null;
  amount: number;
  note?: string | null;
}

export interface PayoutStatusUpdate {
  status: PayoutStatus;
  note?: string | null;
}

export const payoutApi = {
  getMyPayouts: async (): Promise<Payout[]> => {
    const res = await api.get<Payout[]>('/payouts/me');
    return res.data;
  },

  getAllPayouts: async (kolId?: string): Promise<Payout[]> => {
    const params = kolId ? { kol_id: kolId } : {};
    const res = await api.get<Payout[]>('/payouts', { params });
    return res.data;
  },

  createPayout: async (data: PayoutCreate): Promise<Payout> => {
    const res = await api.post<Payout>('/payouts', data);
    return res.data;
  },

  updatePayout: async (id: string, data: PayoutStatusUpdate): Promise<Payout> => {
    const res = await api.patch<Payout>(`/payouts/${id}`, data);
    return res.data;
  },
};
