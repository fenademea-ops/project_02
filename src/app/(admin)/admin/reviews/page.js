'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import {
  MessageSquare,
  Search,
  Download,
  Filter,
  Star,
  ShieldAlert,
  Eye,
  RotateCcw,
  Flag,
  User,
  Car,
  CheckCircle,
} from 'lucide-react';

export default function AdminReviewsPage() {
  const {
    reviews,
    bookings,
    cars,
    users,
    adminModerateReviewAction,
    showToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  // Modals
  const [inspectReview, setInspectReview] = useState(null);
  const [hideModalReview, setHideModalReview] = useState(null);
  const [hideReason, setHideReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Enriched reviews with booking, car, and users
  const enrichedReviews = useMemo(() => {
    return reviews.map((r) => {
      const booking = bookings.find((b) => b.id === r.bookingId);
      const car = cars.find((c) => c.id === (r.carId || booking?.carId));
      const reviewer = users.find((u) => u.id === (r.renterId || r.userId));
      const host = users.find((u) => u.id === (r.ownerId || car?.ownerId));

      return {
        ...r,
        status: r.status || 'published',
        booking,
        car,
        reviewer,
        host,
      };
    });
  }, [reviews, bookings, cars, users]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const total = enrichedReviews.length;
    const published = enrichedReviews.filter((r) => r.status === 'published').length;
    const flagged = enrichedReviews.filter((r) => r.status === 'flagged').length;
    const hidden = enrichedReviews.filter((r) => r.status === 'hidden').length;
    const avgRating = total > 0
      ? (enrichedReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / total).toFixed(1)
      : '5.0';

    return { total, published, flagged, hidden, avgRating };
  }, [enrichedReviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return enrichedReviews.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${r.comment || ''} ${r.reviewer?.name} ${r.host?.name} ${r.car?.make} ${r.car?.model} ${r.bookingId || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      if (ratingFilter !== 'all' && String(r.rating) !== ratingFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedReviews, searchQuery, statusFilter, ratingFilter]);

  // Handlers
  const handleFlag = (reviewId) => {
    adminModerateReviewAction(reviewId, 'flagged', 'Flagged by administrator for investigation');
  };

  const handleRestore = (reviewId) => {
    adminModerateReviewAction(reviewId, 'published', 'Approved and restored by administrator');
  };

  const handleConfirmHide = () => {
    if (!hideModalReview) return;
    if (!hideReason.trim()) {
      showToast('A reason for hiding this review is required', 'error');
      return;
    }
    setLoading(true);
    const res = adminModerateReviewAction(hideModalReview.id, 'hidden', hideReason.trim());
    setLoading(false);
    if (res.success) {
      setHideModalReview(null);
      setHideReason('');
    }
  };

  const handleExportCSV = () => {
    const rows = filteredReviews.map((r) => ({
      ReviewID: r.id,
      BookingID: r.bookingId || 'N/A',
      Rating: r.rating,
      Comment: r.comment || '',
      ReviewerName: r.reviewer?.name || 'Unknown',
      HostName: r.host?.name || 'Unknown',
      Vehicle: r.car ? `${r.car.make} ${r.car.model}` : 'Unknown',
      Status: r.status,
      ModerationReason: r.moderationReason || '',
      CreatedAt: r.createdAt || '',
    }));

    exportToCSV(rows, sanitizeFileName(`sheggar_reviews_${new Date().toISOString().slice(0, 10)}`));
    showToast('Reviews exported to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-rose-500" />
            Reviews & Community Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor feedback authenticity, moderate inappropriate remarks, verify rental eligibility, and preserve dispute transparency.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Reviews CSV ({filteredReviews.length})
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Reviews
          </span>
          <div className="text-2xl font-black text-white mt-1">{metrics.total}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Verified trip feedback</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Published
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.published}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Public on listings</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Flagged
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">{metrics.flagged}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Needs admin check</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Hidden / Moderated
          </span>
          <div className="text-2xl font-black text-rose-400 mt-1">{metrics.hidden}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Hidden from marketplace</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Average Rating
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            {metrics.avgRating}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Across entire fleet</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by review text, reviewer name, host name, car, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Moderation States</option>
              <option value="published">Published</option>
              <option value="flagged">Flagged</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Star Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      {filteredReviews.length === 0 ? (
        <EmptyState
          title="No reviews match your query"
          description="Try broadening your search term or clearing active filters."
          className="bg-slate-900 border-slate-800 text-slate-300 py-12"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="table-responsive">`n            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Review & Feedback</th>
                  <th className="py-3.5 px-4">Renter</th>
                  <th className="py-3.5 px-4">Vehicle & Host</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* Review & Stars */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= r.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] font-bold text-slate-300 ml-1">
                          {r.rating}.0
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs italic line-clamp-2">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                      {r.hostReply && (
                        <div className="text-[11px] text-slate-400 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 mt-1">
                          <span className="font-semibold text-rose-400">Host Reply:</span> {r.hostReply}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1">
                        {formatDate(r.createdAt)} • Booking #{r.bookingId ? r.bookingId.slice(-6) : 'N/A'}
                      </div>
                    </td>

                    {/* Renter */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {r.reviewer?.name || 'Renter'}
                      </div>
                      <div className="text-[11px] text-slate-400">{r.reviewer?.email}</div>
                    </td>

                    {/* Vehicle & Host */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {r.car ? `${r.car.make} ${r.car.model}` : 'Vehicle'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Host: {r.host?.name || 'Host'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={r.status} />
                      {r.moderationReason && (
                        <span className="block text-[10px] text-rose-400 max-w-[130px] truncate mx-auto mt-0.5">
                          {r.moderationReason}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectReview(r)}
                          title="Inspect Details"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {r.status === 'published' && (
                          <button
                            onClick={() => handleFlag(r.id)}
                            title="Flag for inquiry"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-900/50 text-amber-400 transition-colors cursor-pointer"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {r.status !== 'hidden' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setHideModalReview(r)}
                            className="text-xs py-1 px-2"
                          >
                            Hide
                          </Button>
                        )}

                        {r.status === 'hidden' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(r.id)}
                            className="text-xs text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 py-1 px-2"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Review Modal */}
      <Modal
        isOpen={!!inspectReview}
        onClose={() => setInspectReview(null)}
        title={`Review Moderation Dossier: #${inspectReview?.id}`}
      >
        {inspectReview && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Verified Rental Experience</span>
                <StatusBadge status={inspectReview.status} />
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= inspectReview.rating ? 'fill-amber-400' : 'text-slate-300'}`}
                  />
                ))}
                <span className="font-bold text-slate-800 ml-1">{inspectReview.rating}.0 Stars</span>
              </div>
              <p className="text-slate-800 font-medium italic bg-white p-3 rounded-lg border border-slate-200">
                &ldquo;{inspectReview.comment}&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Renter Author</span>
                <div className="font-semibold text-slate-800">{inspectReview.reviewer?.name}</div>
                <div className="text-slate-500 text-[11px]">{inspectReview.reviewer?.email}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Host</span>
                <div className="font-semibold text-slate-800">{inspectReview.host?.name}</div>
                <div className="text-slate-500 text-[11px]">{inspectReview.host?.email}</div>
              </div>
            </div>

            {inspectReview.moderationReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                <span className="font-bold block">Moderation Note:</span>
                {inspectReview.moderationReason}
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setInspectReview(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hide Review Modal */}
      <Modal
        isOpen={!!hideModalReview}
        onClose={() => setHideModalReview(null)}
        title="Hide Review From Marketplace"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Hiding this review will remove it from the public car listing. The original content is preserved for audit compliance.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Moderation Reason *
            </label>
            <textarea
              rows={3}
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder="e.g. Inappropriate language, commercial solicitation, personal contact information shared, or defamatory claims..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setHideModalReview(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={loading}
              onClick={handleConfirmHide}
            >
              Confirm Hide
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
