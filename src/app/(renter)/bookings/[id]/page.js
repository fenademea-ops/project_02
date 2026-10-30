'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import CarImageFallback from '@/components/ui/CarImageFallback';
import {
  FileText,
  Printer,
  ArrowLeft,
  Navigation,
  Star,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function BookingDetailPage({ params }) {
  const unwrappedParams = use(params);
  const bookingId = unwrappedParams.id;
  const router = useRouter();

  const { bookings, cars, users, currentUser, transitionBooking, submitDispute, showToast } =
    useStore();

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  const booking = bookings.find((b) => b.id === bookingId);
  const car = booking ? cars.find((c) => c.id === booking.carId) : null;
  const host = booking ? users.find((u) => u.id === booking.ownerId) : null;
  const renter = booking ? users.find((u) => u.id === booking.renterId) : null;

  // Negative test rule: Renter viewing another renter's booking is refused
  if (booking && currentUser && booking.renterId !== currentUser.id && !currentUser.roles.includes('admin') && booking.ownerId !== currentUser.id) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
        <p className="text-sm text-slate-600">
          You do not have permission to view this reservation record.
        </p>
        <Link href="/bookings">
          <Button variant="primary" size="sm">
            Back to My Bookings
          </Button>
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Booking Not Found</h1>
        <p className="text-sm text-slate-500">The requested reservation record does not exist.</p>
        <Link href="/bookings">
          <Button variant="outline" size="sm">
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleOpenDispute = (e) => {
    e.preventDefault();
    if (!disputeReason || !disputeDescription) {
      showToast('Please provide a reason and description', 'error');
      return;
    }

    setDisputeLoading(true);
    const res = submitDispute({
      bookingId: booking.id,
      reason: disputeReason,
      description: disputeDescription,
    });
    setDisputeLoading(false);

    if (res.success) {
      setDisputeModalOpen(false);
      setDisputeReason('');
      setDisputeDescription('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top navigation actions */}
      <div className="flex items-center justify-between no-print">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Bookings
        </Link>

        <div className="flex items-center gap-2">
          {booking.status === 'in_progress' && (
            <Link href={`/bookings/${booking.id}/track`}>
              <Button variant="amber" size="sm">
                <Navigation className="w-4 h-4 mr-1.5" />
                Live GPS Route
              </Button>
            </Link>
          )}

          {booking.status === 'completed' && (
            <Link href={`/bookings/${booking.id}/review`}>
              <Button variant="primary" size="sm">
                <Star className="w-4 h-4 mr-1.5 text-amber-300" />
                Write Review
              </Button>
            </Link>
          )}

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5 text-slate-500" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Official Printable Receipt Document */}
      <Card className="p-6 sm:p-10 border-slate-200 shadow-sm space-y-8 bg-white print:border-none print:shadow-none">
        {/* Receipt Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Sheggar<span className="text-emerald-600">Wheels</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Official Demo Receipt
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Addis Ababa Peer-to-Peer Car Sharing • Tax Reg: #ET-DEMO-99124
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="text-xs text-slate-400">Booking Reference</div>
            <div className="font-mono text-sm font-bold text-slate-900">{booking.id}</div>
            <div className="text-xs text-slate-500">Issued: {formatDate(booking.createdAt)}</div>
          </div>
        </div>

        {/* Status & TeleBirr Highlights Bar */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Current Lifecycle:</span>
            <StatusBadge status={booking.status} type="booking" />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Payment:</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              {booking.paymentStatus === 'paid_mock' ? 'Mock TeleBirr Paid' : booking.paymentStatus}
            </span>
            {booking.paymentRef && (
              <span className="font-mono text-slate-600">Ref: {booking.paymentRef}</span>
            )}
          </div>
        </div>

        {/* Customer & Host Two-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600">
          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block mb-2">
              Renter Information
            </span>
            <div>
              <strong>Name:</strong> {renter?.name || 'Verified Renter'}
            </div>
            <div>
              <strong>Email:</strong> {renter?.email}
            </div>
            <div>
              <strong>Phone:</strong> {renter?.phone}
            </div>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block mb-2">
              Vehicle Host Information
            </span>
            <div>
              <strong>Host Name:</strong> {host?.name || 'Local Host'}
            </div>
            <div>
              <strong>Handover Zone:</strong> {car?.neighbourhood}, Addis Ababa
            </div>
            <div>
              <strong>Emergency Host Contact:</strong> {host?.phone}
            </div>
          </div>
        </div>

        {/* Reserved Vehicle Details */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Vehicle Specification
          </h2>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white">
            <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100">
              <CarImageFallback
                src={car?.photos[0]}
                alt={`${car?.make} ${car?.model}`}
                fill
              />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-900">
                {car?.make} {car?.model} ({car?.year})
              </h3>
              <p className="text-xs text-slate-500">
                {car?.transmission} • {car?.seats} Passengers • {car?.neighbourhood} Zone
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                Rental Period: {formatDate(booking.startDate)} → {formatDate(booking.endDate)} (
                {booking.days} Days)
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Pricing Table */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Itemized Rental Charges
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center">Days</th>
                  <th className="py-2.5 px-4 text-right">Daily Rate</th>
                  <th className="py-2.5 px-4 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    Vehicle Daily Lease ({car?.make} {car?.model})
                  </td>
                  <td className="py-3 px-4 text-center">{booking.days}</td>
                  <td className="py-3 px-4 text-right">{formatETB(booking.pricePerDay)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {formatETB(booking.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900" colSpan={3}>
                    Platform Service & Roadside Guarantee Fee (10%)
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {formatETB(booking.fee)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 font-black text-sm border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-4 text-slate-900" colSpan={3}>
                    Total Paid (ETB)
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-black text-base">
                    {formatETB(booking.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="pt-6 border-t border-slate-200 text-[11px] text-slate-400 space-y-1">
          <p>
            * This document is generated for demonstration and simulation purposes on Sheggar
            Wheels Addis Ababa.
          </p>
          <p>
            For support or emergency roadside assistance, reach out to support@sheggarwheels.com.
          </p>
        </div>
      </Card>

      {/* Renter Dispute Trigger (if active or completed) */}
      {(booking.status === 'in_progress' || booking.status === 'completed') && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Having an issue with this trip?
            </h3>
            <p className="text-xs text-orange-800">
              Disputes over fuel level, handover delay, or condition can be reported to our admin team.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisputeModalOpen(true)}
            className="text-orange-900 border-orange-300 hover:bg-orange-100"
          >
            Open Dispute
          </Button>
        </div>
      )}

      {/* Dispute Modal */}
      <Modal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        title="Open Trip Dispute"
      >
        <form onSubmit={handleOpenDispute} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dispute Category / Reason
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fuel discrepancy, vehicle cleanliness, late handover"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500 min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Description
            </label>
            <textarea
              rows={4}
              required
              placeholder="Provide specific details of what happened during handover or trip..."
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisputeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="amber"
              size="sm"
              type="submit"
              loading={disputeLoading}
            >
              Submit Dispute
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
