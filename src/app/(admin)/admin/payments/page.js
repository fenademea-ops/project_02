'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import {
  CreditCard,
  Search,
  Download,
  Filter,
  DollarSign,
  ArrowUpRight,
  RotateCcw,
  CheckCircle,
  Eye,
  AlertCircle,
  User,
  ShieldCheck,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const {
    bookings,
    cars,
    users,
    adminProcessPayoutAction,
    adminProcessRefundAction,
    showToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [payoutFilter, setPayoutFilter] = useState('all');

  // Modals
  const [inspectBooking, setInspectBooking] = useState(null);
  const [refundBooking, setRefundBooking] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [payoutConfirmBooking, setPayoutConfirmBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  // Financial Ledger Rows
  const ledgerRows = useMemo(() => {
    return bookings.map((b) => {
      const car = cars.find((c) => c.id === b.carId);
      const renter = users.find((u) => u.id === b.renterId);
      const host = users.find((u) => u.id === b.ownerId);

      const gross = b.totalAmount || b.total || 0;
      const commission = b.platformFee || b.fee || 0;
      const hostNet = b.hostEarnings || (gross - commission);

      return {
        ...b,
        car,
        renter,
        host,
        gross,
        commission,
        hostNet,
      };
    });
  }, [bookings, cars, users]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let grossTotal = 0;
    let commissionTotal = 0;
    let hostNetTotal = 0;
    let pendingPayoutsTotal = 0;
    let refundedTotal = 0;

    ledgerRows.forEach((r) => {
      if (r.paymentStatus === 'paid_mock') {
        grossTotal += r.gross;
        commissionTotal += r.commission;
        hostNetTotal += r.hostNet;
      }
      if (r.payoutStatus === 'payout_pending') {
        pendingPayoutsTotal += r.hostNet;
      }
      if (r.paymentStatus === 'refunded_mock') {
        refundedTotal += r.gross;
      }
    });

    return {
      grossTotal,
      commissionTotal,
      hostNetTotal,
      pendingPayoutsTotal,
      refundedTotal,
    };
  }, [ledgerRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return ledgerRows.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${r.id} ${r.paymentRef || ''} ${r.payoutRef || ''} ${r.refundRef || ''} ${r.car?.make} ${r.car?.model} ${r.renter?.name} ${r.host?.name}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (paymentFilter !== 'all' && r.paymentStatus !== paymentFilter) {
        return false;
      }

      if (payoutFilter !== 'all') {
        if (payoutFilter === 'payout_pending' && r.payoutStatus !== 'payout_pending') return false;
        if (payoutFilter === 'paid_out' && r.payoutStatus !== 'paid_out') return false;
        if (payoutFilter === 'none' && r.payoutStatus) return false;
      }

      return true;
    });
  }, [ledgerRows, searchQuery, paymentFilter, payoutFilter]);

  // Handlers
  const handleConfirmPayout = () => {
    if (!payoutConfirmBooking) return;
    setLoading(true);
    const res = adminProcessPayoutAction(payoutConfirmBooking.id);
    setLoading(false);
    if (res.success) {
      setPayoutConfirmBooking(null);
    }
  };

  const handleConfirmRefund = () => {
    if (!refundBooking) return;
    if (!refundReason.trim()) {
      showToast('A refund justification is required', 'error');
      return;
    }
    setLoading(true);
    const res = adminProcessRefundAction(refundBooking.id, refundReason.trim());
    setLoading(false);
    if (res.success) {
      setRefundBooking(null);
      setRefundReason('');
    }
  };

  const handleExportCSV = () => {
    const rows = filteredRows.map((r) => ({
      BookingID: r.id,
      PaymentRef: r.paymentRef || 'N/A',
      PayoutRef: r.payoutRef || 'N/A',
      RefundRef: r.refundRef || 'N/A',
      Renter: r.renter?.name || 'Unknown',
      Host: r.host?.name || 'Unknown',
      Vehicle: r.car ? `${r.car.make} ${r.car.model}` : 'Unknown',
      GrossBilled_ETB: r.gross,
      PlatformFee_ETB: r.commission,
      HostNetEarnings_ETB: r.hostNet,
      PaymentStatus: r.paymentStatus || 'pending',
      PayoutStatus: r.payoutStatus || 'none',
      BookingStatus: r.status,
      Timestamp: r.createdAt || '',
    }));

    exportToCSV(rows, sanitizeFileName(`sheggar_financial_ledger_${new Date().toISOString().slice(0, 10)}`));
    showToast('Financial ledger exported to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-rose-500" />
            Financial Ledger & Payouts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulated TeleBirr collections, 10% marketplace commission, host net settlements, and demo reversal workflows.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Ledger CSV ({filteredRows.length})
        </Button>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Gross Billed (GMV)
          </span>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {formatETB(summaryMetrics.grossTotal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Simulated TeleBirr collected</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Platform Take (10%)
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
            {formatETB(summaryMetrics.commissionTotal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Marketplace commission</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Host Net Earnings
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
            {formatETB(summaryMetrics.hostNetTotal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">90% payable to owners</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Pending Payouts
          </span>
          <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">
            {formatETB(summaryMetrics.pendingPayoutsTotal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Awaiting host disbursement</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Mock Refunds
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
            {formatETB(summaryMetrics.refundedTotal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Cancelled / dispute credits</span>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by TeleBirr ref, Payout ref, booking ID, host, renter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Payment filter */}
          <div className="md:col-span-3">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Payment States</option>
              <option value="paid_mock">Paid (Mock TeleBirr)</option>
              <option value="pending">Pending Payment</option>
              <option value="refunded_mock">Refunded (Mock)</option>
            </select>
          </div>

          {/* Payout filter */}
          <div className="md:col-span-3">
            <select
              value={payoutFilter}
              onChange={(e) => setPayoutFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Payout States</option>
              <option value="payout_pending">Pending Payout</option>
              <option value="paid_out">Paid Out (Disbursed)</option>
              <option value="none">Not Eligible / Pre-trip</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {filteredRows.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Try broadening your search term or clearing active filters."
          className="bg-slate-900 border-slate-800 text-slate-300 py-12"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="table-responsive">`n            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Payment Ref / Booking</th>
                  <th className="py-3.5 px-4">Renter</th>
                  <th className="py-3.5 px-4">Car & Host</th>
                  <th className="py-3.5 px-4 text-right">Gross (ETB)</th>
                  <th className="py-3.5 px-4 text-right">Fee (10%)</th>
                  <th className="py-3.5 px-4 text-right">Host Net</th>
                  <th className="py-3.5 px-4 text-center">Collection</th>
                  <th className="py-3.5 px-4 text-center">Payout</th>
                  <th className="py-3.5 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredRows.map((r) => {
                  const canPayout = r.payoutStatus === 'payout_pending';
                  const canRefund = r.paymentStatus === 'paid_mock' && ['cancelled', 'disputed', 'declined'].includes(r.status);

                  return (
                    <tr key={r.id} className="hover:bg-slate-850/60 transition-colors">
                      {/* Refs */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white">
                          {r.paymentRef || (
                            <span className="text-slate-500 font-normal italic">Unpaid</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Booking #{r.id.slice(-6)} • {formatDate(r.createdAt)}
                        </div>
                      </td>

                      {/* Renter */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {r.renter?.name || 'Renter'}
                        </div>
                        <div className="text-[11px] text-slate-400">{r.renter?.email}</div>
                      </td>

                      {/* Car & Host */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {r.car ? `${r.car.make} ${r.car.model}` : 'Unknown'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Host: {r.host?.name || 'Unknown'}
                        </div>
                      </td>

                      {/* Gross */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-white">
                        {formatETB(r.gross)}
                      </td>

                      {/* Commission */}
                      <td className="py-3.5 px-4 text-right font-semibold text-amber-400">
                        {formatETB(r.commission)}
                      </td>

                      {/* Host Net */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {formatETB(r.hostNet)}
                      </td>

                      {/* Collection Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={r.paymentStatus || 'pending'} />
                        {r.refundRef && (
                          <span className="block text-[10px] text-amber-400 font-mono mt-0.5">
                            {r.refundRef}
                          </span>
                        )}
                      </td>

                      {/* Payout Status */}
                      <td className="py-3.5 px-4 text-center">
                        {r.payoutStatus ? (
                          <>
                            <StatusBadge status={r.payoutStatus} />
                            {r.payoutRef && (
                              <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                                {r.payoutRef}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Modal */}
                          <button
                            onClick={() => setInspectBooking(r)}
                            title="Inspect Transaction Details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Process Payout */}
                          {canPayout && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setPayoutConfirmBooking(r)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1 px-2 font-semibold"
                            >
                              <ArrowUpRight className="w-3 h-3 mr-1" />
                              Disburse
                            </Button>
                          )}

                          {/* Process Refund */}
                          {canRefund && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRefundBooking(r)}
                              className="text-xs text-amber-400 border-amber-500/40 hover:bg-amber-500/10 py-1 px-2"
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
        </div>
      )}

      {/* Inspect Transaction Dossier Modal */}
      <Modal
        isOpen={!!inspectBooking}
        onClose={() => setInspectBooking(null)}
        title={`Transaction Dossier: #${inspectBooking?.id}`}
      >
        {inspectBooking && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Settlement Breakdown</span>
                <span className="font-mono text-xs text-slate-500">#{inspectBooking.id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Daily Rental Rate:</span>
                <span>{formatETB(inspectBooking.car?.pricePerDay || 0)} / day</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Days:</span>
                <span>{inspectBooking.totalDays || inspectBooking.days} days</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                <span>Gross Rental GMV:</span>
                <span>{formatETB(inspectBooking.gross)}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Platform Commission (10%):</span>
                <span>- {formatETB(inspectBooking.commission)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-emerald-600 text-sm pt-1 border-t border-slate-200">
                <span>Host Net Payable:</span>
                <span>{formatETB(inspectBooking.hostNet)}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 mb-1">Simulated Banking & TeleBirr Audit</div>
              <div className="flex justify-between text-slate-600">
                <span>Renter TeleBirr Mock Ref:</span>
                <span className="font-mono font-bold text-slate-800">{inspectBooking.paymentRef || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment State:</span>
                <StatusBadge status={inspectBooking.paymentStatus} />
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Host Payout State:</span>
                <StatusBadge status={inspectBooking.payoutStatus || 'none'} />
              </div>
              {inspectBooking.payoutRef && (
                <div className="flex justify-between text-emerald-700 font-mono">
                  <span>Host Disbursed Ref:</span>
                  <span className="font-bold">{inspectBooking.payoutRef}</span>
                </div>
              )}
              {inspectBooking.refundRef && (
                <div className="flex justify-between text-amber-700 font-mono">
                  <span>Renter Refund Ref:</span>
                  <span className="font-bold">{inspectBooking.refundRef}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Educational Demo Sandbox: No real TeleBirr account or Ethiopian bank account was debited.
                Transactions are mock states stored in browser localStorage.
              </span>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setInspectBooking(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disburse Host Payout Confirmation Modal */}
      <Modal
        isOpen={!!payoutConfirmBooking}
        onClose={() => setPayoutConfirmBooking(null)}
        title="Disburse Host Net Payout"
      >
        {payoutConfirmBooking && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Disburse simulated host earnings of{' '}
              <span className="font-bold text-emerald-600 text-sm">
                {formatETB(payoutConfirmBooking.hostNet)}
              </span>{' '}
              to <span className="font-bold text-slate-800">{payoutConfirmBooking.host?.name}</span> for completed rental{' '}
              <span className="font-mono font-bold">#{payoutConfirmBooking.id.slice(-6)}</span>.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Host Registered Phone:</span>
                <span className="font-semibold text-slate-800">{payoutConfirmBooking.host?.phone || '+251 91 100 0000'}</span>
              </div>
              <div className="flex justify-between">
                <span>Vehicle:</span>
                <span className="font-semibold text-slate-800">
                  {payoutConfirmBooking.car?.make} {payoutConfirmBooking.car?.model}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setPayoutConfirmBooking(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                onClick={handleConfirmPayout}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Confirm Mock Payout
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal
        isOpen={!!refundBooking}
        onClose={() => setRefundBooking(null)}
        title={`Simulate Refund: #${refundBooking?.id}`}
      >
        {refundBooking && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Refund{' '}
              <span className="font-bold text-rose-600">
                {formatETB(refundBooking.gross)}
              </span>{' '}
              to renter <span className="font-bold text-slate-800">{refundBooking.renter?.name}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Refund Justification *
              </label>
              <textarea
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Host cancellation compensation, dispute settlement, or customer request..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setRefundBooking(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                onClick={handleConfirmRefund}
                className="bg-amber-600 hover:bg-amber-500"
              >
                Execute Mock Refund
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
