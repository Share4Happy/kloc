'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';

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

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Get Token
      const res = await api.post('/auth/login', { email, password });
      const { access_token } = res.data;
      
      // Store token temporarily to fetch 'me'
      // We manually add it to headers for the next request before Zustand persists it
      const tempApi = api.create({
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      // 2. Fetch User Profile
      const meRes = await tempApi.get('/auth/me');
      const user = meRes.data;

      // 3. Save to Zustand
      setAuth(user, access_token);

      // 4. Redirect based on role
      switch (user.role) {
        case 'admin':
          router.push('/portal/admin');
          break;
        case 'manager':
          router.push('/portal/manager');
          break;
        case 'sale':
          router.push('/portal/sale');
          break;
        case 'kol_manager':
          router.push('/portal/kol_manager');
          break;
        case 'kol':
          router.push('/portal/kol');
          break;
        default:
          router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-black text-gray-900 tracking-tight">
            Đăng nhập KLOC
          </h2>
          <p className="mt-3 text-center text-sm text-gray-500">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
              Đăng ký ngay
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-gray-50/50"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-gray-50/50"
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
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-start gap-2">
              <span className="font-bold">!</span> {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Ghi nhớ đăng nhập
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-semibold text-blue-600 hover:text-blue-500">
                Quên mật khẩu?
              </a>
            </div>
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
                  Đang xử lý...
                </div>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
