'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { safeReturnPath } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Shield, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next');
  const returnUrl = safeReturnPath(rawNext);

  const { register } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [alsoOwner, setAlsoOwner] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = register({
      name,
      email,
      phone,
      bio,
      alsoOwner,
    });

    setLoading(false);

    if (res.success) {
      router.push(returnUrl);
    } else {
      setErrorMsg(res.error || 'Failed to create account');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
          <UserPlus className="w-3.5 h-3.5" />
          Join Sheggar Wheels
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Demo Account
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Sign up to book cars across Addis Ababa or share your own vehicle as a host.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Almaz Bekele"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="e.g. almaz@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone Number (Addis Ababa)
            </label>
            <input
              type="tel"
              placeholder="+251 9X XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Short Bio (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Frequent weekend traveler to Bishoftu and Hawassa..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Role Checkbox */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={alsoOwner}
                onChange={(e) => setAlsoOwner(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">
                  I also want to list cars (Host Role)
                </span>
                <span className="text-slate-500">
                  Grants access to the Host Console to add cars, set pricing, and manage fleet
                  availability.
                </span>
              </div>
            </label>
            <div className="text-[10px] text-slate-400 mt-1 italic">
              Note: Public sign-up creates standard Renter/Host roles. Admin accounts are managed by
              super-administrators only.
            </div>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full font-bold" loading={loading}>
            Create Account & Sign In
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>
      </Card>

      <div className="text-center text-xs text-slate-500">
        Already have a demo account?{' '}
        <Link
          href={`/signin${rawNext ? `?next=${encodeURIComponent(rawNext)}` : ''}`}
          className="text-emerald-600 hover:underline font-semibold"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
