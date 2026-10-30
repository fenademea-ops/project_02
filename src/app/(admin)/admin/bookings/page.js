'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import CarImageFallback from '@/components/ui/CarImageFallback';
import {
  CalendarDays,
  KeyRound,
  Search,
  Download,
  Eye,
  Filter,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  User,
  Car,
  Clock,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

export default function AdminBookingsPage() {
  const {
    bookings,
    cars,
    users,
    disputes,
    adminCancelBookingAction,
    adminStartBookingAction,
    adminCompleteBookingAction,
    adminProcessRefundAction,
    showToast,
  } = useStore();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [inspectBooking, setInspectBooking] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundModalBooking, setRefundModalBooking] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Augment bookings with conflict detection & relations
  const enrichedBookings = useMemo(() => {
    return bookings.map((b) => {
      const car = cars.find((c) => c.id === b.carId);
      const renter = users.find((u) => u.id === b.renterId);
      const host = users.find((u) => u.id === b.ownerId);
      const dispute = disputes.find((d) => d.bookingId === b.id);

      // Check for overlapping confirmed or in-progress bookings on the same car
      const conflicts = bookings.filter((other) => {
        if (other.id === b.id) return false;
        if (other.carId !== b.carId) return false;
        if (!['confirmed', 'in_progress'].includes(other.status)) return false;
        if (!['confirmed', 'in_progress'].includes(b.status)) return false;
        // Overlap test: !(b.endDate < other.startDate || b.startDate > other.endDate)
        return b.startDate <= other.endDate && b.endDate >= other.startDate;
      });

      return {
        ...b,
        car,
        renter,
        host,
        dispute,
        hasConflict: conflicts.length > 0,
        conflictingBookings: conflicts,
      };
    });
  }, [bookings, cars, users, disputes]);

  // Filter & Sort
  const filteredBookings = useMemo(() => {
    let result = enrichedBookings.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${b.id} ${b.car?.make} ${b.car?.model} ${b.renter?.name} ${b.renter?.email} ${b.host?.name} ${b.paymentRef || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      if (paymentFilter !== 'all') {
        if (paymentFilter === 'paid' && b.paymentStatus !== 'paid_mock') return false;
        if (paymentFilter === 'refunded' && b.paymentStatus !== 'refunded_mock') return false;
        if (paymentFilter === 'pending' && b.paymentStatus !== 'pending') return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'start_soonest') return new Date(a.startDate) - new Date(b.startDate);
      if (sortBy === 'amount_desc') return (b.totalAmount || b.total) - (a.totalAmount || a.total);
      if (sortBy === 'amount_asc') return (a.totalAmount || a.total) - (b.totalAmount || b.total);
      return 0;
    });

    return result;
  }, [enrichedBookings, searchQuery, statusFilter, paymentFilter, sortBy]);

  // Paginated records
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  // Actions
  const handleStartRental = (bookingId) => {
    adminStartBookingAction(bookingId);
  };

  const handleCompleteRental = (bookingId) => {
    adminCompleteBookingAction(bookingId);
  };

  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;
    if (!cancelReason.trim()) {
      showToast('A cancellation reason is required', 'error');
      return;
    }
    setLoading(true);
    const res = adminCancelBookingAction(cancelModalBooking.id, cancelReason.trim());
    setLoading(false);
    if (res.success) {
      setCancelModalBooking(null);
      setCancelReason('');
    }
  };

  const handleConfirmRefund = () => {
    if (!refundModalBooking) return;
    if (!refundReason.trim()) {
      showToast('A refund justification is required', 'error');
      return;
    }
    setLoading(true);
    const res = adminProcessRefundAction(refundModalBooking.id, refundReason.trim());
    setLoading(false);
    if (res.success) {
      setRefundModalBooking(null);
      setRefundReason('');
    }
  };

  const handleExportCSV = () => {
    const rows = filteredBookings.map((b) => {
      const gross = b.totalAmount || b.total || 0;
      const fee = b.platformFee || b.fee || 0;
      const hostNet = b.hostEarnings || (gross - fee);

      return {
        BookingID: b.id,
        Vehicle: b.car ? `${b.car.make} ${b.car.model}` : 'N/A',
        RenterName: b.renter?.name || 'Unknown',
        RenterEmail: b.renter?.email || '',
        HostName: b.host?.name || 'Unknown',
        StartDate: b.startDate,
        EndDate: b.endDate,
        RentalDays: b.totalDays || b.days || 1,
        GrossAmount_ETB: gross,
        PlatformCommission_ETB: fee,
        HostNetEarnings_ETB: hostNet,
        PaymentStatus: b.paymentStatus,
        PaymentRef: b.paymentRef || 'N/A',
        BookingStatus: b.status,
        DisputeStatus: b.dispute?.status || 'None',
        CreatedAt: b.createdAt || '',
      };
    });

    exportToCSV(rows, sanitizeFileName(`sheggar_all_bookings_${new Date().toISOString().slice(0, 10)}`));
    showToast('Bookings export generated', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-rose-500" />
            Bookings & Rental Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track rental lifecycles, detect schedule collisions, trigger trip departures, mark returns, and execute simulated refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/rent-outs">
            <Button variant="primary" size="sm" className="text-xs">
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              Rent-Out Management
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV ({filteredBookings.length})
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search booking ID, vehicle, renter, host, ref..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Lifecycles ({bookings.length})</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress (Active)</option>
              <option value="completed">Completed</option>
              <option value="reviewed">Reviewed</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
              <option value="disputed">Disputed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Payment filter */}
          <div className="md:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid (Mock)</option>
              <option value="pending">Pending Payment</option>
              <option value="refunded">Refunded (Mock)</option>
            </select>
          </div>

          {/* Sort */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="start_soonest">Trip Starts Soonest</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-800/60">
          <span className="text-[11px] font-semibold text-slate-500 mr-2 uppercase tracking-wider">
            Quick Filter:
          </span>
          {['all', 'confirmed', 'in_progress', 'completed', 'disputed', 'cancelled'].map((st) => {
            const count = st === 'all' ? bookings.length : bookings.filter((b) => b.status === st).length;
            return (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st.replace('_', ' ')} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings Table */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          title="No bookings match criteria"
          description="Try selecting a different status filter or clearing your search query."
          className="bg-slate-900 border-slate-800 text-slate-300 py-12"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="table-responsive">`n            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Booking ID</th>
                  <th className="py-3.5 px-4">Vehicle & Host</th>
                  <th className="py-3.5 px-4">Renter</th>
                  <th className="py-3.5 px-4">Rental Window</th>
                  <th className="py-3.5 px-4 text-right">Fee (10%)</th>
                  <th className="py-3.5 px-4 text-right">Gross Total</th>
                  <th className="py-3.5 px-4 text-center">Lifecycle</th>
                  <th className="py-3.5 px-4 text-center">Payment</th>
                  <th className="py-3.5 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {paginatedBookings.map((b) => {
                  const gross = b.totalAmount || b.total || 0;
                  const fee = b.platformFee || b.fee || 0;
                  const isConfirmed = b.status === 'confirmed';
                  const isInProgress = b.status === 'in_progress';
                  const canCancel = ['requested', 'confirmed'].includes(b.status);
                  const canRefund = b.paymentStatus === 'paid_mock' && ['cancelled', 'disputed', 'declined'].includes(b.status);

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-850/60 transition-colors ${
                        b.hasConflict ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Booking ID & Conflict Warning */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          #{b.id.slice(-6)}
                          {b.hasConflict && (
                            <span
                              title="Schedule Collision: another confirmed/active rental overlaps this car during these dates!"
                              className="inline-flex items-center text-amber-400"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatDate(b.createdAt)}
                        </div>
                      </td>

                      {/* Vehicle & Host */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {b.car ? `${b.car.make} ${b.car.model}` : 'Vehicle Missing'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Host: {b.host?.name || 'Unknown'}
                        </div>
                      </td>

                      {/* Renter */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {b.renter?.name || 'Renter'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.renter?.email || b.renterId}
                        </div>
                      </td>

                      {/* Rental Window */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {formatDate(b.startDate)} &rarr; {formatDate(b.endDate)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.totalDays || b.days || 1} rental days
                        </div>
                      </td>

                      {/* Fee */}
                      <td className="py-3.5 px-4 text-right font-semibold text-amber-400">
                        {formatETB(fee)}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-white text-sm">
                        {formatETB(gross)}
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={b.status} type="booking" />
                        {b.dispute && (
                          <Link href={`/admin/disputes`}>
                            <span className="block text-[10px] text-rose-400 font-semibold underline mt-0.5">
                              Disputed #{b.dispute.id.slice(-4)}
                            </span>
                          </Link>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={b.paymentStatus || 'pending'} />
                        {b.payoutStatus && (
                          <span className="block text-[10px] text-slate-400 mt-0.5 capitalize">
                            Payout: {b.payoutStatus.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Modal */}
                          <button
                            onClick={() => setInspectBooking(b)}
                            title="Inspect Booking & Payment Audit"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Start Rental */}
                          {isConfirmed && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleStartRental(b.id)}
                              className="bg-purple-600 hover:bg-purple-500 py-1 px-2 text-xs font-semibold"
                              title="Start rental (keys handed over)"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Start
                            </Button>
                          )}

                          {/* Complete Rental */}
                          {isInProgress && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleCompleteRental(b.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 py-1 px-2 text-xs font-semibold"
                              title="Complete rental (vehicle returned)"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          )}

                          {/* Cancel Booking */}
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCancelModalBooking(b)}
                              className="text-xs text-rose-400 border-rose-500/40 hover:bg-rose-500/10 py-1 px-2"
                              title="Cancel reservation"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          )}

                          {/* Mock Refund */}
                          {canRefund && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRefundModalBooking(b)}
                              className="text-xs text-amber-400 border-amber-500/40 hover:bg-amber-500/10 py-1 px-2"
                              title="Simulate TeleBirr refund"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-950 border-t border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredBookings.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                className="text-slate-400"
              />
            </div>
          )}
        </div>
      )}

      {/* Inspect Booking Modal */}
      <Modal
        isOpen={!!inspectBooking}
        onClose={() => setInspectBooking(null)}
        title={`Booking Dossier: #${inspectBooking?.id}`}
      >
        {inspectBooking && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Conflict Banner if any */}
            {inspectBooking.hasConflict && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Schedule Overlap Conflict Detected!</div>
                  <div className="text-[11px] text-amber-300/90 mt-0.5">
                    This vehicle is also scheduled in booking{' '}
                    <span className="font-mono font-bold">
                      #{inspectBooking.conflictingBookings[0]?.id.slice(-6)}
                    </span>{' '}
                    between {formatDate(inspectBooking.conflictingBookings[0]?.startDate)} and{' '}
                    {formatDate(inspectBooking.conflictingBookings[0]?.endDate)}. Revalidate availability or cancel one reservation.
                  </div>
                </div>
              </div>
            )}

            {/* Parties Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-rose-500" />
                  Renter
                </div>
                <div className="font-semibold text-slate-900">{inspectBooking.renter?.name || 'Unknown'}</div>
                <div className="text-slate-500 text-[11px]">{inspectBooking.renter?.email}</div>
                <div className="text-slate-500 text-[11px]">{inspectBooking.renter?.phone || '+251 91 123 4567'}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  Host
                </div>
                <div className="font-semibold text-slate-900">{inspectBooking.host?.name || 'Unknown'}</div>
                <div className="text-slate-500 text-[11px]">{inspectBooking.host?.email}</div>
                <div className="text-slate-500 text-[11px]">{inspectBooking.host?.phone || '+251 91 234 5678'}</div>
              </div>
            </div>

            {/* Vehicle & Dates */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  {inspectBooking.car ? `${inspectBooking.car.make} ${inspectBooking.car.model} (${inspectBooking.car.year})` : 'Vehicle'}
                </span>
                <span className="text-slate-500">{inspectBooking.car?.neighbourhood}</span>
              </div>
              <div className="text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200">
                <span>Trip Period:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(inspectBooking.startDate)} &rarr; {formatDate(inspectBooking.endDate)} ({inspectBooking.totalDays || inspectBooking.days} days)
                </span>
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Financial Calculation (ETB)
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Daily Rental Rate:</span>
                <span>{formatETB(inspectBooking.car?.pricePerDay || 0)} / day</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({inspectBooking.totalDays || inspectBooking.days} days):</span>
                <span>{formatETB(inspectBooking.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-amber-600 font-semibold">
                <span>Platform Commission (10%):</span>
                <span>{formatETB(inspectBooking.platformFee || inspectBooking.fee || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Host Net Payout:</span>
                <span>{formatETB(inspectBooking.hostEarnings || ((inspectBooking.totalAmount || inspectBooking.total) - (inspectBooking.platformFee || inspectBooking.fee)))}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-slate-200">
                <span>Gross Total Billed:</span>
                <span className="text-emerald-600">{formatETB(inspectBooking.totalAmount || inspectBooking.total)}</span>
              </div>
            </div>

            {/* Payment Simulation Audit */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800 mb-1">Payment & Payout Simulation Trail</div>
              <div className="text-slate-600 flex justify-between">
                <span>Payment State:</span>
                <StatusBadge status={inspectBooking.paymentStatus} />
              </div>
              <div className="text-slate-600 flex justify-between font-mono text-[11px]">
                <span>TeleBirr Mock Ref:</span>
                <span>{inspectBooking.paymentRef || 'N/A'}</span>
              </div>
              {inspectBooking.refundRef && (
                <div className="text-amber-700 flex justify-between font-mono text-[11px]">
                  <span>Refund Ref:</span>
                  <span>{inspectBooking.refundRef}</span>
                </div>
              )}
              {inspectBooking.payoutRef && (
                <div className="text-emerald-700 flex justify-between font-mono text-[11px]">
                  <span>Host Payout Ref:</span>
                  <span>{inspectBooking.payoutRef}</span>
                </div>
              )}
              {inspectBooking.cancellationReason && (
                <div className="text-rose-700 pt-1 text-[11px]">
                  <span className="font-bold">Cancellation Reason:</span> {inspectBooking.cancellationReason}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <Link href={`/bookings/${inspectBooking.id}`} target="_blank">
                <Button variant="outline" size="sm" className="text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Public Receipt
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setInspectBooking(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={!!cancelModalBooking}
        onClose={() => setCancelModalBooking(null)}
        title={`Cancel Booking #${cancelModalBooking?.id}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling this booking will release the reserved dates for the vehicle. If the renter has paid via mock TeleBirr, a simulated refund will be generated.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Host emergency request, date clash resolution, or renter verified cancellation request..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCancelModalBooking(null)}>
              Dismiss
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={loading}
              onClick={handleConfirmCancel}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Process Refund Modal */}
      <Modal
        isOpen={!!refundModalBooking}
        onClose={() => setRefundModalBooking(null)}
        title={`Simulate TeleBirr Refund: #${refundModalBooking?.id}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Issue simulated refund of{' '}
            <span className="font-bold text-slate-800">
              {formatETB(refundModalBooking?.totalAmount || refundModalBooking?.total || 0)}
            </span>{' '}
            back to the renter. A mock transaction reference (RF-DEMO-XXXXX) will be logged.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Refund Justification *
            </label>
            <textarea
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Dispute resolution settlement, vehicle breakdown compensation, or pre-trip cancellation..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRefundModalBooking(null)}>
              Dismiss
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleConfirmRefund}
              className="bg-amber-600 hover:bg-amber-500"
            >
              Issue Mock Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
