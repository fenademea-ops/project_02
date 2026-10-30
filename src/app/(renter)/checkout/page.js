'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import { readStorage, removeStorage, STORAGE_KEYS } from '@/lib/storage';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CarImageFallback from '@/components/ui/CarImageFallback';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { currentUser, cars, createBooking, transitionBooking, showToast } = useStore();

  const [draft, setDraft] = useState(null);
  const [phone, setPhone] = useState('0911234567');
  const [pin, setPin] = useState('1234');
  const [processing, setProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState(null);

  useEffect(() => {
    const savedDraft = readStorage(STORAGE_KEYS.CHECKOUT_DRAFT, null);
    if (!savedDraft) {
      router.push('/cars');
      return;
    }
    setDraft(savedDraft);
  }, [router]);

  if (!draft) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-sm text-slate-500">Loading checkout draft...</p>
      </div>
    );
  }

  const car = cars.find((c) => c.id === draft.carId);

  const handleCompletePayment = (e) => {
    e.preventDefault();
    setProcessing(true);

    setTimeout(() => {
      // 1. Create booking in storage
      const res = createBooking({
        carId: draft.carId,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });

      if (!res.success) {
        showToast(res.error || 'Failed to create booking', 'error');
        setProcessing(false);
        return;
      }

      const newBooking = res.booking;

      // 2. Mark with mock TeleBirr payment ref
      const fakeRef = `TB-DEMO-${Math.floor(10000 + Math.random() * 90000)}`;
      transitionBooking(newBooking.id, 'confirmed', {
        paymentStatus: 'paid_mock',
        paymentRef: fakeRef,
      });

      // 3. Clear draft
      removeStorage(STORAGE_KEYS.CHECKOUT_DRAFT);

      setCreatedBookingId(newBooking.id);
      setPaymentDone(true);
      setProcessing(false);
      showToast('Mock TeleBirr payment completed successfully!', 'success');
    }, 1500);
  };

  if (paymentDone) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Confirmed!</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your reservation for {car?.make} {car?.model} is confirmed.
          </p>
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
          <div className="font-bold">TeleBirr Mock Reference:</div>
          <div className="font-mono text-sm tracking-widest text-emerald-700">
            TB-DEMO-{createdBookingId ? createdBookingId.slice(-6).toUpperCase() : '847291'}
          </div>
          <div className="text-[11px] text-emerald-600 pt-1">
            Amount: {formatETB(draft.total)} ETB
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link href={`/bookings/${createdBookingId}`}>
            <Button variant="primary" size="md" className="w-full font-bold">
              View Official Receipt & Trip
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="md" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href={`/cars/${draft.carId}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to vehicle page
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: TeleBirr Mock Payment Box (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Simulated Payment Gateway
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              TeleBirr Checkout (Mock)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Test the end-to-end payment workflow without real financial transactions.
            </p>
          </div>

          <Card className="p-6 border-slate-200 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  TB
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">telebirr Mobile Wallet</h2>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    Verified Mock Partner
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Total Payable</span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatETB(draft.total)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCompletePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  telebirr Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="09XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 font-mono min-h-[44px]"
                  />
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mock PIN (Demo)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    placeholder="••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 tracking-widest font-mono min-h-[44px]"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Default demo PIN: 1234
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This simulation writes a verified mock reference code and advances the booking
                  into <strong>confirmed</strong> state automatically.
                </span>
              </div>

              <Button
                type="submit"
                variant="amber"
                size="lg"
                loading={processing}
                className="w-full font-bold shadow-md"
              >
                Complete Demo Payment ({formatETB(draft.total)})
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: Booking Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Reservation Summary
            </h2>

            {/* Vehicle Header */}
            {car && (
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                  <CarImageFallback
                    src={car.photos[0]}
                    alt={`${car.make} ${car.model}`}
                    fill
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {car.make} {car.model}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {car.year} • {car.neighbourhood}
                  </div>
                </div>
              </div>
            )}

            {/* Date Details */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Trip Start:</span>
                <span className="font-semibold text-slate-900">{formatDate(draft.startDate)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Trip End:</span>
                <span className="font-semibold text-slate-900">{formatDate(draft.endDate)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Duration:</span>
                <span className="font-semibold text-slate-900">{draft.days} Days</span>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>
                  {formatETB(draft.pricePerDay)} × {draft.days} days
                </span>
                <span className="font-semibold text-slate-900">{formatETB(draft.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Platform Fee (10%)</span>
                <span className="font-semibold text-slate-900">{formatETB(draft.fee)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Total Due</span>
                <span className="text-emerald-600 font-black text-base">
                  {formatETB(draft.total)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
