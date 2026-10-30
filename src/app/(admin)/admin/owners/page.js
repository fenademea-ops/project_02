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
  UserCheck,
  Search,
  Filter,
  Download,
  Eye,
  ShieldAlert,
  ShieldCheck,
  UserX,
  RotateCcw,
  Car,
  Calendar,
  DollarSign,
  AlertOctagon,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';

export default function AdminOwnersPage() {
  const { users, cars, bookings, disputes, updateUserStatusAction, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fleetFilter, setFleetFilter] = useState('all');
  const [sortBy, setSortBy] = useState('earnings_high');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [inspectOwner, setInspectOwner] = useState(null);
  const [suspendModalOwner, setSuspendModalOwner] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [reactivateModalOwner, setReactivateModalOwner] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter only users with 'owner' role and enrich them
  const enrichedOwners = useMemo(() => {
    return users
      .filter((u) => u.roles?.includes('owner'))
      .map((owner) => {
        const ownerCars = cars.filter((c) => c.ownerId === owner.id);
        const approvedCars = ownerCars.filter((c) => c.status === 'approved');
        const pendingCars = ownerCars.filter((c) => c.status === 'pending');
        const suspendedCars = ownerCars.filter((c) => c.status === 'suspended');

        const ownerBookings = bookings.filter(
          (b) => b.ownerId === owner.id || ownerCars.some((c) => c.id === b.carId)
        );

        const activeRentals = ownerBookings.filter((b) => b.status === 'in_progress');
        const completedRentals = ownerBookings.filter((b) => ['completed', 'reviewed'].includes(b.status));
        const pendingRequests = ownerBookings.filter((b) => b.status === 'requested');

        // Financials (Host earnings = subtotal)
        const grossEarnings = completedRentals.reduce((sum, b) => sum + (b.subtotal || 0), 0);
        const pendingPayouts = ownerBookings
          .filter((b) => b.payoutStatus === 'payout_pending' || (b.status === 'completed' && !b.payoutStatus))
          .reduce((sum, b) => sum + (b.subtotal || 0), 0);

        // Disputes
        const ownerDisputes = disputes.filter((d) =>
          ownerBookings.some((b) => b.id === d.bookingId)
        );

        return {
          ...owner,
          carsCount: ownerCars.length,
          approvedCarsCount: approvedCars.length,
          pendingCarsCount: pendingCars.length,
          suspendedCarsCount: suspendedCars.length,
          activeRentalsCount: activeRentals.length,
          completedRentalsCount: completedRentals.length,
          pendingRequestsCount: pendingRequests.length,
          grossEarnings,
          pendingPayouts,
          disputesCount: ownerDisputes.length,
          openDisputesCount: ownerDisputes.filter((d) => d.status === 'open').length,
          fleet: ownerCars,
          recentRentals: ownerBookings.slice(0, 5),
          isVerified: owner.status === 'active' && approvedCars.length > 0,
        };
      });
  }, [users, cars, bookings, disputes]);

  // Overall Owner Metrics
  const metrics = useMemo(() => {
    const total = enrichedOwners.length;
    const active = enrichedOwners.filter((o) => o.status === 'active').length;
    const suspended = enrichedOwners.filter((o) => o.status === 'suspended').length;
    const totalVehicles = enrichedOwners.reduce((sum, o) => sum + o.carsCount, 0);
    const totalPayouts = enrichedOwners.reduce((sum, o) => sum + o.grossEarnings, 0);

    return { total, active, suspended, totalVehicles, totalPayouts };
  }, [enrichedOwners]);

  // Filtered & Searched Owners
  const filteredOwners = useMemo(() => {
    return enrichedOwners.filter((owner) => {
      if (statusFilter === 'active' && owner.status !== 'active') return false;
      if (statusFilter === 'suspended' && owner.status !== 'suspended') return false;
      if (statusFilter === 'has_pending' && owner.pendingCarsCount === 0 && owner.pendingRequestsCount === 0) return false;
      if (statusFilter === 'disputed' && owner.disputesCount === 0) return false;

      if (fleetFilter === 'single' && owner.carsCount !== 1) return false;
      if (fleetFilter === 'multi' && owner.carsCount <= 1) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = owner.name?.toLowerCase().includes(q);
        const matchesEmail = owner.email?.toLowerCase().includes(q);
        const matchesPhone = owner.phone?.toLowerCase().includes(q);
        const matchesCity = owner.neighbourhood?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedOwners, statusFilter, fleetFilter, searchQuery]);

  // Sorted Owners
  const sortedOwners = useMemo(() => {
    const list = [...filteredOwners];
    if (sortBy === 'earnings_high') {
      list.sort((a, b) => b.grossEarnings - a.grossEarnings);
    } else if (sortBy === 'fleet_large') {
      list.sort((a, b) => b.carsCount - a.carsCount);
    } else if (sortBy === 'rentals_high') {
      list.sort((a, b) => b.completedRentalsCount - a.completedRentalsCount);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [filteredOwners, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedOwners.length / pageSize) || 1;
  const paginatedOwners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOwners.slice(start, start + pageSize);
  }, [sortedOwners, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Owner ID',
      'Name',
      'Email',
      'Phone',
      'Neighbourhood',
      'Status',
      'Total Fleet',
      'Approved Cars',
      'Active Rentals',
      'Completed Trips',
      'Gross Recorded Earnings (ETB)',
      'Pending Payouts (ETB)',
      'Disputes Count',
      'Member Since',
    ];

    const rows = filteredOwners.map((o) => [
      o.id,
      o.name,
      o.email,
      o.phone || '',
      o.neighbourhood || 'Addis Ababa',
      o.status,
      o.carsCount,
      o.approvedCarsCount,
      o.activeRentalsCount,
      o.completedRentalsCount,
      o.grossEarnings,
      o.pendingPayouts,
      o.disputesCount,
      formatDate(o.createdAt),
    ]);

    exportToCSV(`sheggar_car_owners_${sanitizeFileName(statusFilter)}`, headers, rows);
    showToast(`Exported ${filteredOwners.length} owners to CSV`, 'success');
  };

  // Actions
  const handleConfirmSuspend = () => {
    if (!suspendModalOwner) return;
    if (!suspendReason.trim()) {
      showToast('A suspension reason is required', 'error');
      return;
    }
    setActionLoading(true);
    const res = updateUserStatusAction(suspendModalOwner.id, 'suspended');
    setActionLoading(false);
    if (res.success) {
      setSuspendModalOwner(null);
      setSuspendReason('');
    }
  };

  const handleConfirmReactivate = () => {
    if (!reactivateModalOwner) return;
    setActionLoading(true);
    const res = updateUserStatusAction(reactivateModalOwner.id, 'active');
    setActionLoading(false);
    if (res.success) {
      setReactivateModalOwner(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Car Owner Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage host accounts, verify fleet listings, oversee recorded owner earnings, and enforce marketplace governance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={handleExportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV ({filteredOwners.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 mb-1">Total Owners</div>
          <div className="text-xl sm:text-2xl font-bold text-white">{metrics.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Registered marketplace hosts</div>
        </div>

        <div className="p-4 bg-slate-900 border border-emerald-900/40 rounded-2xl">
          <div className="text-xs text-emerald-400 mb-1">Active Hosts</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{metrics.active}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">In good standing</div>
        </div>

        <div className="p-4 bg-slate-900 border border-rose-900/40 rounded-2xl">
          <div className="text-xs text-rose-400 mb-1">Suspended Hosts</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400">{metrics.suspended}</div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">Access restricted</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 mb-1">Total Listed Fleet</div>
          <div className="text-xl sm:text-2xl font-bold text-white">{metrics.totalVehicles}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Vehicles on platform</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 mb-1">Total Host Payouts</div>
          <div className="text-base sm:text-lg font-bold text-emerald-400 truncate">
            {formatETB(metrics.totalPayouts)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Settled net earnings</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `All Owners (${metrics.total})` },
            { id: 'active', label: `Active (${metrics.active})` },
            { id: 'has_pending', label: 'Needs Review' },
            { id: 'disputed', label: 'With Disputes' },
            { id: 'suspended', label: `Suspended (${metrics.suspended})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-rose-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by owner name, email, phone, or neighborhood..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <select
              value={fleetFilter}
              onChange={(e) => {
                setFleetFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Fleet Sizes</option>
              <option value="single">Single Vehicle Host (1 Car)</option>
              <option value="multi">Fleet Host (2+ Cars)</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="earnings_high">Highest Earnings (ETB)</option>
              <option value="fleet_large">Largest Fleet First</option>
              <option value="rentals_high">Most Completed Trips</option>
              <option value="newest">Recently Registered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Owners Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {sortedOwners.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No car owners found"
              description="No owner records match your selected filter or search term."
              actionLabel="Reset Search"
              onAction={() => {
                setStatusFilter('all');
                setFleetFilter('all');
                setSearchQuery('');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Host Profile</th>
                  <th className="py-3.5 px-4">Contact & Location</th>
                  <th className="py-3.5 px-4">Fleet Portfolio</th>
                  <th className="py-3.5 px-4">Rent-Out Volume</th>
                  <th className="py-3.5 px-4">Recorded Earnings</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedOwners.map((owner) => {
                  return (
                    <tr
                      key={owner.id}
                      className="hover:bg-slate-850/60 transition-colors group"
                    >
                      {/* Host Profile */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                            {owner.name?.charAt(0) || 'H'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{owner.name}</span>
                              {owner.isVerified && (
                                <span className="inline-flex items-center text-emerald-400" title="Verified Host">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ID: {owner.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[150px]">{owner.email}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{owner.neighbourhood || 'Addis Ababa'}</span>
                        </div>
                      </td>

                      {/* Fleet Portfolio */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-white">
                          {owner.carsCount} Car{owner.carsCount !== 1 ? 's' : ''} Listed
                        </div>
                        <div className="text-[10px] text-slate-400 space-x-1.5 mt-0.5">
                          <span className="text-emerald-400 font-medium">
                            {owner.approvedCarsCount} approved
                          </span>
                          {owner.pendingCarsCount > 0 && (
                            <span className="text-amber-400 font-medium">
                              • {owner.pendingCarsCount} pending
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rent-out volume */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="text-slate-200 font-medium">
                          {owner.completedRentalsCount} completed trip{owner.completedRentalsCount !== 1 ? 's' : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {owner.activeRentalsCount > 0 ? (
                            <span className="text-emerald-400 font-semibold">
                              ● {owner.activeRentalsCount} on road now
                            </span>
                          ) : (
                            <span>0 active</span>
                          )}
                        </div>
                      </td>

                      {/* Recorded Earnings */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-bold text-emerald-400">
                          {formatETB(owner.grossEarnings)}
                        </div>
                        {owner.pendingPayouts > 0 && (
                          <div className="text-[10px] text-amber-400 mt-0.5">
                            {formatETB(owner.pendingPayouts)} pending payout
                          </div>
                        )}
                      </td>

                      {/* Account status */}
                      <td className="py-3.5 px-4 align-top">
                        <StatusBadge status={owner.status} />
                        {owner.openDisputesCount > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <AlertOctagon className="w-2.5 h-2.5" />
                              {owner.openDisputesCount} dispute open
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectOwner(owner)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="View Host Profile & Fleet"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {owner.status === 'active' ? (
                            <button
                              onClick={() => {
                                setSuspendModalOwner(owner);
                                setSuspendReason('');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-950/60 rounded-md border border-rose-800/40 transition-colors cursor-pointer flex items-center gap-1"
                              title="Suspend Owner Account"
                            >
                              <UserX className="w-3 h-3" />
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => setReactivateModalOwner(owner)}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-950/60 rounded-md border border-emerald-800/40 transition-colors cursor-pointer flex items-center gap-1"
                              title="Reactivate Owner Account"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedOwners.length)} of {sortedOwners.length} owners
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* 1. Host Detail Modal */}
      {inspectOwner && (
        <Modal
          isOpen={!!inspectOwner}
          onClose={() => setInspectOwner(null)}
          title={`Owner Profile — ${inspectOwner.name}`}
        >
          <div className="space-y-6 text-xs text-slate-200">
            {/* Header info */}
            <div className="flex items-start justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {inspectOwner.name?.charAt(0) || 'H'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span>{inspectOwner.name}</span>
                    {inspectOwner.isVerified && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Verified Host
                      </span>
                    )}
                  </h3>
                  <div className="text-slate-400 text-xs mt-0.5">
                    {inspectOwner.email} • {inspectOwner.phone || '+251 91 123 4567'}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Location: {inspectOwner.neighbourhood || 'Addis Ababa'} • Member since: {formatDate(inspectOwner.createdAt)}
                  </div>
                </div>
              </div>
              <StatusBadge status={inspectOwner.status} />
            </div>

            {/* Financials & Volume Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Listed Fleet</span>
                <span className="text-lg font-bold text-white">{inspectOwner.carsCount}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Completed Trips</span>
                <span className="text-lg font-bold text-white">{inspectOwner.completedRentalsCount}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Total Recorded Earnings</span>
                <span className="text-sm font-bold text-emerald-400 block mt-1 truncate">
                  {formatETB(inspectOwner.grossEarnings)}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Disputes</span>
                <span className={`text-lg font-bold ${inspectOwner.disputesCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {inspectOwner.disputesCount}
                </span>
              </div>
            </div>

            {/* Fleet List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                  Registered Vehicles ({inspectOwner.fleet.length})
                </h4>
                <Link
                  href={`/admin/listings?owner=${inspectOwner.id}`}
                  className="text-rose-400 hover:text-rose-300 text-xs font-medium"
                >
                  Manage Listings →
                </Link>
              </div>

              {inspectOwner.fleet.length === 0 ? (
                <p className="text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                  No vehicles listed by this owner yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {inspectOwner.fleet.map((car) => (
                    <div
                      key={car.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-10 h-8 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                          <CarImageFallback src={car.photos?.[0]} alt={car.model} fill />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {car.make} {car.model} ({car.year})
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatETB(car.pricePerDay)}/day • {car.neighbourhood}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={car.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setInspectOwner(null)}>
                Close Window
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Suspend Owner Modal */}
      {suspendModalOwner && (
        <Modal
          isOpen={!!suspendModalOwner}
          onClose={() => setSuspendModalOwner(null)}
          title={`Suspend Host Account — ${suspendModalOwner.name}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p className="text-rose-400 font-semibold">
              Restricting an owner account prevents them from adding new listings or accepting new rentals.
            </p>
            <p>
              Existing past rental records, vehicle history, and booking receipts remain preserved for audit compliance.
            </p>
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Administrative Reason for Suspension <span className="text-rose-400">*</span>:
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Unresponsive to active customer dispute #dispute-1; failed to provide vehicle insurance verification."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 h-24"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSuspendModalOwner(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmSuspend} disabled={actionLoading}>
                {actionLoading ? 'Suspending...' : 'Confirm Account Suspension'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Reactivate Owner Modal */}
      {reactivateModalOwner && (
        <Modal
          isOpen={!!reactivateModalOwner}
          onClose={() => setReactivateModalOwner(null)}
          title={`Reactivate Host Account — ${reactivateModalOwner.name}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p>
              Reactivating <strong className="text-white">{reactivateModalOwner.name}</strong> will restore full access to their host console and permit vehicle listings.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setReactivateModalOwner(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmReactivate} disabled={actionLoading}>
                {actionLoading ? 'Reactivating...' : 'Reactivate Host'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
