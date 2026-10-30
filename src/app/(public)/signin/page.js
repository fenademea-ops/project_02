'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { safeReturnPath } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Users, Mail, ShieldAlert, ArrowRight, CheckCircle2, Car, Shield } from 'lucide-react';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next');
  const returnUrl = safeReturnPath(rawNext);

  const { users, signInAsDemo, signInWithEmail } = useStore();
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = (userId) => {
    setErrorMsg('');
    const res = signInAsDemo(userId);
    if (res.success) {
      router.push(returnUrl);
    } else {
      setErrorMsg(res.error || 'Failed to sign in');
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = signInWithEmail(emailInput);
    setLoading(false);

    if (res.success) {
      router.push(returnUrl);
    } else {
      setErrorMsg(res.error || 'User not found in demo data');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
          <Shield className="w-3.5 h-3.5" />
          Instant Demo Access
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Sign In to Sheggar Wheels
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Choose a pre-seeded Addis Ababa demo persona below for immediate access, or enter your
          registered mock email.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-start gap-2"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Quick One-Click Demo Personas */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          One-Click Demo Personas
        </h2>

        <div className="grid gap-3">
          {users.map((u) => {
            const isSuspended = u.status === 'suspended';
            const isAdmin = u.roles.includes('admin');
            const isOwner = u.roles.includes('owner');

            return (
              <div
                key={u.id}
                onClick={() => handleDemoLogin(u.id)}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer flex items-center justify-between group shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {u.name}
                    </span>
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm ${
                          r === 'admin'
                            ? 'bg-rose-100 text-rose-800'
                            : r === 'owner'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                    {isSuspended && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-rose-200 text-rose-900">
                        Suspended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{u.bio || u.email}</div>
                </div>

                <Button
                  size="sm"
                  variant={isSuspended ? 'danger' : 'outline'}
                  className="pointer-events-none group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors"
                >
                  {isSuspended ? 'Test Block' : 'Log In As'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-3 text-slate-400 font-semibold">Or with mock email</span>
        </div>
      </div>

      {/* 2. Mock Email Sign-In */}
      <Card className="p-6">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Email
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="e.g. abebe@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              No real password required. Any pre-seeded email from above works.
            </p>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full font-bold" loading={loading}>
            Sign In with Email
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>
      </Card>

      <div className="text-center text-xs text-slate-500">
        Don&apos;t have an account yet?{' '}
        <Link href={`/signup${rawNext ? `?next=${encodeURIComponent(rawNext)}` : ''}`} className="text-emerald-600 hover:underline font-semibold">
          Create demo account
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
