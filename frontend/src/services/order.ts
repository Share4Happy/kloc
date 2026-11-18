import { api } from '@/lib/axios';

export type OrderStatus =
  | 'new_request'
  | 'pending_approval'
  | 'pending_sale_info'
  | 'init'
  | 'deposited'
  | 'running'
  | 'pending_review'
  | 'completed'
  | 'cancel_requested'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded';

export interface Order {
  id: string;
  sale_id: string;
  kol_id: string;
  campaign_id?: string | null;
  combo_group_id?: string | null;
  status: OrderStatus;
  total_amount: number;
  deposit_amount: number;
  kol_received_amount?: number | null;
  // Business / campaign info
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_representative?: string | null;
  campaign_name?: string | null;
  platform?: string | null;
  kpi?: string | null;
  booking_type?: 'custom' | 'combo' | null;
  post_count?: number | null;
  package_definition?: Record<string, unknown> | null;
  // KOL assignment request
  kol_request_notes?: string | null;
  // Update history
  update_history?: Array<{
    updated_at: string;
    updated_by: string;
    updated_by_name: string;
    update_note: string;
    changes: Record<string, { label: string; old: any; new: any }>;
  }> | null;
  // Proof of work
  proof_link?: string;
  proof_notes?: string;
  proof_file_name?: string | null;
  proof_file_mime?: string | null;
  proof_file_size?: number | null;
  sale?: OrderParticipant | null;
  kol?: OrderParticipant | null;
  // Cancel / refund audit
  cancel_reason?: string | null;
  cancel_note?: string | null;
  // Contract metadata
  contract_file_path?: string | null;
  contract_file_name?: string | null;
  contract_generated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderParticipant {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export interface OrderCreateData {
  sale_id: string;
  kol_id?: string;
  campaign_id?: string;
  combo_group_id?: string;
  total_amount: number;
  deposit_amount: number;
  customer_name?: string;
  customer_representative?: string;
  campaign_name?: string;
  platform?: string;
  kpi?: string;
  booking_type?: 'custom' | 'combo';
  post_count?: number;
  kol_request_notes?: string;
  package_definition?: Record<string, unknown>;
}

export interface ProofSubmitData {
  proof_link?: string;
  proof_notes?: string;
  proof_file?: File | null;
}

export interface OrderClaimData {
  kol_id?: string;
  total_amount?: number;
  deposit_amount?: number;
  booking_type?: 'custom' | 'combo';
}

export interface OrderInfoUpdateData {
  total_amount: number;
  deposit_amount: number;
  campaign_name?: string;
  platform?: string;
  kpi?: string;
  booking_type?: 'custom' | 'combo';
  post_count?: number;
  customer_name?: string;
  customer_representative?: string;
  kol_request_notes?: string;
}

export interface OrderUpsaleData {
  total_amount: number;
  deposit_amount: number;
  campaign_name?: string;
  platform?: string;
  kpi?: string;
  post_count?: number;
  package_definition?: Record<string, unknown>;
  kol_request_notes?: string;
  update_note?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  kol_id?: string;
  sale_id?: string;
  campaign_id?: string;
  combo_group_id?: string;
}

export const orderApi = {
  getOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    const res = await api.get('/orders', { params: filters });
    return res.data;
  },

  createOrder: async (data: OrderCreateData): Promise<Order> => {
    const res = await api.post('/orders', data);
    return res.data;
  },

  updateStatus: async (orderId: string, status: OrderStatus): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/status`, { status });
    return res.data;
  },

  updatePrice: async (orderId: string, data: { total_amount: number; deposit_amount: number }): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/price`, data);
    return res.data;
  },

  submitProof: async (orderId: string, data: ProofSubmitData): Promise<Order> => {
    const form = new FormData();

    if (data.proof_link) form.append('proof_link', data.proof_link);
    if (data.proof_notes) form.append('proof_notes', data.proof_notes);
    if (data.proof_file) form.append('proof_file', data.proof_file);

    const res = await api.patch(`/orders/${orderId}/proof-upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  downloadProofFile: async (orderId: string, filename?: string): Promise<void> => {
    const res = await api.get(`/orders/${orderId}/proof-file`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `proof-${orderId}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  },

  requestCancel: async (orderId: string, reason: string): Promise<Order> => {
    const res = await api.post(`/orders/${orderId}/request-cancel`, { reason });
    return res.data;
  },

  cancelOrder: async (orderId: string, reason: string): Promise<Order> => {
    const res = await api.post(`/orders/${orderId}/cancel`, { reason });
    return res.data;
  },

  approveCancel: async (orderId: string, note?: string): Promise<Order> => {
    const res = await api.post(`/orders/${orderId}/approve-cancel`, { note });
    return res.data;
  },

  requestRefund: async (orderId: string, reason: string): Promise<Order> => {
    const res = await api.post(`/orders/${orderId}/request-refund`, { reason });
    return res.data;
  },

  approveRefund: async (orderId: string, note?: string): Promise<Order> => {
    const res = await api.post(`/orders/${orderId}/approve-refund`, { note });
    return res.data;
  },

  claimOrder: async (orderId: string, data: OrderClaimData): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/claim`, data);
    return res.data;
  },

  approveClaim: async (orderId: string): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/approve-claim`);
    return res.data;
  },

  rejectClaim: async (orderId: string): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/reject-claim`);
    return res.data;
  },

  assignSale: async (orderId: string, saleId: string): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/assign-sale`, { sale_id: saleId });
    return res.data;
  },

  assignKol: async (orderId: string, kolIds: string[]): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/assign-kol`, { kol_ids: kolIds });
    return res.data;
  },

  updateOrderInfo: async (orderId: string, data: OrderInfoUpdateData): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/update-info`, data);
    return res.data;
  },

  upsaleOrder: async (orderId: string, data: OrderUpsaleData): Promise<Order> => {
    const res = await api.patch(`/orders/${orderId}/upsale`, data);
    return res.data;
  },

  exportProofReport: async (params?: {
    export_type?: 'overview' | 'proof-review';
    campaign_id?: string;
    combo_group_id?: string;
  }): Promise<void> => {
    const res = await api.get('/orders/export-proof-report', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const disposition = res.headers['content-disposition'];
    let filename = 'bao-cao-nghiem-thu.xlsx';
    if (disposition) {
      const match = disposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }

    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  getExportableOrders: async (statusFilter: 'pending_review' | 'completed'): Promise<Array<{
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
  }>> => {
    const res = await api.get('/orders/export-proof-report/orders', {
      params: { status_filter: statusFilter },
    });
    return res.data;
  },

  exportSelectedProofReport: async (data: {
    order_ids: string[];
    report_type: 'pending_review' | 'completed';
  }): Promise<void> => {
    const res = await api.post('/orders/export-proof-report', data, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const disposition = res.headers['content-disposition'];
    let filename = 'nghiem-thu.xlsx';
    if (disposition) {
      const match = disposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }

    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};
