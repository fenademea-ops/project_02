'use client';

import { useState, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import { validateDateRange, isCarAvailableForDates } from '@/lib/validation';
import { writeStorage, STORAGE_KEYS } from '@/lib/storage';
import CarImageFallback from '@/components/ui/CarImageFallback';
import CarLocationMap from '@/components/map/CarLocationMap';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  MapPin,
  Calendar,
  Users,
  Fuel,
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Share2,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function CarDetailPage({ params }) {
  const unwrappedParams = use(params);
  const carId = unwrappedParams.id;
  const router = useRouter();

  const { cars, bookings, reviews, users, currentUser, showToast } = useStore();

  const car = cars.find((c) => c.id === carId);
  const host = car ? users.find((u) => u.id === car.ownerId) : null;
  const carReviews = reviews.filter((r) => r.carId === carId);

  // Gallery state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Booking form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Real-time price and availability computation
  const dateCalculation = useMemo(() => {
    if (!startDate || !endDate) {
      return { valid: false, days: 0, subtotal: 0, fee: 0, total: 0 };
    }

    const range = validateDateRange(startDate, endDate);
    if (!range.valid) {
      return { valid: false, error: range.error, days: 0, subtotal: 0, fee: 0, total: 0 };
    }

    const availability = isCarAvailableForDates(
      carId,
      startDate,
      endDate,
      bookings,
      car?.unavailableDates || [],
      null,
      car
    );

    if (!availability.available) {
      return {
        valid: false,
        error: availability.reason,
        days: range.days,
        subtotal: 0,
        fee: 0,
        total: 0,
      };
    }

    const days = range.days;
    const pricePerDay = car?.pricePerDay || 0;
    const subtotal = days * pricePerDay;
    const fee = Math.round(subtotal * 0.1);
    const total = subtotal + fee;

    return {
      valid: true,
      days,
      subtotal,
      fee,
      total,
    };
  }, [startDate, endDate, carId, bookings, car]);

  if (!car) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Vehicle Not Found</h1>
        <p className="text-sm text-slate-500">
          This vehicle listing does not exist or may have been removed.
        </p>
        <Link href="/cars">
          <Button variant="primary">Browse Available Vehicles</Button>
        </Link>
      </div>
    );
  }

  // Handle Instant Mock Booking / Checkout Request
  const handleProceedToBooking = () => {
    if (!currentUser) {
      router.push(`/signin?next=/cars/${carId}`);
      return;
    }

    if (currentUser.id === car.ownerId) {
      showToast('You cannot book your own vehicle', 'error');
      return;
    }

    if (!dateCalculation.valid) {
      showToast(dateCalculation.error || 'Please choose valid dates', 'error');
      return;
    }

    setBookingLoading(true);

    // Save draft into sw_checkout_draft_v1
    const draft = {
      carId: car.id,
      renterId: currentUser.id,
      startDate,
      endDate,
      days: dateCalculation.days,
      pricePerDay: car.pricePerDay,
      subtotal: dateCalculation.subtotal,
      fee: dateCalculation.fee,
      total: dateCalculation.total,
      createdAt: new Date().toISOString(),
    };

    writeStorage(STORAGE_KEYS.CHECKOUT_DRAFT, draft);

    // Navigate to TeleBirr checkout screen
    router.push('/checkout');
  };

  // Truthful JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${car.make} ${car.model} (${car.year})`,
    image: car.photos,
    description: car.description,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ETB',
      price: car.pricePerDay,
      availability:
        car.status === 'approved' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/cars"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vehicle Search
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Link copied to clipboard!', 'info');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer min-h-[36px]"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Listing
            </button>
          </div>
        </div>

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <MapPin className="w-3 h-3" />
                {car.neighbourhood}, Addis Ababa
              </span>
              <span className="text-xs text-slate-400 font-medium">Year {car.year}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {car.make} {car.model}
            </h1>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs text-slate-500">Daily Rental</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {formatETB(car.pricePerDay)}
              <span className="text-xs font-medium text-slate-400 ml-1">/ day</span>
            </div>
          </div>
        </div>

        {/* 1. Photo Gallery */}
        <div className="space-y-3">
          <div className="relative h-[340px] sm:h-[480px] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
            <CarImageFallback
              src={car.photos[selectedPhotoIndex] || car.photos[0]}
              alt={`${car.make} ${car.model}`}
              fill
              priority
            />
          </div>

          {/* Thumbnails row */}
          {car.photos.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {car.photos.map((photoUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${selectedPhotoIndex === idx
                      ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                      : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                >
                  <CarImageFallback src={photoUrl} alt="Thumbnail" fill />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Main Content Grid: Specs & Details (Left) + Booking Box (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Details, Specs, Host, Map, Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key Specs Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">Transmission</span>
                <span className="text-sm font-bold text-slate-800">{car.transmission}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">Seats</span>
                <span className="text-sm font-bold text-slate-800">{car.seats} Passengers</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">District</span>
                <span className="text-sm font-bold text-slate-800">{car.neighbourhood}</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 block mb-1">Condition</span>
                <span className="text-sm font-bold text-emerald-600">Verified Host</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <h2 className="text-base font-bold text-slate-900">About This Vehicle</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {car.description}
              </p>
            </div>

            {/* Features & Amenities */}
            {car.features && car.features.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
                <h2 className="text-base font-bold text-slate-900">Vehicle Highlights</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {car.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host Profile Card */}
            {host && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center shrink-0">
                    {host.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{host.name}</h3>
                    <p className="text-xs text-slate-500">
                      Host in {car.neighbourhood} • Member since {formatDate(host.createdAt)}
                    </p>
                    {host.bio && <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{host.bio}&rdquo;</p>}
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>Identity & Phone Verified</span>
                </div>
              </div>
            )}

            {/* Location & Map Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Pickup Zone</h2>
                  <p className="text-xs text-slate-500">
                    Located in {car.neighbourhood}, Addis Ababa. Exact handover coordinates provided
                    upon confirmation.
                  </p>
                </div>
              </div>

              <CarLocationMap
                latitude={car.latitude}
                longitude={car.longitude}
                neighbourhood={car.neighbourhood}
                carTitle={`${car.make} ${car.model}`}
                height="320px"
              />
            </div>

            {/* Reviews Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Renter Reviews ({carReviews.length})
                </h2>
              </div>

              {carReviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No reviews yet for this vehicle. Be the first to book and share your experience!
                </p>
              ) : (
                <div className="space-y-4">
                  {carReviews.map((rev) => {
                    const reviewer = users.find((u) => u.id === rev.renterId);
                    return (
                      <div key={rev.id} className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">
                              {reviewer?.name || 'Verified Renter'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(rev.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center text-amber-500">
                            {[...Array(rev.rating)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-current" />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                        {/* Owner Reply */}
                        {rev.ownerReply && (
                          <div className="mt-2 pl-3 border-l-2 border-emerald-500 bg-white/70 p-2.5 rounded-r-lg text-xs space-y-0.5">
                            <div className="font-semibold text-emerald-800 text-[11px]">
                              Response from Host ({host?.name || 'Owner'}):
                            </div>
                            <p className="text-slate-600 text-[11px]">{rev.ownerReply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Sticky Booking Box */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-5">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-2xl font-black text-slate-900">
                    {formatETB(car.pricePerDay)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium ml-1">/ day</span>
                </div>
                <StatusBadge status={car.status} type="car" />
              </div>

              {/* Unavailability Banner */}
              {(car.status !== 'approved' || car.isAvailable === false || ['maintenance', 'temporarily_unavailable', 'unavailable'].includes(car.availabilityStatus)) && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    {car.availabilityStatus === 'maintenance'
                      ? 'Vehicle Currently in Maintenance'
                      : car.status !== 'approved'
                      ? `Listing ${car.status}`
                      : 'Vehicle Temporarily Unavailable'}
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    {car.unavailabilityReason || 'This vehicle is temporarily not accepting new bookings. Please select another vehicle or check back later.'}
                  </p>
                  {car.availableFrom && (
                    <div className="text-[10px] font-semibold text-amber-900 mt-1">
                      Expected return to service: {car.availableFrom}
                    </div>
                  )}
                </div>
              )}

              {/* Date selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pickup Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={car.status !== 'approved' || car.isAvailable === false || ['maintenance', 'temporarily_unavailable', 'unavailable'].includes(car.availabilityStatus)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={car.status !== 'approved' || car.isAvailable === false || ['maintenance', 'temporarily_unavailable', 'unavailable'].includes(car.availabilityStatus)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Price Breakdown Calculation */}
              {startDate && endDate && (
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  {dateCalculation.valid ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>
                          {formatETB(car.pricePerDay)} × {dateCalculation.days} days
                        </span>
                        <span className="font-medium text-slate-900">
                          {formatETB(dateCalculation.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          Platform Fee (10%)
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        </span>
                        <span className="font-medium text-slate-900">
                          {formatETB(dateCalculation.fee)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                        <span>Total (ETB)</span>
                        <span className="text-emerald-600 font-extrabold text-base">
                          {formatETB(dateCalculation.total)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{dateCalculation.error || 'Invalid date range'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Book CTA */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold text-sm"
                  loading={bookingLoading}
                  disabled={
                    !dateCalculation.valid ||
                    car.status !== 'approved' ||
                    car.isAvailable === false ||
                    ['maintenance', 'temporarily_unavailable', 'unavailable'].includes(car.availabilityStatus)
                  }
                  onClick={handleProceedToBooking}
                >
                  {car.status !== 'approved' || car.isAvailable === false || ['maintenance', 'temporarily_unavailable', 'unavailable'].includes(car.availabilityStatus)
                    ? 'Unavailable for Booking'
                    : currentUser
                    ? 'Request Reservation'
                    : 'Sign In to Reserve'}
                </Button>

                <p className="text-[11px] text-center text-slate-400">
                  Mock TeleBirr checkout on next screen. No real money charged.
                </p>
              </div>

              {/* Trust highlights */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Free cancellation up to 24h before trip start</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Includes standard third-party insurance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
