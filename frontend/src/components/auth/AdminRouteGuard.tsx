'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Only run on client after hydration
    if (typeof window !== 'undefined') {
        if (!isAuthenticated || !user) {
            router.push('/login');
        } else if (user.role !== 'admin') {
            router.push('/dashboard'); // Or an unauthorized page
        } else {
            setAuthorized(true);
        }
    }
  }, [user, isAuthenticated, router]);

  if (!authorized) {
      return (
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      );
  }

  return <>{children}</>;
}
