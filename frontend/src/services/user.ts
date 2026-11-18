import { api } from '@/lib/axios';

export interface UserSale {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

export const userApi = {
  getSales: async (): Promise<UserSale[]> => {
    const res = await api.get('/users/sales');
    return res.data;
  },
};
