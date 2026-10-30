'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { ShieldAlert, AlertOctagon, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function RouteGuard({ children, requiredRole = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isInitialized, currentUser, session, signInAsDemo } = useStore();

  useEffect(() => {
    if (!isInitialized) return;

    // 1. Not signed in check
    if (!session || !currentUser) {
      const redirectUrl = `/signin?next=${encodeURIComponent(pathname || '/')}`;
      router.push(redirectUrl);
    }
  }, [isInitialized, session, currentUser, pathname, router]);

  // Loading state while storage initializes
  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!session || !currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-lg text-center">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-600 mb-6">
            Please sign in to access this portal. You can use any instant one-click demo account.
          </p>
          <Link href={`/signin?next=${encodeURIComponent(pathname || '/')}`}>
            <Button variant="primary" className="w-full">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Suspended user check
  if (currentUser.status === 'suspended') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white p-8 rounded-2xl border border-rose-300 shadow-xl text-center">
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Blocked</h2>
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 mb-4">
            Account Status: Suspended
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Your account ({currentUser.email}) has been temporarily suspended by an administrator
            due to a policy review or unresolved dispute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => signInAsDemo('user-renter-1')}
              size="sm"
            >
              Switch to Active Renter Demo
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm">
                Return to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Required role check
  if (requiredRole && !currentUser.roles.includes(requiredRole)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-lg text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unauthorized Role</h2>
          <p className="text-sm text-slate-600 mb-6">
            This section requires the <strong className="text-slate-800 uppercase">{requiredRole}</strong> role.
            Your current account ({currentUser.name}) only has roles:{' '}
            <span className="font-semibold">{currentUser.roles.join(', ')}</span>.
          </p>
          <div className="flex flex-col gap-2">
            {requiredRole === 'owner' && (
              <Button
                variant="primary"
                onClick={() => signInAsDemo('user-owner-1')}
              >
                Switch to Host (Bethlehem Tadesse)
              </Button>
            )}
            {requiredRole === 'admin' && (
              <Button
                variant="secondary"
                onClick={() => signInAsDemo('user-admin-1')}
              >
                Switch to Super Admin (Sara Mengistu)
              </Button>
            )}
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Go to Renter Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
