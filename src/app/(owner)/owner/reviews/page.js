'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { MessageSquare, Star, Reply, CheckCircle2 } from 'lucide-react';

export default function OwnerReviewsPage() {
  const { currentUser, cars, reviews, users, replyReview, showToast } = useStore();

  const [replyReviewId, setReplyReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const myCarIds = useMemo(() => {
    return cars.filter((c) => c.ownerId === currentUser?.id).map((c) => c.id);
  }, [cars, currentUser]);

  const myReviews = useMemo(() => {
    return reviews.filter((r) => myCarIds.includes(r.carId));
  }, [reviews, myCarIds]);

  const handleOpenReply = (rev) => {
    setReplyReviewId(rev.id);
    setReplyText(rev.ownerReply || '');
  };

  const handleConfirmReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    const res = replyReview(replyReviewId, replyText);
    setSubmitting(false);

    if (res.success) {
      setReplyReviewId(null);
      setReplyText('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Customer Reviews & Ratings ({myReviews.length})
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Read driver feedback on your vehicles and respond directly to build reputation in Addis.
        </p>
      </div>

      {myReviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Once renters finish their completed trips, their ratings and comments will appear here."
          className="bg-slate-800/60 border-slate-700 text-slate-300"
        />
      ) : (
        <div className="space-y-4">
          {myReviews.map((rev) => {
            const car = cars.find((c) => c.id === rev.carId);
            const renter = users.find((u) => u.id === rev.renterId);

            return (
              <div
                key={rev.id}
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div>
                    <span className="font-bold text-white text-sm">
                      {renter?.name || 'Verified Renter'}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      on <strong>{car?.make} {car?.model}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(rev.createdAt)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed italic">
                  &ldquo;{rev.comment}&rdquo;
                </p>

                {/* Host Response */}
                {rev.ownerReply ? (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Your Public Response:
                    </div>
                    <p className="text-xs text-slate-300">{rev.ownerReply}</p>
                    <div className="text-right">
                      <button
                        onClick={() => handleOpenReply(rev)}
                        className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Edit Response
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReply(rev)}
                      className="text-xs text-slate-300 border-slate-600 hover:bg-slate-700"
                    >
                      <Reply className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      Write Response
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      <Modal
        isOpen={!!replyReviewId}
        onClose={() => setReplyReviewId(null)}
        title="Host Response to Review"
      >
        <form onSubmit={handleConfirmReply} className="space-y-4">
          <p className="text-xs text-slate-600">
            Your reply will be displayed publicly under this vehicle listing for prospective Addis
            Ababa renters to read.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Message
            </label>
            <textarea
              rows={4}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="e.g. Thank you for taking great care of the RAV4! You're welcome back anytime..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setReplyReviewId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={submitting}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Publish Response
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
