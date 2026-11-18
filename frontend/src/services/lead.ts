import { api } from '@/lib/axios';

export type LeadSource = 'booking_form' | 'contact_form';

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  source: LeadSource;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LeadCreateData {
  full_name: string;
  phone: string;
  email?: string;
  company?: string;
  subject?: string;
  message: string;
  source: LeadSource;
}

export const leadApi = {
  createLead: async (data: LeadCreateData): Promise<Lead> => {
    const res = await api.post('/leads', data);
    return res.data;
  },

  getLeads: async (source?: LeadSource): Promise<Lead[]> => {
    const params = source ? { source } : {};
    const res = await api.get('/leads', { params });
    return res.data;
  },
};
