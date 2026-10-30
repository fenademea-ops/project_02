'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { formatDate, formatETB } from '@/lib/format';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  ArrowLeft,
  AlertOctagon,
  CheckCircle2,
  Car,
  User,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export default function AdminDisputeDetailPage({ params }) {
  const unwrappedParams = use(params);
  const disputeId = unwrappedParams.id;
  const router = useRouter();

  const { disputes, bookings, cars, users, resolveDisputeAction, showToast } = useStore();

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dispute = disputes.find((d) => d.id === disputeId);
  const booking = dispute ? bookings.find((b) => b.id === dispute.bookingId) : null;
  const car = booking ? cars.find((c) => c.id === booking.carId) : null;
  const opener = dispute ? users.find((u) => u.id === dispute.openedBy) : null;
  const renter = booking ? users.find((u) => u.id === booking.renterId) : null;
  const host = booking ? users.find((u) => u.id === booking.ownerId) : null;

  if (!dispute) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Dispute Not Found</h1>
        <Link href="/admin/disputes">
          <Button variant="outline" size="sm">
            Back to Dispute Queue
          </Button>
        </Link>
      </div>
    );
  }

  const isResolved = dispute.status === 'resolved';

  const handleResolve = (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      showToast('Please provide administrative resolution findings', 'error');
      return;
    }

    setSubmitting(true);
    const res = resolveDisputeAction(dispute.id, notes);
    setSubmitting(false);

    if (res.success) {
      showToast('Dispute marked resolved and recorded!', 'success');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dispute Queue
      </Link>

      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-rose-400 font-bold">{dispute.id}</span>
            <StatusBadge status={dispute.status} type="dispute" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{dispute.reason}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Filed on {formatDate(dispute.createdAt)} by {opener?.name || 'User'}
          </p>
        </div>

        {isResolved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span>Resolved on {formatDate(dispute.resolvedAt)}</span>
          </div>
        )}
      </div>

      {/* Booking & Vehicle Reference */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Attached Booking Context
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div>
            <span className="text-slate-500 block">Vehicle:</span>
            <strong className="text-white text-sm">
              {car?.make} {car?.model} ({car?.year})
            </strong>
            <div className="text-slate-400">Pickup Zone: {car?.neighbourhood}</div>
          </div>

          <div>
            <span className="text-slate-500 block">Rental Charges:</span>
            <span className="font-bold text-emerald-400 text-sm">{formatETB(booking?.total)}</span>
            <div className="text-slate-400">
              {booking?.days} days ({formatDate(booking?.startDate)} →{' '}
              {formatDate(booking?.endDate)})
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="text-slate-500 block">Renter:</span>
            <span className="text-white font-medium">{renter?.name}</span> ({renter?.phone})
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="text-slate-500 block">Host:</span>
            <span className="text-white font-medium">{host?.name}</span> ({host?.phone})
          </div>
        </div>
      </div>

      {/* Claim Statement */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Claim Statement (from {opener?.name}):
        </h2>
        <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-200 leading-relaxed border border-slate-800">
          &ldquo;{dispute.description}&rdquo;
        </div>
      </div>

      {/* Resolution Section */}
      {isResolved ? (
        <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Official Administrative Finding
          </h2>
          <p className="text-xs text-emerald-200 leading-relaxed">{dispute.resolutionNotes}</p>
          <div className="text-[11px] text-emerald-400 pt-1">
            Status: Case closed. Related booking transitioned to resolved.
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleResolve}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Administrative Dispute Determination
            </h2>
            <p className="text-xs text-slate-400">
              Document the investigation findings and compensation or fee adjustments.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Resolution Finding & Notes
            </label>
            <textarea
              rows={4}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Host agreed to refund 500 ETB for half fuel tank. Settlement approved under Sheggar Wheels resolution policy..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/admin/disputes">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Back to Queue
              </Button>
            </Link>
            <Button
              type="submit"
              variant="danger"
              size="md"
              loading={submitting}
              className="font-bold"
            >
              Resolve & Close Case
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
