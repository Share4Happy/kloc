'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { useAuthStore } from '@/store/authStore';
import { Ban, CheckCircle2, Download, FileText, Link2, Loader2, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { EvidenceAttachment, kolApi, SocialCheckResult } from '@/services/kol';
import { orderApi, Order, OrderStatus } from '@/services/order';
import { payoutApi, Payout } from '@/services/payout';
import { downloadContractFile, triggerBlobDownload } from '@/services/contract';
import { formatCurrency } from '@/lib/currency';
import CancelRefundModal, { type CancelRefundMode } from '@/components/booking/CancelRefundModal';
import SubmitOrderProofModal from '@/components/booking/SubmitOrderProofModal';

const ONBOARDING_CHECKLIST_OPTIONS = [
    {
        value: 'profile_info_confirmed',
        label: 'Tôi đã điền đầy đủ thông tin hồ sơ và mức giá booking.',
    },
    {
        value: 'social_links_owned',
        label: 'Các social links khai báo thuộc quyền sở hữu và đang hoạt động.',
    },
    {
        value: 'evidence_uploaded',
        label: 'Tôi đã tải lên ít nhất một tài liệu hoặc ảnh minh chứng.',
    },
] as const;

const emptyProfileData = {
    niche: '',
    min_price: '',
    max_price: '',
    kol_booking_price: '',
    youtube_url: '',
    tiktok_url: '',
    followers: '',
    engagement_rate: '',
    bio: '',
    verification_status: 'pending',
    verification_notes: '',
};

const OWNERSHIP_LABELS: Record<string, string> = {
    verified: 'Ownership rõ ràng',
    likely_owned: 'Khả năng sở hữu cao',
    unverified: 'Chưa đủ tín hiệu',
    mismatch: 'Sai lệch định danh',
    not_applicable: 'Không áp dụng',
};

const OWNERSHIP_TONES: Record<string, string> = {
    verified: 'bg-emerald-100 text-emerald-700',
    likely_owned: 'bg-blue-100 text-blue-700',
    unverified: 'bg-amber-100 text-amber-700',
    mismatch: 'bg-red-100 text-red-700',
    not_applicable: 'bg-gray-100 text-gray-700',
};

const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatFollowerCount = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

const orderStatusLabels: Record<OrderStatus, string> = {
    new_request: 'Yêu cầu mới',
    pending_approval: 'Chờ duyệt',
    pending_sale_info: 'Chờ cập nhật',
    init: 'Khởi tạo',
    deposited: 'Đã cọc',
    running: 'Đang chạy',
    pending_review: 'Chờ nghiệm thu',
    completed: 'Hoàn thành',
    cancel_requested: 'Yêu cầu hủy',
    cancelled: 'Đã hủy',
    refund_requested: 'Yêu cầu hoàn tiền',
    refunded: 'Đã hoàn tiền',
};

export default function KolPortalPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'jobs' | 'payouts'>('profile');

  // --- PROFILE TAB STATE ---
    const [profileData, setProfileData] = useState(emptyProfileData);
    const [checklistItems, setChecklistItems] = useState<string[]>([]);
    const [evidenceAttachments, setEvidenceAttachments] = useState<EvidenceAttachment[]>([]);
        const [ownAvatarUrl, setOwnAvatarUrl] = useState<string | null>(null);
        const avatarObjectUrlRef = useRef<string | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
        const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [linkResults, setLinkResults] = useState<SocialCheckResult[] | null>(null);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  // --- JOBS TAB STATE ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<Order | null>(null);
    const [selectedOrderForCancelRefund, setSelectedOrderForCancelRefund] = useState<Order | null>(null);
    const [cancelRefundMode] = useState<CancelRefundMode>('request_cancel');
  const [contractLoading, setContractLoading] = useState<string | null>(null);

  const visibleOrders = orders.filter((o) => !['init', 'deposited'].includes(o.status));
  const jobsCount = visibleOrders.length;

  // --- PAYOUTS TAB STATE ---
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);

  const extractErrorMessage = (error: unknown, fallback: string): string => {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { msg?: string; loc?: string[] }) =>
        d.loc ? `${d.loc.slice(1).join('.')}: ${d.msg}` : (d.msg ?? String(d))
      ).join('; ');
    }
    return fallback;
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  // Computed: format kol_booking_price with thousand separators
  const kolBookingPriceDisplay = profileData.kol_booking_price
    ? formatCurrency(profileData.kol_booking_price)
    : '';

  const parseOptionalNumber = (value: string): number | undefined => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const normalized = trimmed.replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseOptionalInt = (value: string): number | undefined => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const digitsOnly = trimmed.replace(/[^0-9-]/g, '');
      if (!digitsOnly || digitsOnly === '-') return undefined;
      const parsed = Number.parseInt(digitsOnly, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
  };

  const replaceOwnAvatarUrl = useCallback((nextUrl: string | null) => {
      if (avatarObjectUrlRef.current) {
          window.URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
      avatarObjectUrlRef.current = nextUrl;
      setOwnAvatarUrl(nextUrl);
  }, []);

  const loadOwnAvatar = useCallback(async () => {
      try {
          const blobUrl = await kolApi.fetchOwnAvatarBlobUrl();
          replaceOwnAvatarUrl(blobUrl);
      } catch {
          replaceOwnAvatarUrl(null);
      }
  }, [replaceOwnAvatarUrl]);

  const avatarFallback = (user?.full_name || user?.email || 'K').trim().charAt(0).toUpperCase();

  useEffect(() => {
      let isMounted = true;

      const loadProfile = async () => {
          try {
              const profile = await kolApi.getOwnProfile();
              if (!isMounted) return;

              setProfileData({
                  niche: profile.niche?.join(', ') || '',
                  min_price: profile.min_price?.toString() || '',
                  max_price: profile.max_price?.toString() || '',
                  kol_booking_price: profile.kol_booking_price?.toString() || '',
                  youtube_url: profile.social_links?.youtube || '',
                  tiktok_url: profile.social_links?.tiktok || '',
                  followers: profile.followers?.toString() || '',
                  engagement_rate: profile.engagement_rate?.toString() || '',
                  bio: profile.bio || '',
                  verification_status: profile.verification_status || 'pending',
                  verification_notes: profile.verification_notes || '',
              });
              setChecklistItems(profile.checklist_items || []);
              setEvidenceAttachments(profile.evidence_attachments || []);
              if (profile.avatar_path) {
                  await loadOwnAvatar();
              } else {
                  replaceOwnAvatarUrl(null);
              }
          } catch (error) {
              const statusCode = (error as { response?: { status?: number } }).response?.status;
              if (statusCode !== 404) {
                  console.error(error);
                  if (isMounted) {
                      setProfileMessage({ type: 'error', text: 'Không thể tải hồ sơ KOL hiện tại.' });
                  }
              }
          } finally {
              if (isMounted) {
                  setIsLoadingProfile(false);
              }
          }
      };

      void loadProfile();

      return () => {
          isMounted = false;
      };
  }, [loadOwnAvatar, replaceOwnAvatarUrl]);

  useEffect(() => {
      return () => {
          if (avatarObjectUrlRef.current) {
              window.URL.revokeObjectURL(avatarObjectUrlRef.current);
          }
      };
  }, []);

  const fetchOrders = async () => {
      try {
          setIsLoadingOrders(true);
          setOrdersError(null);
          const data = await orderApi.getOrders();
          setOrders(data);
      } catch (error) {
          console.error(error);
          setOrdersError('Không thể tải danh sách công việc KOL.');
      } finally {
          setIsLoadingOrders(false);
      }
  };

  const fetchPayouts = async () => {
      try {
          setIsLoadingPayouts(true);
          setPayoutsError(null);
          const data = await payoutApi.getMyPayouts();
          setPayouts(data);
      } catch (error) {
          console.error(error);
          setPayoutsError('Không thể tải lịch sử thanh toán.');
      } finally {
          setIsLoadingPayouts(false);
      }
  };

  useEffect(() => {
      void fetchOrders();
  }, []);

  useEffect(() => {
      void fetchPayouts();
  }, []);

  const handleChecklistToggle = (item: string) => {
      setChecklistItems((prev) => (
          prev.includes(item)
              ? prev.filter((value) => value !== item)
              : [...prev, item]
      ));
  };

  const handleSaveProfile = async (submitForReview: boolean) => {
      setIsSavingProfile(true);
      setProfileMessage(null);
      setLinkResults(null);
      try {
          const social_links: Record<string, string> = {};
          if (profileData.youtube_url) social_links['youtube'] = profileData.youtube_url;
          if (profileData.tiktok_url) social_links['tiktok'] = profileData.tiktok_url;

          const updatedProfile = await kolApi.updateProfile({
              followers: parseOptionalInt(profileData.followers),
              engagement_rate: parseOptionalNumber(profileData.engagement_rate),
              bio: profileData.bio || undefined,
              social_links: Object.keys(social_links).length > 0 ? social_links : undefined,
              niche: profileData.niche ? profileData.niche.split(',').map(s => s.trim()).filter(Boolean) : undefined,
              min_price: parseOptionalInt(profileData.min_price),
              max_price: parseOptionalInt(profileData.max_price),
              kol_booking_price: parseOptionalInt(profileData.kol_booking_price),
              checklist_items: checklistItems,
              submit_for_review: submitForReview,
          });

          setChecklistItems(updatedProfile.checklist_items || []);
          setEvidenceAttachments(updatedProfile.evidence_attachments || []);
          // Reload profile từ server để đảm bảo UI đồng bộ trạng thái mới
          const freshProfile = await kolApi.getOwnProfile();
          setProfileData({
              niche: freshProfile.niche?.join(', ') || '',
              min_price: freshProfile.min_price?.toString() || '',
              max_price: freshProfile.max_price?.toString() || '',
              kol_booking_price: freshProfile.kol_booking_price?.toString() || '',
              youtube_url: freshProfile.social_links?.youtube || '',
              tiktok_url: freshProfile.social_links?.tiktok || '',
              followers: freshProfile.followers?.toString() || '',
              engagement_rate: freshProfile.engagement_rate?.toString() || '',
              bio: freshProfile.bio || '',
              verification_status: freshProfile.verification_status || 'pending',
              verification_notes: freshProfile.verification_notes || '',
          });
          setProfileMessage({
              type: 'success',
              text: submitForReview
                  ? 'Hồ sơ đã được gửi sang trạng thái chờ duyệt.'
                  : 'Đã lưu nháp hồ sơ onboarding.',
          });
      } catch (error) {
           console.error(error);
           setProfileMessage({ type: 'error', text: extractErrorMessage(error, 'Không thể lưu hồ sơ onboarding.') });
      } finally {
          setIsSavingProfile(false);
      }
  };

  const handleUploadEvidence = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      if (selectedFiles.length === 0) return;

      setIsUploadingEvidence(true);
      setProfileMessage(null);
      try {
          const attachments = await kolApi.uploadEvidence(selectedFiles);
          setEvidenceAttachments(attachments);
          setChecklistItems((prev) => (
              prev.includes('evidence_uploaded') ? prev : [...prev, 'evidence_uploaded']
          ));
          setProfileMessage({ type: 'success', text: 'Đã tải lên minh chứng thành công.' });
      } catch (error) {
          console.error(error);
          setProfileMessage({ type: 'error', text: extractErrorMessage(error, 'Không thể tải lên minh chứng.') });
      } finally {
          event.target.value = '';
          setIsUploadingEvidence(false);
      }
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      setIsUploadingAvatar(true);
      setProfileMessage(null);
      try {
          await kolApi.uploadAvatar(selectedFile);
          await loadOwnAvatar();
          setProfileMessage({ type: 'success', text: 'Đã cập nhật ảnh đại diện.' });
      } catch (error) {
          console.error(error);
          setProfileMessage({ type: 'error', text: extractErrorMessage(error, 'Không thể tải lên ảnh đại diện.') });
      } finally {
          event.target.value = '';
          setIsUploadingAvatar(false);
      }
  };

  const handleDownloadEvidence = async (attachmentId: string, fileName: string) => {
      try {
          await kolApi.downloadOwnEvidence(attachmentId, fileName);
      } catch (error) {
          console.error(error);
          setProfileMessage({ type: 'error', text: 'Không thể tải tep minh chứng.' });
      }
  };

  const handleCheckLinks = async () => {
      setIsCheckingLinks(true);
      setLinkResults(null);
      try {
          const currentLinks: Record<string, string> = {};
          if (profileData.tiktok_url?.trim()) currentLinks.tiktok = profileData.tiktok_url.trim();
          if (profileData.youtube_url?.trim()) currentLinks.youtube = profileData.youtube_url.trim();

          const parsedFollowers = parseOptionalInt(profileData.followers);

          const results = await kolApi.checkOwnLinks({
              social_links: currentLinks,
              followers: parsedFollowers
          });
          setLinkResults(results);
      } catch (error) {
          console.error(error);
      } finally {
          setIsCheckingLinks(false);
      }
  };

  const handleDownloadProofFile = async (order: Order) => {
      try {
          await orderApi.downloadProofFile(order.id, order.proof_file_name || undefined);
      } catch (error) {
          console.error(error);
          setProfileMessage({ type: 'error', text: 'Không thể tải file proof.' });
      }
  };

  const handleDownloadContract = async (order: Order) => {
    setContractLoading(order.id);
    try {
      const blob = await downloadContractFile(order.id);
      triggerBlobDownload(blob, order.contract_file_name || `hop-dong-order-${order.id}.docx`);
    } catch {
      setProfileMessage({ type: 'error', text: 'Không tìm thấy hợp đồng cho đơn hàng này.' });
    } finally {
      setContractLoading(null);
    }
  };

    const openCancelRefund = (order: Order) => {
        setSelectedOrderForCancelRefund(order);
    };

  return (
    <RoleRouteGuard allowedRoles={['kol', 'admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KOL Dashboard</h1>
          <p className="text-gray-500">Xin chào {user?.full_name}, quản lý công việc và báo cáo nghiệm thu tại đây.</p>
        </div>

        {/* Custom Tab Navigation */}
        <div className="flex gap-4 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`py-3 px-4 font-medium text-sm transition border-b-2 ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Cập nhật Profile
            </button>
            <button 
                onClick={() => setActiveTab('jobs')}
                className={`py-3 px-4 font-medium text-sm transition border-b-2 flex items-center gap-2 ${activeTab === 'jobs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Chiến dịch của tôi (My Jobs)
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{jobsCount} Việc</span>
            </button>
            <button
                onClick={() => setActiveTab('payouts')}
                className={`py-3 px-4 font-medium text-sm transition border-b-2 ${activeTab === 'payouts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Thanh Toán
            </button>
        </div>

        {/* TAB 1: PROFILE / ONBOARDING */}
        {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-2xl">
                <div className="mb-6 pb-6 border-b">
                    <h3 className="text-lg font-bold text-gray-900">
                        {profileData.verification_status === 'pending' && checklistItems.length === 0 
                            ? 'Xác thực Tài khoản' 
                            : 'Chỉnh sửa Hồ sơ'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {profileData.verification_status === 'pending' && checklistItems.length === 0 
                            ? 'Hoàn thành biểu mẫu dưới đây để được Quản lý cấp Tích xanh và hiển thị trên cửa hàng.'
                            : 'Cập nhật lại thông tin hồ sơ KOL của bạn.'}
                    </p>
                </div>

                {profileData.verification_status === 'approved' && (
                    <div className="mb-6 p-4 rounded-xl flex gap-3 text-sm bg-emerald-50 border border-emerald-100 text-emerald-700">
                        <CheckCircle2 size={20} className="shrink-0"/>
                        <div>
                            <p className="font-bold">Hồ sơ đã được duyệt!</p>
                            <p>Tài khoản của bạn hiện đã được cấp Tích xanh và hiển thị ưu tiên.</p>
                        </div>
                    </div>
                )}
                {profileData.verification_status === 'rejected' && (
                    <div className="mb-6 p-4 rounded-xl flex gap-3 text-sm bg-red-50 border border-red-100 text-red-700">
                        <Ban size={20} className="shrink-0"/>
                        <div>
                            <p className="font-bold">Hồ sơ bị từ chối duyệt!</p>
                            <p>Lý do: {profileData.verification_notes || 'Không rõ lý do'}. Bạn hãy sửa lại thông tin và gửi duyệt lại nhé.</p>
                        </div>
                    </div>
                )}
                {profileData.verification_status === 'pending' && checklistItems.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl flex gap-3 text-sm bg-blue-50 border border-blue-100 text-blue-700">
                        <ShieldCheck size={20} className="shrink-0"/>
                        <div>
                            <p className="font-bold">Hồ sơ đang chờ duyệt</p>
                            <p>Quản lý hệ thống đang xem xét cấp Tích xanh cho bạn.</p>
                        </div>
                    </div>
                )}

                {profileMessage && (
                    <div className={`mb-6 p-4 rounded-xl flex gap-3 text-sm ${profileMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                        {profileMessage.type === 'success' ? <CheckCircle2 size={20} className="shrink-0"/> : <XCircle size={20} className="shrink-0"/>}
                        {profileMessage.text}
                    </div>
                )}

                {isLoadingProfile ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-blue-600" size={28} />
                    </div>
                ) : (
                <form onSubmit={(e) => {
                    e.preventDefault();
                    void handleSaveProfile(true);
                }} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <p className="mb-3 text-sm font-medium text-gray-700">Ảnh đại diện hiển thị trên landing page</p>
                            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-white">
                                    {ownAvatarUrl ? (
                                        <Image
                                            src={ownAvatarUrl}
                                            alt="KOL avatar"
                                            fill
                                            sizes="80px"
                                            unoptimized
                                            className="object-cover"
                                            onError={() => {
                                                replaceOwnAvatarUrl(null);
                                            }}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-2xl font-semibold text-gray-500">
                                            {avatarFallback}
                                        </div>
                                    )}
                                </div>

                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    <Upload size={16} />
                                    {isUploadingAvatar ? 'Đang tải ảnh...' : 'Tải ảnh đại diện'}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        disabled={isUploadingAvatar}
                                        onChange={(e) => void handleUploadAvatar(e)}
                                    />
                                </label>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Hỗ trợ PNG/JPG/WEBP, tối đa 5MB.</p>
                        </div>

                        <div className="col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực / Thế mạnh (Niche)</label>
                           <p className="text-xs text-gray-500 mb-2">Bạn có thể nhập nhiều lĩnh vực, cách nhau bằng dấu phẩy (VD: làm đẹp, ẩm thực, du lịch).</p>
                           <input 
                               type="text" 
                               value={profileData.niche}
                               onChange={e => setProfileData({...profileData, niche: e.target.value})}
                               placeholder="VD: beauty, gaming, review..."
                               className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 border"
                           />
                        </div>
                        <div className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                           <label className="block text-sm font-semibold text-emerald-800 mb-1">
                             💰 Giá Booking của bạn (VNĐ)
                           </label>
                           <p className="text-xs text-emerald-600 mb-2">
                             Đây là số tiền bạn thực nhận cho mỗi đơn hàng. Không thể thay đổi sau khi đã có đơn.
                           </p>
                           <input
                               type="text"
                               value={kolBookingPriceDisplay}
                               onChange={e => {
                                   const raw = e.target.value.replace(/\D/g, '');
                                   setProfileData({...profileData, kol_booking_price: raw});
                               }}
                               onFocus={(e) => e.target.select()}
                               placeholder="VD: 5.000.000"
                               className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm focus:border-emerald-600 focus:ring-emerald-600"
                           />
                        </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Followers</label>
                                    <input 
                                         type="number" 
                                         value={profileData.followers}
                                         onChange={e => setProfileData({...profileData, followers: e.target.value})}
                                         placeholder="Tổng số followers"
                                         className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Rate (%)</label>
                                    <input 
                                         type="number"
                                         step="0.01"
                                         value={profileData.engagement_rate}
                                         onChange={e => setProfileData({...profileData, engagement_rate: e.target.value})}
                                         placeholder="VD: 4.5"
                                         className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 border"
                                    />
                                </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Link YouTube channel</label>
                           <div className="relative">
                               <Link2 size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                               <input 
                                   type="url" 
                                   value={profileData.youtube_url}
                                   onChange={e => setProfileData({...profileData, youtube_url: e.target.value})}
                                   placeholder="https://youtube.com/..."
                                   className="w-full rounded-xl border-gray-200 pl-9 pr-4 py-3 text-sm focus:border-blue-600 border"
                               />
                           </div>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Link TikTok profile</label>
                           <div className="relative">
                               <Link2 size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                               <input 
                                   type="url" 
                                   value={profileData.tiktok_url}
                                   onChange={e => setProfileData({...profileData, tiktok_url: e.target.value})}
                                   placeholder="https://tiktok.com/..."
                                   className="w-full rounded-xl border-gray-200 pl-9 pr-4 py-3 text-sm focus:border-blue-600 border"
                               />
                           </div>
                        </div>
                        <div className="col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                           <textarea
                               rows={4}
                               value={profileData.bio}
                               onChange={e => setProfileData({...profileData, bio: e.target.value})}
                               placeholder="Mô tả ngắn về thế mạnh, tệp khán giả và phong cách nội dung của bạn"
                               className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:ring-blue-600 border"
                           />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900">Checklist gửi duyệt</h4>
                            <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ chỉ cho phép gửi duyệt khi toàn bộ mục dưới đây đã được xác nhận và có ít nhất 1 minh chứng.</p>
                        </div>
                        <div className="space-y-2">
                            {ONBOARDING_CHECKLIST_OPTIONS.map((item) => (
                                <label key={item.value} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 border border-gray-200 text-sm text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={checklistItems.includes(item.value)}
                                        onChange={() => handleChecklistToggle(item.value)}
                                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900">Minh chứng onboarding</h4>
                                <p className="text-xs text-gray-500 mt-1">Chấp nhận PDF, JPG, PNG, WEBP, DOCX. Tối đa 10MB mỗi tệp.</p>
                            </div>
                            <label className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition cursor-pointer">
                                {isUploadingEvidence ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                Tải minh chứng
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
                                    onChange={handleUploadEvidence}
                                    className="hidden"
                                    disabled={isUploadingEvidence}
                                />
                            </label>
                        </div>

                        {evidenceAttachments.length === 0 ? (
                            <p className="text-sm text-gray-500">Chưa có tep minh chứng nào được tải lên.</p>
                        ) : (
                            <div className="space-y-2">
                                {evidenceAttachments.map((attachment) => (
                                    <div key={attachment.attachment_id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(attachment.size)} • {new Date(attachment.uploaded_at).toLocaleString('vi-VN')}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleDownloadEvidence(attachment.attachment_id, attachment.file_name)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            <Download size={14} />
                                            Tải xuống
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => void handleSaveProfile(false)}
                            disabled={isSavingProfile}
                            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-70"
                        >
                            Lưu nháp
                        </button>
                        <button 
                            type="submit"
                            disabled={isSavingProfile}
                            className="flex-1 rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 transition disabled:opacity-70 flex justify-center"
                        >
                            {isSavingProfile ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Gửi duyệt hồ sơ'}
                        </button>
                    </div>
                </form>
                )}

                {/* Check links section */}
                <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-800">Kiểm tra Social Links</h4>
                            <p className="text-xs text-gray-400 mt-0.5">Chạy sau khi đã lưu profile để xác nhận links hợp lệ</p>
                        </div>
                        <button
                            onClick={handleCheckLinks}
                            disabled={isCheckingLinks}
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition disabled:opacity-60"
                        >
                            {isCheckingLinks ? <Loader2 size={13} className="animate-spin"/> : <ShieldCheck size={13}/>}
                            Kiểm tra ngay
                        </button>
                    </div>
                    {linkResults && (
                        <div className="space-y-2">
                            {linkResults.length === 0 && (
                                <p className="text-xs text-gray-400">Chưa có social links để kiểm tra.</p>
                            )}
                            {linkResults.map(r => (
                                <div key={r.platform} className={`p-3 rounded-xl text-sm ${r.is_valid ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                                    <div className="flex items-start gap-2">
                                    {r.is_valid ? <CheckCircle2 size={15} className="shrink-0 mt-0.5"/> : <XCircle size={15} className="shrink-0 mt-0.5"/>}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-semibold capitalize">{r.platform}</span>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${OWNERSHIP_TONES[r.ownership_status] || OWNERSHIP_TONES.unverified}`}>
                                                {OWNERSHIP_LABELS[r.ownership_status] || r.ownership_status}
                                            </span>
                                            <span className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                                Tin cậy {r.confidence_score}%
                                            </span>
                                            {r.follower_count !== null && r.follower_count !== undefined && (
                                                <span className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                                    Follower ~ {formatFollowerCount(r.follower_count)}
                                                </span>
                                            )}
                                        </div>
                                        {r.detected_handle && (
                                            <p className="text-xs opacity-80 mb-1">Định danh công khai: {r.detected_handle}</p>
                                        )}
                                        <p>{r.message}</p>
                                    </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB 2: MY JOBS / PROOF MANAGEMENT */}
        {activeTab === 'jobs' && (
            <div className="space-y-4">
                {isLoadingOrders ? (
                    <div className="flex items-center justify-center py-16 bg-white rounded-2xl border">
                        <Loader2 className="animate-spin text-blue-600" size={28} />
                    </div>
                ) : ordersError ? (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{ordersError}</div>
                ) : visibleOrders.length === 0 ? (
                    <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">Chưa có chiến dịch nào được khởi chạy cho bạn.</div>
                ) : visibleOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <div className="p-5 flex flex-col md:flex-row justify-between md:items-center border-b bg-gray-50 flex-wrap gap-4">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900">Đơn Booking <span className="text-gray-400 font-normal text-sm ml-2">#{order.id}</span></h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    Ngày tạo: {new Date(order.created_at).toLocaleDateString('vi-VN')}
                                </p>
                            </div>
                            <div className="flex flex-col md:items-end gap-1">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold w-fit ${
                                        order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                        order.status === 'pending_review' ? 'bg-orange-100 text-orange-700' :
                                        order.status === 'running' ? 'bg-blue-100 text-blue-700' :
                                        order.status === 'deposited' ? 'bg-indigo-100 text-indigo-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                    {orderStatusLabels[order.status]}
                                </span>
                                {order.kol_received_amount != null ? (
                                    <span className="text-sm font-bold text-emerald-700">
                                        💰 Giá trị nhận được: {formatMoney(order.kol_received_amount)}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">Chưa cập nhật giá trị nhận</span>
                                )}
                            </div>
                        </div>

                        <div className="p-5 space-y-3">
                            {order.proof_link && (
                                <div className="bg-gray-50 p-3 rounded-xl border border-dashed flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>
                                        <span className="shrink-0">Đã nộp link:</span>
                                        <a href={order.proof_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline line-clamp-1">{order.proof_link}</a>
                                    </div>
                                </div>
                            )}

                            {order.proof_file_name && (
                                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 gap-3 flex-wrap">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Tệp proof đã nộp</p>
                                        <p className="text-xs text-gray-500">{order.proof_file_name}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDownloadProofFile(order)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <Download size={14} />
                                        Tải tệp
                                    </button>
                                </div>
                            )}

                            {!order.proof_link && !order.proof_file_name && (
                                <div className="text-sm text-gray-500 italic">Chưa có minh chứng nào được nộp cho đơn này.</div>
                            )}

                            {order.status === 'running' && (
                                <div className="flex justify-end gap-3 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => openCancelRefund(order)}
                                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-4 py-2 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <Ban size={16}/> Yêu cầu hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOrderForProof(order)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <Upload size={16}/> Nộp kết quả
                                    </button>
                                </div>
                            )}

                            {order.contract_file_path && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  disabled={contractLoading === order.id}
                                  onClick={() => void handleDownloadContract(order)}
                                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                                >
                                  {contractLoading === order.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <FileText size={14} />
                                  )}
                                  Tải hợp đồng
                                </button>
                              </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

      <SubmitOrderProofModal
        isOpen={!!selectedOrderForProof}
        onClose={() => setSelectedOrderForProof(null)}
        onSuccess={fetchOrders}
        order={selectedOrderForProof}
      />

            <CancelRefundModal
                isOpen={!!selectedOrderForCancelRefund}
                onClose={() => setSelectedOrderForCancelRefund(null)}
                onSuccess={fetchOrders}
                order={selectedOrderForCancelRefund}
                mode={cancelRefundMode}
            />

      {/* TAB 3: PAYMENT LEDGER */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          {isLoadingPayouts ? (
            <div className="flex items-center justify-center py-16 bg-white rounded-2xl border">
              <Loader2 className="animate-spin text-blue-600" size={28} />
            </div>
          ) : payoutsError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{payoutsError}</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tổng giá trị booking</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatMoney(orders.reduce((s, o) => s + o.total_amount, 0))}
                  </p>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Đã thanh toán</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {formatMoney(payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0))}
                  </p>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Đang chờ thanh toán</p>
                  <p className="mt-2 text-2xl font-bold text-orange-500">
                    {formatMoney(payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0))}
                  </p>
                </div>
              </div>

              {/* Payout history table */}
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                  <h3 className="text-base font-semibold text-gray-900">Lịch sử thanh toán</h3>
                </div>
                {payouts.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-400">Chưa có bản ghi thanh toán nào.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500">
                          <th className="p-4">Ngày tạo</th>
                          <th className="p-4">Chiến dịch / Order</th>
                          <th className="p-4">Số tiền</th>
                          <th className="p-4">Trạng thái</th>
                          <th className="p-4">Ngày thanh toán</th>
                          <th className="p-4">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payouts.map((payout) => (
                          <tr key={payout.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="p-4 text-gray-600">
                              {new Date(payout.created_at).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="p-4">
                              {payout.order_campaign ? (
                                <span className="font-medium text-gray-900">{payout.order_campaign}</span>
                              ) : payout.order_id ? (
                                <span className="font-mono text-xs text-gray-500">{payout.order_id.slice(0, 8)}…</span>
                              ) : (
                                <span className="text-gray-400 italic">Thanh toán chung</span>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-gray-900">{formatMoney(payout.amount)}</td>
                            <td className="p-4">
                              {payout.status === 'paid' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 size={12} /> Đã thanh toán
                                </span>
                              )}
                              {payout.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                                  Đang chờ
                                </span>
                              )}
                              {payout.status === 'cancelled' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  Đã hủy
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-gray-500">
                              {payout.paid_at
                                ? new Date(payout.paid_at).toLocaleDateString('vi-VN')
                                : '—'}
                            </td>
                            <td className="p-4 text-gray-500 max-w-xs truncate">{payout.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      </div>
    </RoleRouteGuard>
  );
}
