'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import { generateCsv, downloadCsv } from '@/lib/csv';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import CarImageFallback from '@/components/ui/CarImageFallback';
import Modal from '@/components/ui/Modal';
import {
  Download,
  Calendar,
  Compass,
  Navigation,
  FileText,
  Star,
  AlertTriangle,
  XCircle,
  Filter,
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All Bookings' },
  { id: 'active', label: 'Active & Confirmed' },
  { id: 'pending', label: 'Requested' },
  { id: 'completed', label: 'Completed' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'cancelled', label: 'Cancelled / Declined' },
];

export default function RenterBookingsPage() {
  const { currentUser, bookings, cars, transitionBooking } = useStore();
  const [activeTab, setActiveTab] = useState('all');

  // Cancel modal state
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const myBookings = useMemo(() => {
    return bookings.filter((b) => b.renterId === currentUser?.id);
  }, [bookings, currentUser]);

  const filteredBookings = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return myBookings.filter((b) => b.status === 'in_progress' || b.status === 'confirmed');
      case 'pending':
        return myBookings.filter((b) => b.status === 'requested');
      case 'completed':
        return myBookings.filter((b) => b.status === 'completed' || b.status === 'reviewed');
      case 'disputed':
        return myBookings.filter((b) => b.status === 'disputed' || b.status === 'resolved');
      case 'cancelled':
        return myBookings.filter((b) => b.status === 'cancelled' || b.status === 'declined');
      default:
        return myBookings;
    }
  }, [myBookings, activeTab]);

  // CSV Export
  const handleExportCsv = () => {
    const rows = myBookings.map((b) => {
      const car = cars.find((c) => c.id === b.carId);
      return {
        bookingId: b.id,
        vehicle: car ? `${car.make} ${car.model} (${car.year})` : 'Vehicle',
        neighbourhood: car?.neighbourhood || 'Addis Ababa',
        startDate: b.startDate,
        endDate: b.endDate,
        days: b.days,
        dailyRate: b.pricePerDay,
        subtotal: b.subtotal,
        fee: b.fee,
        totalETB: b.total,
        paymentStatus: b.paymentStatus,
        paymentRef: b.paymentRef || 'N/A',
        status: b.status,
        createdAt: b.createdAt,
      };
    });

    const headers = [
      { key: 'bookingId', label: 'Booking ID' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'neighbourhood', label: 'Pickup Zone' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'days', label: 'Days' },
      { key: 'totalETB', label: 'Total (ETB)' },
      { key: 'paymentStatus', label: 'Payment' },
      { key: 'paymentRef', label: 'Ref Code' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Booked At' },
    ];

    const csvData = generateCsv(rows, headers);
    downloadCsv(`sheggar-wheels-my-trips-${Date.now()}.csv`, csvData);
  };

  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;
    setIsSubmittingCancel(true);

    transitionBooking(cancelModalBooking.id, 'cancelled', {
      cancellationReason: cancelReason || 'Cancelled by renter',
    });

    setIsSubmittingCancel(false);
    setCancelModalBooking(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Trip Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review status history, live simulation tracking, and downloadable VAT/TeleBirr receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {myBookings.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          )}
          <Link href="/cars">
            <Button variant="primary" size="sm">
              <Compass className="w-4 h-4 mr-1.5" />
              Find Cars
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
                isActive
                  ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          title="No reservations in this category"
          description="You don't have any trips matching the selected filter tab."
          actionLabel="Browse Available Cars"
          onAction={() => {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/cars';
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const car = cars.find((c) => c.id === b.carId);
            const canCancel = b.status === 'requested' || b.status === 'confirmed';
            const canReview = b.status === 'completed';
            const isTracking = b.status === 'in_progress';

            return (
              <Card key={b.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
                {/* Vehicle & Date Info */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                    <CarImageFallback
                      src={car?.photos[0]}
                      alt={`${car?.make} ${car?.model}`}
                      fill
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">
                        {car?.make} {car?.model}
                      </h3>
                      <StatusBadge status={b.status} type="booking" />
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Pickup: {car?.neighbourhood || 'Addis Ababa'}</span>
                      <span>•</span>
                      <span>
                        {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.days} days)
                      </span>
                    </div>

                    {b.paymentRef && (
                      <div className="text-[11px] text-emerald-700 font-mono">
                        Mock TeleBirr Ref: {b.paymentRef}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block">Total</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {formatETB(b.total)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Live Tracking */}
                    {isTracking && (
                      <Link href={`/bookings/${b.id}/track`}>
                        <Button variant="amber" size="sm">
                          <Navigation className="w-3.5 h-3.5 mr-1" />
                          Live Tracking
                        </Button>
                      </Link>
                    )}

                    {/* Review CTA */}
                    {canReview && (
                      <Link href={`/bookings/${b.id}/review`}>
                        <Button variant="primary" size="sm">
                          <Star className="w-3.5 h-3.5 mr-1 text-amber-300" />
                          Review Host
                        </Button>
                      </Link>
                    )}

                    {/* Receipt CTA */}
                    <Link href={`/bookings/${b.id}`}>
                      <Button variant="outline" size="sm">
                        <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Receipt
                      </Button>
                    </Link>

                    {/* Cancel CTA */}
                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => setCancelModalBooking(b)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      <Modal
        isOpen={!!cancelModalBooking}
        onClose={() => setCancelModalBooking(null)}
        title="Cancel Trip Reservation"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to cancel this booking? This will immediately free the calendar dates
            for other Addis Ababa drivers.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason (Optional)
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule changed, found alternate ride..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalBooking(null)}
            >
              Keep Booking
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isSubmittingCancel}
              onClick={handleConfirmCancel}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
