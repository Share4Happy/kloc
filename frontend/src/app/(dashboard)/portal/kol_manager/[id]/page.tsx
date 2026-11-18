'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { kolApi, KOLProfile, SocialCheckResult } from '@/services/kol';
import {
  ArrowLeft, ShieldCheck, ShieldX, Globe, Eye, EyeOff,
  CheckCircle2, XCircle, Loader2, ExternalLink, Users, TrendingUp, Download,
} from 'lucide-react';

const ONBOARDING_CHECKLIST_LABELS: Record<string, string> = {
  profile_info_confirmed: 'Đã xác nhận thông tin hồ sơ và mức giá booking',
  social_links_owned: 'Đã xác nhận quyền sở hữu social links',
  evidence_uploaded: 'Đã tải lên minh chứng onboarding',
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

export default function KolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [kol, setKol] = useState<KOLProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [linkResults, setLinkResults] = useState<SocialCheckResult[] | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [rejectNotes, setRejectNotes] = useState('');
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    kolApi.getProfileDetail(id)
      .then(setKol)
      .catch(() => router.push('/portal/kol_manager'))
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleVerify = async (status: 'approved' | 'rejected') => {
    if (!kol) return;
    setIsActing(true);
    try {
      const updated = await kolApi.verifyProfile(kol.id, status, status === 'rejected' ? rejectNotes : 'Đã duyệt qua KOL Manager');
      setKol(updated);
      setRejectNotes('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsActing(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!kol) return;
    setIsActing(true);
    try {
      const updated = await kolApi.toggleVisibility(kol.id, !kol.is_public);
      setKol(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsActing(false);
    }
  };

  const handleCheckLinks = async () => {
    if (!kol) return;
    setIsChecking(true);
    setLinkResults(null);
    try {
      const results = await kolApi.checkLinks(kol.id);
      setLinkResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadEvidence = async (attachmentId: string, fileName: string) => {
    if (!kol) return;
    try {
      await kolApi.downloadProfileEvidence(kol.id, attachmentId, fileName);
    } catch (e) {
      console.error(e);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold"><ShieldCheck size={13}/> Đã duyệt</span>;
    if (status === 'rejected') return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold"><ShieldX size={13}/> Từ chối</span>;
    return <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold">⏳ Chờ duyệt</span>;
  };

  return (
    <RoleRouteGuard allowedRoles={['kol_manager', 'admin']}>
      <div className="space-y-6">
        {/* Back */}
        <Link href="/portal/kol_manager" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={16}/> Quay lại danh sách
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={32}/>
          </div>
        ) : !kol ? null : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: Profile Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{kol.user?.full_name}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{kol.user?.email}</p>
                    {kol.user?.phone && <p className="text-sm text-gray-500">{kol.user.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusBadge(kol.verification_status)}
                    {kol.is_public && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        <Globe size={13}/> Đang hiển thị
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Users size={14}/> Followers</div>
                    <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('en-US').format(kol.followers)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><TrendingUp size={14}/> Engagement Rate</div>
                    <p className="text-2xl font-bold text-gray-900">{kol.engagement_rate}%</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Khoảng giá booking</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {kol.min_price || kol.max_price
                        ? `${new Intl.NumberFormat('vi-VN').format(kol.min_price || 0)} - ${new Intl.NumberFormat('vi-VN').format(kol.max_price || 0)} VND`
                        : 'Chưa khai báo'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Niche</p>
                    <p className="text-sm text-gray-700">{kol.niche?.length ? kol.niche.join(', ') : 'Chưa khai báo'}</p>
                  </div>
                </div>

                {kol.bio && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Bio</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{kol.bio}</p>
                  </div>
                )}

                {kol.verification_notes && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs font-medium text-amber-700 mb-0.5">Ghi chú duyệt</p>
                    <p className="text-sm text-amber-800">{kol.verification_notes}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Checklist onboarding</h2>
                {!kol.checklist_items || kol.checklist_items.length === 0 ? (
                  <p className="text-sm text-gray-400">KOL chưa xác nhận checklist nào.</p>
                ) : (
                  <div className="space-y-2">
                    {kol.checklist_items.map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <CheckCircle2 size={16} className="shrink-0" />
                        {ONBOARDING_CHECKLIST_LABELS[item] || item}
                      </div>
                    ))}
                  </div>
                )}
                {kol.checklist_confirmed_at && (
                  <p className="mt-3 text-xs text-gray-500">Xác nhận lần cuối: {new Date(kol.checklist_confirmed_at).toLocaleString('vi-VN')}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Minh chứng onboarding</h2>
                  <span className="text-xs text-gray-500">{kol.evidence_attachments?.length || 0} tep</span>
                </div>
                {!kol.evidence_attachments || kol.evidence_attachments.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có tep minh chứng nào được tải lên.</p>
                ) : (
                  <div className="space-y-2">
                    {kol.evidence_attachments.map((attachment) => (
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

              {/* Social Links */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Social Links</h2>
                  <button
                    onClick={handleCheckLinks}
                    disabled={isChecking || !kol.social_links || Object.keys(kol.social_links).length === 0}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {isChecking ? <Loader2 size={13} className="animate-spin"/> : <ShieldCheck size={13}/>}
                    Kiểm tra tự động
                  </button>
                </div>

                {!kol.social_links || Object.keys(kol.social_links).length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có social links nào.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(kol.social_links).map(([platform, url]) => {
                      const result = linkResults?.find(r => r.platform.toLowerCase() === platform.toLowerCase());
                      return (
                        <div key={platform} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-700 uppercase w-20 shrink-0">{platform}</span>
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1">
                              {url} <ExternalLink size={11}/>
                            </a>
                          </div>
                          {result && (
                            result.is_valid
                              ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium shrink-0"><CheckCircle2 size={14}/> OK</span>
                              : <span className="flex items-center gap-1 text-red-600 text-xs font-medium shrink-0"><XCircle size={14}/> Lỗi</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {linkResults && (
                  <div className="mt-3 space-y-2">
                    {linkResults.map((result) => (
                      <div key={result.platform} className={`rounded-xl border px-4 py-3 text-sm ${result.is_valid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold capitalize text-gray-900">{result.platform}</span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${OWNERSHIP_TONES[result.ownership_status] || OWNERSHIP_TONES.unverified}`}>
                            {OWNERSHIP_LABELS[result.ownership_status] || result.ownership_status}
                          </span>
                          <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                            Tin cậy {result.confidence_score}%
                          </span>
                          {result.follower_count !== null && result.follower_count !== undefined && (
                            <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                              Follower ~ {formatFollowerCount(result.follower_count)}
                            </span>
                          )}
                        </div>
                        {result.detected_handle && (
                          <p className="text-xs text-gray-500 mb-1">Định danh công khai: {result.detected_handle}</p>
                        )}
                        <p className={`text-xs ${result.is_valid ? 'text-emerald-700' : 'text-red-700'}`}>{result.message}</p>
                      </div>
                    ))}
                    {linkResults.every(r => r.is_valid) && (
                      <p className="text-xs text-emerald-600 font-medium">✓ Tất cả tín hiệu kiểm tra đều đang ổn</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Actions */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-3">
                <h2 className="font-bold text-gray-900 mb-4">Hành động</h2>

                {kol.verification_status !== 'approved' && (
                  <button
                    onClick={() => handleVerify('approved')}
                    disabled={isActing}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
                  >
                    {isActing ? <Loader2 size={16} className="animate-spin"/> : <ShieldCheck size={16}/>}
                    Duyệt Profile
                  </button>
                )}

                {kol.verification_status === 'approved' && (
                  <button
                    onClick={handleTogglePublic}
                    disabled={isActing}
                    className={`w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-xl transition disabled:opacity-60 text-sm ${
                      kol.is_public
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isActing ? <Loader2 size={16} className="animate-spin"/> : kol.is_public ? <EyeOff size={16}/> : <Eye size={16}/>}
                    {kol.is_public ? 'Ẩn khỏi Landing Page' : 'Hiện trên Landing Page'}
                  </button>
                )}

                {kol.verification_status !== 'rejected' && (
                  <div className="pt-3 border-t space-y-2">
                    <label className="block text-xs font-medium text-gray-600">Lý do từ chối (nếu reject)</label>
                    <textarea
                      value={rejectNotes}
                      onChange={e => setRejectNotes(e.target.value)}
                      rows={3}
                      placeholder="Nhập lý do..."
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-400"
                    />
                    <button
                      onClick={() => handleVerify('rejected')}
                      disabled={isActing || !rejectNotes.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
                    >
                      {isActing ? <Loader2 size={16} className="animate-spin"/> : <ShieldX size={16}/>}
                      Từ chối Profile
                    </button>
                  </div>
                )}

                {kol.verification_status === 'rejected' && (
                  <button
                    onClick={() => handleVerify('approved')}
                    disabled={isActing}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
                  >
                    {isActing ? <Loader2 size={16} className="animate-spin"/> : <ShieldCheck size={16}/>}
                    Duyệt lại
                  </button>
                )}
              </div>

              <div className="bg-gray-50 rounded-2xl border p-4 text-xs text-gray-500 space-y-1">
                <p><span className="font-medium text-gray-700">Profile ID:</span> {kol.id}</p>
                <p><span className="font-medium text-gray-700">User ID:</span> {kol.user_id}</p>
                <p><span className="font-medium text-gray-700">Tài khoản:</span> {kol.user?.is_active ? '✅ Hoạt động' : '❌ Đã khóa'}</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </RoleRouteGuard>
  );
}
