'use client';

import { useAuthStore, UserRole } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface RoleRouteGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleRouteGuard({ children, allowedRoles }: RoleRouteGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Only run on client after hydration
    if (typeof window !== 'undefined') {
        if (!isAuthenticated || !user) {
            router.push('/login');
        } else if (!allowedRoles.includes(user.role)) {
            router.push('/dashboard'); // Or an unauthorized page
        } else {
            setAuthorized(true);
        }
    }
  }, [user, isAuthenticated, router, allowedRoles]);

  if (!authorized) {
      return (
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      );
  }

  return <>{children}</>;
}
