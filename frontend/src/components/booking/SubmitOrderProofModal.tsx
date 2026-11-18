'use client';

import React, { useState } from 'react';
import { orderApi, Order } from '@/services/order';
import { X, Loader2, Link as LinkIcon, FileText, Paperclip } from 'lucide-react';

interface SubmitOrderProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order | null;
}

export default function SubmitOrderProofModal({ isOpen, onClose, onSuccess, order }: SubmitOrderProofModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proofLink, setProofLink] = useState(order?.proof_link || '');
  const [proofNotes, setProofNotes] = useState(order?.proof_notes || '');
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Sync state when order changes
  React.useEffect(() => {
    if (order) {
      setProofLink(order.proof_link || '');
      setProofNotes(order.proof_notes || '');
      setProofFile(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofLink.trim() && !proofFile) {
      setError('Vui long cung cap it nhat link hoac tep proof.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await orderApi.submitProof(order.id, {
        proof_link: proofLink.trim() || undefined,
        proof_notes: proofNotes || undefined,
        proof_file: proofFile,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || 'Lỗi khi nộp link nghiệm thu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Nộp Kết Quả (Nghiệm thu)</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm flex gap-2 items-start">
               <span className="font-bold">!</span> {error}
            </div>
          )}

          <div className="mb-5 text-sm bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100">
            Vui lòng cung cấp <strong>link hoặc file</strong> báo cáo để Sale/Manager tiến hành kiểm duyệt. Đơn hàng sẽ tự động chuyển sang trạng thái <strong>Chờ nghiệm thu</strong>.
          </div>

          <form id="submit-proof-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link nghiệm thu (Tùy chọn)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 top-3 pointer-events-none text-gray-400">
                  <LinkIcon size={18} />
                </div>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  className="pl-10 appearance-none block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://tiktok.com/... | https://drive.google.com/..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload file proof (Tùy chọn)
              </label>
              <label className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <Paperclip size={16} className="text-gray-400" />
                <span className="text-sm text-gray-700 truncate">
                  {proofFile ? proofFile.name : 'Chon tep (pdf, image, mp4, docx, xlsx) - toi da 20MB'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.docx,.xlsx"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú thêm (Tùy chọn)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 top-3 pointer-events-none text-gray-400">
                  <FileText size={18} />
                </div>
                <textarea
                  rows={3}
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="pl-10 appearance-none block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Có lưu ý gì thêm cho Sale không?"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="submit-proof-form"
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Nộp kết quả
          </button>
        </div>

      </div>
    </div>
  );
}
