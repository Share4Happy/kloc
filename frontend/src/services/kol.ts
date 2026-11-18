import { api } from '@/lib/axios';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export interface KOLProfile {
  id: string;
  user_id: string;
  followers: number;
  engagement_rate: number;
  min_price?: number | null;
  max_price?: number | null;
  kol_booking_price?: number | null;
  niche?: string[] | null;
  checklist_items?: string[] | null;
  checklist_confirmed_at?: string | null;
  evidence_attachments?: EvidenceAttachment[] | null;
  social_links: Record<string, string> | null;
  bio: string | null;
  avatar_path?: string | null;
  is_public: boolean;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  user: UserResponse;
}

export interface EvidenceAttachment {
  attachment_id: string;
  file_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

export interface SmartFilterParams {
  niche?: string;
  min_price?: number;
  max_price?: number;
  platform?: string;
}

export interface UpdateProfileRequest {
  followers?: number;
  engagement_rate?: number;
  social_links?: Record<string, string>;
  bio?: string;
  niche?: string[];
  min_price?: number;
  max_price?: number;
  kol_booking_price?: number;
  checklist_items?: string[];
  submit_for_review?: boolean;
}

export interface SocialCheckResult {
  platform: string;
  url: string;
  is_valid: boolean;
  message: string;
  ownership_status: 'verified' | 'likely_owned' | 'unverified' | 'mismatch' | 'not_applicable';
  confidence_score: number;
  detected_handle?: string | null;
  follower_count?: number | null;
  follower_source?: string | null;
  checked_at: string;
}

export const kolApi = {
  updateProfile: async (data: UpdateProfileRequest): Promise<KOLProfile> => {
    const res = await api.put('/kol/profile', data);
    return res.data;
  },

  getOwnProfile: async (): Promise<KOLProfile> => {
    const res = await api.get('/kol/profile');
    return res.data;
  },

  uploadEvidence: async (files: File[]): Promise<EvidenceAttachment[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await api.post('/kol/profile/evidence', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  uploadAvatar: async (file: File): Promise<KOLProfile> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/kol/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  fetchOwnAvatarBlobUrl: async (): Promise<string> => {
    const res = await api.get('/kol/profile/avatar', {
      responseType: 'blob',
    });
    return window.URL.createObjectURL(res.data);
  },

  downloadOwnEvidence: async (attachmentId: string, fileName: string): Promise<void> => {
    const res = await api.get(`/kol/profile/evidence/${attachmentId}`, {
      responseType: 'blob',
    });
    const blobUrl = window.URL.createObjectURL(res.data);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(blobUrl);
  },

  checkOwnLinks: async (data?: { social_links?: Record<string, string>; followers?: number }): Promise<SocialCheckResult[]> => {
    const res = await api.post('/kol/profile/verify-links', data);
    return res.data;
  },

  getProfiles: async (statusFilter?: VerificationStatus): Promise<KOLProfile[]> => {
    const params = statusFilter ? { status_filter: statusFilter } : {};
    const res = await api.get('/kol/profiles', { params });
    return res.data;
  },

  smartFilter: async (params: SmartFilterParams): Promise<KOLProfile[]> => {
    const res = await api.get('/kol/filters', { params });
    return res.data;
  },

  verifyProfile: async (profileId: string, status: VerificationStatus, notes?: string): Promise<KOLProfile> => {
    const res = await api.patch(`/kol/${profileId}/verify`, { status, notes });
    return res.data;
  },

  toggleVisibility: async (profileId: string, is_public: boolean): Promise<KOLProfile> => {
    const res = await api.patch(`/kol/${profileId}/visibility`, { is_public });
    return res.data;
  },

  getProfileDetail: async (profileId: string): Promise<KOLProfile> => {
    const res = await api.get(`/kol/profiles/${profileId}`);
    return res.data;
  },

  downloadProfileEvidence: async (profileId: string, attachmentId: string, fileName: string): Promise<void> => {
    const res = await api.get(`/kol/profiles/${profileId}/evidence/${attachmentId}`, {
      responseType: 'blob',
    });
    const blobUrl = window.URL.createObjectURL(res.data);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(blobUrl);
  },

  checkLinks: async (profileId: string): Promise<SocialCheckResult[]> => {
    const res = await api.post(`/kol/profiles/${profileId}/check-links`);
    return res.data;
  },
};
