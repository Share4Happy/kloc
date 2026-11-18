'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, User, Phone, Loader2, CheckCircle2 } from 'lucide-react';

type ApiValidationIssue = {
  msg?: string;
  loc?: Array<string | number>;
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const detail = (err as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        const issue = item as ApiValidationIssue;
        const field = Array.isArray(issue.loc)
          ? String(issue.loc[issue.loc.length - 1] ?? '')
          : '';
        return field && issue.msg ? `${field}: ${issue.msg}` : issue.msg;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  return fallback;
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Register (creates user and returns token)
      const res = await api.post('/auth/register', formData);
      const { access_token } = res.data;
      
      // Auto-login flow: Fetch 'me' profiles with new token
      const tempApi = api.create({
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const meRes = await tempApi.get('/auth/me');
      const user = meRes.data;

      // Save to Zustand
      setAuth(user, access_token);
      setSuccess(true);
      
      // Redirect to KOL portal after 2 seconds
      setTimeout(() => {
        router.push('/portal/kol');
      }, 2000);

    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
            <div className="flex justify-center text-green-500">
                <CheckCircle2 size={64} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Đăng ký thành công!</h2>
            <p className="text-gray-500">Đang chuẩn bị không gian làm việc của bạn...</p>
            <Loader2 className="animate-spin mx-auto mt-4 text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-black text-gray-900 tracking-tight">
            Trở thành Đối tác KOL
          </h2>
          <p className="mt-3 text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          <div className="space-y-4">
            
            {/* Tên */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50/50"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50/50"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50/50"
                  placeholder="0912345678"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-10 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Mật khẩu tối thiểu 8 ký tự.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-start gap-2">
              <span className="font-bold">!</span> {error}
            </div>
          )}

          <div className="text-xs text-gray-500 text-center px-4">
              Bằng việc đăng ký, bạn đồng ý với <a className="text-blue-600 underline">Điều khoản dịch vụ</a> và <a className="text-blue-600 underline">Chính sách bảo mật</a> của KLOC.
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Đang khởi tạo...
                </div>
              ) : (
                'Đăng ký tài khoản'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
