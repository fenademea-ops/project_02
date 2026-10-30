'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import CarImageFallback from '@/components/ui/CarImageFallback';
import Modal from '@/components/ui/Modal';
import {
  Car,
  Clock,
  CheckCircle2,
  TrendingUp,
  Percent,
  PlusCircle,
  Calendar,
  AlertCircle,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';

export default function OwnerDashboardPage() {
  const { currentUser, cars, bookings, users, transitionBooking, showToast } = useStore();

  const [declineBookingId, setDeclineBookingId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filter cars owned by this host
  const myCars = useMemo(() => {
    return cars.filter((c) => c.ownerId === currentUser?.id);
  }, [cars, currentUser]);

  const myCarIds = useMemo(() => myCars.map((c) => c.id), [myCars]);

  // Filter bookings for these cars
  const myBookings = useMemo(() => {
    return bookings.filter((b) => myCarIds.includes(b.carId));
  }, [bookings, myCarIds]);

  // Metrics
  const approvedCarsCount = myCars.filter((c) => c.status === 'approved').length;
  const pendingRequests = myBookings.filter((b) => b.status === 'requested');
  const activeRentals = myBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'in_progress'
  );

  // Total earnings = subtotal of paid/completed/confirmed bookings
  const totalEarnings = useMemo(() => {
    return myBookings
      .filter((b) =>
        ['confirmed', 'in_progress', 'completed', 'reviewed'].includes(b.status)
      )
      .reduce((sum, b) => sum + (b.subtotal || 0), 0);
  }, [myBookings]);

  // Utilization = (cars with active rental / total cars) * 100
  const utilization = useMemo(() => {
    if (myCars.length === 0) return 0;
    const occupiedCarIds = new Set(activeRentals.map((b) => b.carId));
    return Math.round((occupiedCarIds.size / myCars.length) * 100);
  }, [myCars, activeRentals]);

  const handleApprove = (bookingId) => {
    const res = transitionBooking(bookingId, 'confirmed');
    if (res.success) {
      showToast('Booking approved! Renter notified.', 'success');
    }
  };

  const handleConfirmDecline = () => {
    if (!declineBookingId) return;
    setActionLoading(true);

    const res = transitionBooking(declineBookingId, 'declined', {
      declineReason: declineReason || 'Declined by vehicle host',
    });

    setActionLoading(false);
    if (res.success) {
      setDeclineBookingId(null);
      setDeclineReason('');
      showToast('Booking declined', 'info');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Host Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage fleet availability, approve incoming rental requests, and track daily earnings in
            Addis.
          </p>
        </div>

        <Link href="/owner/cars/new">
          <Button variant="primary" size="md">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Vehicle to Fleet
          </Button>
        </Link>
      </div>

      {/* 1. KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Approved Fleet</span>
            <Car className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{approvedCarsCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {myCars.length} total registered
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingRequests.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting your approval</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Active Rentals</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{activeRentals.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Vehicles on the road</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Fleet Earnings</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {formatETB(totalEarnings)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Net payouts (ETB)</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Fleet Utilization</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{utilization}%</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active booking ratio</span>
        </div>
      </div>

      {/* 2. Pending Requests Table (Direct action: Approve / Decline with overlap protection) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Booking Requests ({pendingRequests.length})
          </h2>
          <span className="text-xs text-slate-400">
            Approve requests to lock dates and prevent overlaps
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-slate-400 text-xs">
            No booking requests waiting for your approval right now.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((b) => {
              const car = cars.find((c) => c.id === b.carId);
              const renter = users.find((u) => u.id === b.renterId);

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-slate-700">
                      <CarImageFallback
                        src={car?.photos[0]}
                        alt={`${car?.make} ${car?.model}`}
                        fill
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-sm text-white">
                        {car?.make} {car?.model}
                      </div>
                      <div className="text-xs text-slate-300">
                        Requested by: <strong>{renter?.name || 'Renter'}</strong> ({renter?.phone})
                      </div>
                      <div className="text-xs text-emerald-400">
                        Dates: {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.days} days) •{' '}
                        {formatETB(b.subtotal)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(b.id)}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Approve Request
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-400 border-rose-500/40 hover:bg-rose-950/40"
                      onClick={() => setDeclineBookingId(b.id)}
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Fleet Quick Glance Table */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">My Vehicle Fleet ({myCars.length})</h2>
          <Link
            href="/owner/cars"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Manage All Cars</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {myCars.length === 0 ? (
          <EmptyState
            title="No vehicles in your fleet"
            description="List your first car to start accepting rentals from verified Addis Ababa drivers."
            actionLabel="Add Your First Vehicle"
            onAction={() => {
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = '/owner/cars/new';
            }}
            className="bg-slate-800/60 border-slate-700 text-slate-300"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myCars.slice(0, 3).map((car) => (
              <div
                key={car.id}
                className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3"
              >
                <div className="relative h-36 w-full rounded-xl overflow-hidden bg-slate-900">
                  <CarImageFallback
                    src={car.photos[0]}
                    alt={`${car.make} ${car.model}`}
                    fill
                  />
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={car.status} type="car" />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">
                    {car.make} {car.model} ({car.year})
                  </h3>
                  <div className="text-xs text-slate-400">
                    {car.neighbourhood} • {formatETB(car.pricePerDay)}/day
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-xs">
                  <Link
                    href={`/owner/cars/${car.id}/edit`}
                    className="text-emerald-400 hover:underline"
                  >
                    Edit Vehicle
                  </Link>
                  <Link
                    href={`/owner/cars/${car.id}/availability`}
                    className="text-amber-400 hover:underline"
                  >
                    Availability Calendar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decline Booking Modal */}
      <Modal
        isOpen={!!declineBookingId}
        onClose={() => setDeclineBookingId(null)}
        title="Decline Booking Request"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please share a reason for declining this request. The renter will be notified and dates
            will be freed.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Decline Reason
            </label>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Vehicle needed for maintenance, personal travel..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDeclineBookingId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={handleConfirmDecline}
            >
              Decline Reservation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
