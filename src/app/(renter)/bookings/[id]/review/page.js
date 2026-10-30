'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CarImageFallback from '@/components/ui/CarImageFallback';
import { Star, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function BookingReviewPage({ params }) {
  const unwrappedParams = use(params);
  const bookingId = unwrappedParams.id;
  const router = useRouter();

  const { bookings, cars, users, reviews, currentUser, submitReview, showToast } = useStore();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const booking = bookings.find((b) => b.id === bookingId);
  const car = booking ? cars.find((c) => c.id === booking.carId) : null;
  const host = booking ? users.find((u) => u.id === booking.ownerId) : null;
  const existingReview = reviews.find((r) => r.bookingId === bookingId);

  // Negative test rule: only the booking renter can submit a review
  if (booking && currentUser && booking.renterId !== currentUser.id && !currentUser.roles.includes('admin')) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
        <p className="text-sm text-slate-600">Only the renter of this completed trip can submit a review.</p>
        <Link href="/bookings">
          <Button variant="primary" size="sm">Back to My Bookings</Button>
        </Link>
      </div>
    );
  }

  if (!booking || !car) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Booking Not Found</h1>
        <Link href="/bookings">
          <Button variant="outline" size="sm">
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  if (existingReview) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Already Reviewed</h1>
        <p className="text-xs text-slate-500">
          You have already submitted a review for this completed trip. Thank you!
        </p>
        <Link href={`/bookings/${booking.id}`}>
          <Button variant="primary" size="sm">
            View Booking Receipt
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast('Please enter your review feedback', 'error');
      return;
    }

    setSubmitting(true);
    const res = submitReview({
      bookingId: booking.id,
      rating,
      comment,
    });
    setSubmitting(false);

    if (res.success) {
      router.push(`/bookings/${booking.id}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <Link
        href={`/bookings/${booking.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Booking
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Review Your Experience</h1>
        <p className="text-xs text-slate-500">
          Help future Addis Ababa drivers by rating your vehicle and host handover.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Vehicle summary header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100">
            <CarImageFallback
              src={car.photos[0]}
              alt={`${car.make} ${car.model}`}
              fill
            />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              {car.make} {car.model}
            </h2>
            <div className="text-xs text-slate-500">
              Hosted by {host?.name || 'Local Host'} • {formatDate(booking.startDate)} →{' '}
              {formatDate(booking.endDate)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Overall Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 cursor-pointer focus:outline-hidden"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      (hoverRating || rating) >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 ml-2">
                {rating} / 5 Stars
              </span>
            </div>
          </div>

          {/* Feedback textarea */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Review & Comments
            </label>
            <textarea
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the vehicle condition, fuel level, and host communication in Addis Ababa?"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            className="w-full font-bold"
          >
            Submit Verified Review
          </Button>
        </form>
      </Card>
    </div>
  );
}
