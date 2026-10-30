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
import { validateDateRange, isCarAvailableForDates } from '@/lib/validation';
import {
  KeyRound,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  AlertTriangle,
  Clock,
  Car,
  User,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  MessageSquare,
  AlertOctagon,
  Sparkles,
  Check,
} from 'lucide-react';

export default function RentOutManagementPage() {
  const {
    bookings,
    cars,
    users,
    disputes,
    adminCreateBookingAction,
    adminConfirmBookingAction,
    adminDeclineBookingAction,
    adminStartBookingAction,
    adminCompleteBookingAction,
    adminCancelBookingAction,
    adminAddBookingNoteAction,
    showToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [neighbourhoodFilter, setNeighbourhoodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [inspectAgreement, setInspectAgreement] = useState(null);
  const [confirmModalRental, setConfirmModalRental] = useState(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [declineModalRental, setDeclineModalRental] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [handoverModalRental, setHandoverModalRental] = useState(null);
  const [returnModalRental, setReturnModalRental] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Clean / No damage');
  const [cancelModalRental, setCancelModalRental] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [noteModalRental, setNoteModalRental] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create / Record Rent-Out state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    carId: '',
    renterType: 'existing',
    renterId: '',
    walkinName: '',
    walkinPhone: '',
    walkinEmail: '',
    startDate: '',
    endDate: '',
    status: 'confirmed',
    paymentStatus: 'paid_mock',
    paymentMethod: 'TeleBirr Demo',
    notes: '',
  });
  const [createError, setCreateError] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Eligible cars & renters for manual rent-out agreement
  const approvedCars = useMemo(() => {
    return cars.filter((c) => c.status === 'approved');
  }, [cars]);

  const registeredRenters = useMemo(() => {
    return users.filter((u) => u.roles?.includes('renter') || !u.roles?.includes('admin'));
  }, [users]);

  const selectedCar = useMemo(() => {
    return cars.find((c) => c.id === createForm.carId) || null;
  }, [cars, createForm.carId]);

  const dateValidation = useMemo(() => {
    if (!createForm.startDate || !createForm.endDate) {
      return { valid: false, days: 0, error: 'Please choose both dates' };
    }
    return validateDateRange(createForm.startDate, createForm.endDate);
  }, [createForm.startDate, createForm.endDate]);

  const availabilityCheck = useMemo(() => {
    if (!selectedCar || !dateValidation.valid) {
      return { available: false, reason: 'Select vehicle and valid date range' };
    }
    return isCarAvailableForDates(
      selectedCar.id,
      createForm.startDate,
      createForm.endDate,
      bookings,
      selectedCar.unavailableDates || []
    );
  }, [selectedCar, dateValidation, createForm.startDate, createForm.endDate, bookings]);

  const estimatedPricing = useMemo(() => {
    if (!selectedCar || !dateValidation.valid) {
      return { days: 0, pricePerDay: 0, subtotal: 0, fee: 0, total: 0 };
    }
    const days = dateValidation.days;
    const pricePerDay = selectedCar.pricePerDay || 0;
    const subtotal = days * pricePerDay;
    const fee = Math.round(subtotal * 0.1);
    const total = subtotal + fee;
    return { days, pricePerDay, subtotal, fee, total };
  }, [selectedCar, dateValidation]);

  // Enrich rental agreements with related data
  const enrichedRentals = useMemo(() => {
    return bookings.map((b) => {
      const car = cars.find((c) => c.id === b.carId);
      const owner = users.find((u) => u.id === b.ownerId || u.id === car?.ownerId);
      const renter = users.find((u) => u.id === b.renterId);
      const activeDispute = disputes.find((d) => d.bookingId === b.id && d.status === 'open');

      const isOverdue =
        b.status === 'in_progress' && b.endDate < todayStr;

      // Status group helper
      let lifecycleState = b.status;
      if (isOverdue) lifecycleState = 'overdue';

      return {
        ...b,
        car,
        owner,
        renter,
        isOverdue,
        activeDispute,
        lifecycleState,
        registrationRef: car?.plateNumber || `ET-${b.carId?.slice(-4).toUpperCase() || 'AA'}`,
      };
    });
  }, [bookings, cars, users, disputes, todayStr]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = enrichedRentals.length;
    const active = enrichedRentals.filter((r) => r.status === 'in_progress').length;
    const confirmed = enrichedRentals.filter((r) => r.status === 'confirmed').length;
    const pending = enrichedRentals.filter((r) => r.status === 'requested').length;
    const overdue = enrichedRentals.filter((r) => r.isOverdue).length;
    const completed = enrichedRentals.filter((r) => ['completed', 'reviewed'].includes(r.status)).length;
    const disputed = enrichedRentals.filter((r) => ['disputed', 'resolved'].includes(r.status) || r.activeDispute).length;

    const totalGrossETB = enrichedRentals
      .filter((r) => !['cancelled', 'declined'].includes(r.status))
      .reduce((sum, r) => sum + (r.total || 0), 0);

    return { total, active, confirmed, pending, overdue, completed, disputed, totalGrossETB };
  }, [enrichedRentals]);

  // Unique neighborhoods from cars
  const neighbourhoods = useMemo(() => {
    const set = new Set();
    cars.forEach((c) => {
      if (c.neighbourhood) set.add(c.neighbourhood);
    });
    return Array.from(set).sort();
  }, [cars]);

  // Filtered & Searched Rentals
  const filteredRentals = useMemo(() => {
    return enrichedRentals.filter((rental) => {
      // Status Filter
      if (statusFilter === 'active' && rental.status !== 'in_progress') return false;
      if (statusFilter === 'confirmed' && rental.status !== 'confirmed') return false;
      if (statusFilter === 'requested' && rental.status !== 'requested') return false;
      if (statusFilter === 'overdue' && !rental.isOverdue) return false;
      if (statusFilter === 'completed' && !['completed', 'reviewed'].includes(rental.status)) return false;
      if (statusFilter === 'disputed' && !['disputed', 'resolved'].includes(rental.status) && !rental.activeDispute) return false;
      if (statusFilter === 'cancelled' && !['cancelled', 'declined'].includes(rental.status)) return false;

      // Neighbourhood Filter
      if (neighbourhoodFilter !== 'all' && rental.car?.neighbourhood !== neighbourhoodFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = rental.id.toLowerCase().includes(q);
        const matchesCar = `${rental.car?.make} ${rental.car?.model}`.toLowerCase().includes(q);
        const matchesOwner = rental.owner?.name?.toLowerCase().includes(q);
        const matchesRenter = rental.renter?.name?.toLowerCase().includes(q);
        const matchesPlate = rental.registrationRef?.toLowerCase().includes(q);
        if (!matchesId && !matchesCar && !matchesOwner && !matchesRenter && !matchesPlate) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedRentals, statusFilter, neighbourhoodFilter, searchQuery]);

  // Sorted Rentals
  const sortedRentals = useMemo(() => {
    const list = [...filteredRentals];
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt || a.startDate) - new Date(b.createdAt || b.startDate));
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => (b.total || 0) - (a.total || 0));
    } else if (sortBy === 'price_low') {
      list.sort((a, b) => (a.total || 0) - (b.total || 0));
    }
    return list;
  }, [filteredRentals, sortBy]);

  // Paginated rentals
  const totalPages = Math.ceil(sortedRentals.length / pageSize) || 1;
  const paginatedRentals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRentals.slice(start, start + pageSize);
  }, [sortedRentals, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Agreement ID',
      'Car Make',
      'Car Model',
      'Plate/Registration',
      'Owner Name',
      'Owner Email',
      'Renter Name',
      'Renter Email',
      'Start Date',
      'End Date',
      'Days',
      'Price Per Day (ETB)',
      'Subtotal (ETB)',
      'Platform Fee (ETB)',
      'Total Price (ETB)',
      'Payment Status',
      'Rental Status',
      'Is Overdue',
    ];

    const rows = filteredRentals.map((r) => [
      r.id,
      r.car?.make || '',
      r.car?.model || '',
      r.registrationRef || '',
      r.owner?.name || '',
      r.owner?.email || '',
      r.renter?.name || '',
      r.renter?.email || '',
      r.startDate,
      r.endDate,
      r.days,
      r.pricePerDay,
      r.subtotal,
      r.fee,
      r.total,
      r.paymentStatus || 'pending',
      r.status,
      r.isOverdue ? 'YES' : 'NO',
    ]);

    exportToCSV(`sheggar_rent_outs_${sanitizeFileName(statusFilter)}`, headers, rows);
    showToast(`Exported ${filteredRentals.length} rental agreements to CSV`, 'success');
  };

  // Handlers for Admin Actions
  const handleConfirmApproval = () => {
    if (!confirmModalRental) return;
    setActionLoading(true);
    const res = adminConfirmBookingAction(confirmModalRental.id, confirmNotes);
    setActionLoading(false);
    if (res.success) {
      setConfirmModalRental(null);
      setConfirmNotes('');
    }
  };

  const handleDeclineRequest = () => {
    if (!declineModalRental || !declineReason.trim()) {
      showToast('A decline explanation is required', 'error');
      return;
    }
    setActionLoading(true);
    const res = adminDeclineBookingAction(declineModalRental.id, declineReason);
    setActionLoading(false);
    if (res.success) {
      setDeclineModalRental(null);
      setDeclineReason('');
    }
  };

  const handleHandoverRental = () => {
    if (!handoverModalRental) return;
    setActionLoading(true);
    const res = adminStartBookingAction(handoverModalRental.id);
    setActionLoading(false);
    if (res.success) {
      setHandoverModalRental(null);
    }
  };

  const handleRecordReturn = () => {
    if (!returnModalRental) return;
    setActionLoading(true);
    if (returnCondition.trim()) {
      adminAddBookingNoteAction(returnModalRental.id, `Return Condition Inspection: ${returnCondition.trim()}`);
    }
    const res = adminCompleteBookingAction(returnModalRental.id);
    setActionLoading(false);
    if (res.success) {
      setReturnModalRental(null);
      setReturnCondition('Clean / No damage');
    }
  };

  const handleCancelRental = () => {
    if (!cancelModalRental || !cancelReason.trim()) {
      showToast('A cancellation explanation is required', 'error');
      return;
    }
    setActionLoading(true);
    const res = adminCancelBookingAction(cancelModalRental.id, cancelReason);
    setActionLoading(false);
    if (res.success) {
      setCancelModalRental(null);
      setCancelReason('');
    }
  };

  const handleSaveInternalNote = () => {
    if (!noteModalRental || !newNoteText.trim()) {
      showToast('Note cannot be empty', 'error');
      return;
    }
    setActionLoading(true);
    const res = adminAddBookingNoteAction(noteModalRental.id, newNoteText);
    setActionLoading(false);
    if (res.success) {
      setNoteModalRental(null);
      setNewNoteText('');
      if (inspectAgreement?.id === noteModalRental.id) {
        setInspectAgreement(res.booking);
      }
    }
  };

  const handleOpenCreateModal = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 4);

    const start = tomorrow.toISOString().split('T')[0];
    const end = threeDays.toISOString().split('T')[0];

    const defaultCar = approvedCars[0]?.id || '';
    const defaultRenter = registeredRenters[0]?.id || '';

    setCreateForm({
      carId: defaultCar,
      renterType: 'existing',
      renterId: defaultRenter,
      walkinName: '',
      walkinPhone: '',
      walkinEmail: '',
      startDate: start,
      endDate: end,
      status: 'confirmed',
      paymentStatus: 'paid_mock',
      paymentMethod: 'TeleBirr Demo',
      notes: '',
    });
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateRentOut = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCreateError('');

    if (!createForm.carId) {
      setCreateError('Please select a vehicle.');
      return;
    }

    if (createForm.renterType === 'existing' && !createForm.renterId) {
      setCreateError('Please select an existing customer account.');
      return;
    }

    if (createForm.renterType === 'walkin' && !createForm.walkinName.trim()) {
      setCreateError('Please provide the walk-in customer’s full name.');
      return;
    }

    if (!dateValidation.valid) {
      setCreateError(dateValidation.error || 'Please provide a valid date range.');
      return;
    }

    if (!availabilityCheck.available) {
      setCreateError(availabilityCheck.reason || 'This vehicle is not available for the selected dates.');
      return;
    }

    setActionLoading(true);
    const payload = {
      carId: createForm.carId,
      renterId: createForm.renterType === 'existing' ? createForm.renterId : undefined,
      renterName: createForm.renterType === 'walkin' ? createForm.walkinName.trim() : undefined,
      renterPhone: createForm.renterType === 'walkin' ? createForm.walkinPhone.trim() : undefined,
      renterEmail: createForm.renterType === 'walkin' ? createForm.walkinEmail.trim() : undefined,
      startDate: createForm.startDate,
      endDate: createForm.endDate,
      status: createForm.status,
      paymentStatus: createForm.paymentStatus,
      paymentMethod: createForm.paymentMethod,
      notes: createForm.notes,
    };

    const res = adminCreateBookingAction(payload);
    setActionLoading(false);

    if (res.success) {
      setIsCreateModalOpen(false);
      showToast(`Rent-Out Agreement #${res.booking.id} created successfully!`, 'success');
    } else {
      setCreateError(res.error || 'Failed to create rent-out agreement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Rent-Out Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Oversee vehicles rented out by hosts, manage custody handovers, inspect returns, and track active rental agreements.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={handleExportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV ({filteredRentals.length})
          </Button>
          <Button variant="primary" onClick={handleOpenCreateModal} className="text-xs">
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            + New Rent-Out Agreement
          </Button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Agreements</span>
            <FileText className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{metrics.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">All-time marketplace</div>
        </div>

        <div className="p-4 bg-slate-900 border border-emerald-900/40 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>On Road Active</span>
            <Play className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{metrics.active}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Vehicles with renters</div>
        </div>

        <div className="p-4 bg-slate-900 border border-amber-900/40 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span>Ready for Pickup</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400">{metrics.confirmed}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Confirmed reservations</div>
        </div>

        <div className="p-4 bg-slate-900 border border-rose-900/50 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
            <span>Overdue Returns</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400">{metrics.overdue}</div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">Late past end date</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Completed Trips</span>
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{metrics.completed}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Returned safely</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Gross Value</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-400 truncate">
            {formatETB(metrics.totalGrossETB)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total rental volume</div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `All (${metrics.total})` },
            { id: 'active', label: `On Road (${metrics.active})` },
            { id: 'confirmed', label: `Awaiting Pickup (${metrics.confirmed})` },
            { id: 'requested', label: `Pending Requests (${metrics.pending})` },
            { id: 'overdue', label: `Overdue (${metrics.overdue})`, badgeColor: metrics.overdue > 0 ? 'text-rose-400 font-bold' : '' },
            { id: 'completed', label: `Completed (${metrics.completed})` },
            { id: 'disputed', label: `Disputed (${metrics.disputed})` },
            { id: 'cancelled', label: 'Cancelled / Declined' },
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
              } ${tab.badgeColor || ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Neighbourhood, and Sort Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by agreement ID, car, owner, renter, or plate ref..."
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
              value={neighbourhoodFilter}
              onChange={(e) => {
                setNeighbourhoodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Addis Neighbourhoods</option>
              {neighbourhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="price_high">Sort: Highest Total (ETB)</option>
              <option value="price_low">Sort: Lowest Total (ETB)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Rent-Outs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {sortedRentals.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No rental agreements found"
              description="No rent-out records match your current filter or search criteria."
              actionLabel="Clear Filters"
              onAction={() => {
                setStatusFilter('all');
                setNeighbourhoodFilter('all');
                setSearchQuery('');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Agreement Ref</th>
                  <th className="py-3.5 px-4">Vehicle & Location</th>
                  <th className="py-3.5 px-4">Host (Owner)</th>
                  <th className="py-3.5 px-4">Renter</th>
                  <th className="py-3.5 px-4">Rental Period</th>
                  <th className="py-3.5 px-4">Pricing & Fee</th>
                  <th className="py-3.5 px-4">Rental State</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedRentals.map((rental) => {
                  return (
                    <tr
                      key={rental.id}
                      className="hover:bg-slate-850/60 transition-colors group"
                    >
                      {/* Ref & Date */}
                      <td className="py-3.5 px-4 align-top font-mono">
                        <div className="font-bold text-white text-xs">{rental.id}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatDate(rental.createdAt || rental.startDate)}
                        </div>
                        {rental.adminNotesList?.length > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/40">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {rental.adminNotesList.length} note{rental.adminNotesList.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>

                      {/* Vehicle & Location */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-10 h-8 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                            <CarImageFallback
                              src={rental.car?.photos?.[0]}
                              alt={rental.car?.model || 'Car'}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {rental.car ? `${rental.car.make} ${rental.car.model}` : 'Unknown Vehicle'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-[9px]">
                                {rental.registrationRef}
                              </span>
                              <span>• {rental.car?.neighbourhood || 'Addis Ababa'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-slate-200">
                          {rental.owner?.name || 'Owner User'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                          {rental.owner?.email || rental.ownerId}
                        </div>
                      </td>

                      {/* Renter */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-slate-200">
                          {rental.renter?.name || 'Renter User'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                          {rental.renter?.email || rental.renterId}
                        </div>
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="text-slate-200 font-medium">
                          {rental.startDate} → {rental.endDate}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{rental.days} Day{rental.days > 1 ? 's' : ''} duration</span>
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-bold text-white">
                          {formatETB(rental.total || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatETB(rental.pricePerDay || 0)}/day • fee: {formatETB(rental.fee || 0)}
                        </div>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                          {rental.paymentStatus === 'paid_mock' ? '✓ Demo Paid' : 'Pending Payment'}
                        </div>
                      </td>

                      {/* Lifecycle State */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <StatusBadge status={rental.status} />
                          {rental.isOverdue && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              OVERDUE
                            </span>
                          )}
                          {rental.activeDispute && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <AlertOctagon className="w-3 h-3" />
                              DISPUTE OPEN
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectAgreement(rental)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Inspect full rental agreement & audit history"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Contextual lifecycle action buttons */}
                          {rental.status === 'requested' && (
                            <>
                              <button
                                onClick={() => setConfirmModalRental(rental)}
                                className="px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-950/60 rounded-md border border-emerald-800/40 transition-colors cursor-pointer"
                                title="Approve booking request"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setDeclineModalRental(rental)}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-950/60 rounded-md border border-rose-800/40 transition-colors cursor-pointer"
                                title="Decline booking request"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {rental.status === 'confirmed' && (
                            <button
                              onClick={() => setHandoverModalRental(rental)}
                              className="px-2 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-950/60 rounded-md border border-blue-800/40 transition-colors cursor-pointer flex items-center gap-1"
                              title="Mark vehicle handed over / picked up"
                            >
                              <Play className="w-3 h-3" />
                              Handover
                            </button>
                          )}

                          {rental.status === 'in_progress' && (
                            <button
                              onClick={() => setReturnModalRental(rental)}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-950/60 rounded-md border border-emerald-800/40 transition-colors cursor-pointer flex items-center gap-1"
                              title="Record return & complete rental"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Return
                            </button>
                          )}

                          {['confirmed', 'in_progress'].includes(rental.status) && (
                            <button
                              onClick={() => setCancelModalRental(rental)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Admin cancellation with reason"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setNoteModalRental(rental);
                              setNewNoteText('');
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Add internal admin note"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedRentals.length)} of {sortedRentals.length} agreements
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

      {/* 1. Full Agreement Detail Modal */}
      {inspectAgreement && (
        <Modal
          isOpen={!!inspectAgreement}
          onClose={() => setInspectAgreement(null)}
          title={`Rental Agreement #${inspectAgreement.id}`}
        >
          <div className="space-y-6 text-xs text-slate-200">
            {/* Status bar */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <StatusBadge status={inspectAgreement.status} />
                {inspectAgreement.isOverdue && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    OVERDUE RETURN
                  </span>
                )}
              </div>
              <div className="text-slate-400">
                Created: {formatDate(inspectAgreement.createdAt || inspectAgreement.startDate)}
              </div>
            </div>

            {/* Vehicle Card */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                <CarImageFallback
                  src={inspectAgreement.car?.photos?.[0]}
                  alt={inspectAgreement.car?.model}
                  fill
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm">
                  {inspectAgreement.car?.make} {inspectAgreement.car?.model} ({inspectAgreement.car?.year})
                </h4>
                <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                  <span className="font-mono bg-slate-800 px-1 py-0.5 rounded">
                    Plate: {inspectAgreement.registrationRef}
                  </span>
                  <span>• {inspectAgreement.car?.neighbourhood || 'Addis Ababa'}</span>
                  <span>• {inspectAgreement.car?.transmission}</span>
                </div>
              </div>
            </div>

            {/* Parties: Host and Renter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Vehicle Host (Owner)
                </div>
                <div className="font-bold text-white text-sm">
                  {inspectAgreement.owner?.name || 'Owner'}
                </div>
                <div className="text-slate-400">{inspectAgreement.owner?.email}</div>
                <div className="text-slate-400">{inspectAgreement.owner?.phone || '+251 91 123 4567'}</div>
                <div className="text-slate-400">{inspectAgreement.owner?.neighbourhood || 'Addis Ababa'}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Vehicle Renter
                </div>
                <div className="font-bold text-white text-sm">
                  {inspectAgreement.renter?.name || 'Renter'}
                </div>
                <div className="text-slate-400">{inspectAgreement.renter?.email}</div>
                <div className="text-slate-400">{inspectAgreement.renter?.phone || '+251 92 987 6543'}</div>
                <div className="text-slate-400">Identity: Verified Driver License</div>
              </div>
            </div>

            {/* Schedule & Financials */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Rental Terms & Pricing Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Pickup Date</span>
                  <span className="font-bold text-white">{inspectAgreement.startDate}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Return Date</span>
                  <span className="font-bold text-white">{inspectAgreement.endDate}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Duration</span>
                  <span className="font-bold text-white">{inspectAgreement.days} Days</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Daily Rate</span>
                  <span className="font-bold text-white">{formatETB(inspectAgreement.pricePerDay)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({inspectAgreement.days} days @ {formatETB(inspectAgreement.pricePerDay)})</span>
                  <span>{formatETB(inspectAgreement.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Platform Commission (10%)</span>
                  <span>{formatETB(inspectAgreement.fee || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                  <span>Total Rental Price</span>
                  <span className="text-emerald-400 text-sm">{formatETB(inspectAgreement.total || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Host Net Payout Settlement</span>
                  <span>{formatETB(inspectAgreement.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Payment Method Reference</span>
                  <span className="font-mono text-slate-300">
                    {inspectAgreement.paymentRef || 'SIMULATED-TELEBIRR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Internal Notes History */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Internal Admin Notes & Log
                </span>
                <button
                  onClick={() => {
                    setNoteModalRental(inspectAgreement);
                    setNewNoteText('');
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  + Add Note
                </button>
              </div>

              {inspectAgreement.adminNotesList?.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {inspectAgreement.adminNotesList.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span className="font-semibold text-slate-300">{n.authorName || 'Admin'}</span>
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                      <p className="text-slate-200">{n.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No internal administrative notes recorded yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setInspectAgreement(null)}>
                Close Window
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Approve Request Modal */}
      {confirmModalRental && (
        <Modal
          isOpen={!!confirmModalRental}
          onClose={() => setConfirmModalRental(null)}
          title="Approve & Confirm Rental Booking"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p>
              Are you sure you want to approve this rental request for{' '}
              <strong className="text-white">
                {confirmModalRental.car?.make} {confirmModalRental.car?.model}
              </strong>{' '}
              booked by <strong className="text-white">{confirmModalRental.renter?.name}</strong>?
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Rental Period:</span>
              <span className="font-semibold text-white">
                {confirmModalRental.startDate} to {confirmModalRental.endDate} ({confirmModalRental.days} Days) • Total: {formatETB(confirmModalRental.total)}
              </span>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Optional Admin Confirmation Note:
              </label>
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="e.g. Identity verified, host contact coordinated for Bole pickup."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 h-20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConfirmModalRental(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmApproval} disabled={actionLoading}>
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Decline Request Modal */}
      {declineModalRental && (
        <Modal
          isOpen={!!declineModalRental}
          onClose={() => setDeclineModalRental(null)}
          title="Decline Rental Booking Request"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p>
              Decline booking request for{' '}
              <strong className="text-white">
                {declineModalRental.car?.make} {declineModalRental.car?.model}
              </strong>
              . A reason is required to notify the renter and record in audit logs.
            </p>
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Decline Reason <span className="text-rose-400">*</span>:
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Host vehicle is currently undergoing scheduled maintenance; dates unavailable."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 h-24"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeclineModalRental(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeclineRequest} disabled={actionLoading}>
                {actionLoading ? 'Declining...' : 'Decline Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Handover / Picked Up Modal */}
      {handoverModalRental && (
        <Modal
          isOpen={!!handoverModalRental}
          onClose={() => setHandoverModalRental(null)}
          title="Record Vehicle Custody Handover"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p>
              Confirm that the renter has met the host, inspected the vehicle, and taken custody.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="font-semibold text-white">
                {handoverModalRental.car?.make} {handoverModalRental.car?.model} (Plate: {handoverModalRental.registrationRef})
              </div>
              <div className="text-slate-400">
                Renter: {handoverModalRental.renter?.name} ({handoverModalRental.renter?.phone || 'No phone recorded'})
              </div>
              <div className="text-slate-400">
                Scheduled Return: <strong className="text-white">{handoverModalRental.endDate}</strong>
              </div>
            </div>
            <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-200">
              This action transitions the rental state to <strong>in_progress</strong> (On Road).
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setHandoverModalRental(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleHandoverRental} disabled={actionLoading}>
                {actionLoading ? 'Starting...' : 'Confirm Handover (Start Trip)'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Record Return Modal */}
      {returnModalRental && (
        <Modal
          isOpen={!!returnModalRental}
          onClose={() => setReturnModalRental(null)}
          title="Record Vehicle Return & Complete Rental"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p>
              Record the safe return of{' '}
              <strong className="text-white">
                {returnModalRental.car?.make} {returnModalRental.car?.model}
              </strong>{' '}
              from renter <strong className="text-white">{returnModalRental.renter?.name}</strong>.
            </p>
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Return Inspection & Odometer Condition:
              </label>
              <textarea
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                placeholder="e.g. Fuel tank full, vehicle returned clean with no scratches, keys handed back."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 h-20"
              />
            </div>
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-200">
              Completing this rental will automatically queue the simulated host payout of{' '}
              <strong>{formatETB(returnModalRental.subtotal || 0)}</strong> in the Payments ledger.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setReturnModalRental(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRecordReturn} disabled={actionLoading}>
                {actionLoading ? 'Completing...' : 'Confirm Return & Complete Rental'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Cancel Rental Modal */}
      {cancelModalRental && (
        <Modal
          isOpen={!!cancelModalRental}
          onClose={() => setCancelModalRental(null)}
          title="Administrative Cancellation"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p className="text-rose-400 font-semibold">
              Warning: Administrative cancellation will abort this rental agreement.
            </p>
            <p>
              If the renter has already paid via demo payment, an automatic refund transaction will be logged.
            </p>
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Cancellation Reason <span className="text-rose-400">*</span>:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Driver license validation failed; vehicle safety recall."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 h-24"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCancelModalRental(null)}>
                Keep Agreement
              </Button>
              <Button variant="danger" onClick={handleCancelRental} disabled={actionLoading}>
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Add Note Modal */}
      {noteModalRental && (
        <Modal
          isOpen={!!noteModalRental}
          onClose={() => setNoteModalRental(null)}
          title={`Add Internal Note — #${noteModalRental.id}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p>
              Internal notes are only visible to administrators for dispatch, host coordination, and incident tracking.
            </p>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Note Content:</label>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="e.g. Spoke to renter regarding late return; expected back at Bole by 6 PM."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 h-24"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setNoteModalRental(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveInternalNote} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Internal Note'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. Create New Rent-Out Agreement Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Rent-Out Agreement (Admin Dispatch)"
          size="lg"
        >
          <form onSubmit={handleCreateRentOut} className="space-y-4 text-xs text-slate-300">
            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            {/* Vehicle Selection */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Select Fleet Vehicle <span className="text-rose-400">*</span>
              </label>
              <select
                value={createForm.carId}
                onChange={(e) => setCreateForm({ ...createForm, carId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- Choose an approved vehicle --</option>
                {approvedCars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.make} {c.model} ({c.year}) • {formatETB(c.pricePerDay)}/day • Plate: {c.plateNumber || 'AA'} ({c.neighbourhood || 'Addis Ababa'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Vehicle Preview Banner */}
            {selectedCar && (
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                    <CarImageFallback
                      src={selectedCar.photos?.[0]}
                      alt={selectedCar.model}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      {selectedCar.make} {selectedCar.model} ({selectedCar.year})
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Host ID: {selectedCar.ownerId} • Corridor: {selectedCar.neighbourhood || 'Addis Ababa'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold text-sm">
                    {formatETB(selectedCar.pricePerDay)}
                  </div>
                  <div className="text-[10px] text-slate-500">per rental day</div>
                </div>
              </div>
            )}

            {/* Customer Type Toggle */}
            <div className="pt-1">
              <label className="block text-slate-300 font-semibold mb-1.5">
                Renter Account <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, renterType: 'existing' })}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors cursor-pointer ${
                    createForm.renterType === 'existing'
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Existing User Account
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, renterType: 'walkin' })}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors cursor-pointer ${
                    createForm.renterType === 'walkin'
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Walk-In / Offline Customer
                </button>
              </div>

              {createForm.renterType === 'existing' ? (
                <div>
                  <select
                    value={createForm.renterId}
                    onChange={(e) => setCreateForm({ ...createForm, renterId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">-- Choose registered customer --</option>
                    {registeredRenters.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dawit Tadesse"
                      value={createForm.walkinName}
                      onChange={(e) => setCreateForm({ ...createForm, walkinName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+251 91 123 4567"
                      value={createForm.walkinPhone}
                      onChange={(e) => setCreateForm({ ...createForm, walkinPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="dawit@example.com"
                      value={createForm.walkinEmail}
                      onChange={(e) => setCreateForm({ ...createForm, walkinEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Start Date (Pickup) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  End Date (Return) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Availability Check Feedback */}
            {createForm.startDate && createForm.endDate && (
              <div>
                {availabilityCheck.available ? (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-300 flex items-center gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Vehicle is free and available for these {dateValidation.days} days ({createForm.startDate} to {createForm.endDate}).
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{availabilityCheck.reason || 'Dates conflict with existing reservation.'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Live Pricing Breakdown */}
            {estimatedPricing.total > 0 && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>
                    Rental Subtotal ({estimatedPricing.days} days × {formatETB(estimatedPricing.pricePerDay)}):
                  </span>
                  <span className="text-white font-medium">{formatETB(estimatedPricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sheggar Platform Commission (10%):</span>
                  <span className="text-emerald-400 font-medium">{formatETB(estimatedPricing.fee)}</span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-white">Total Gross Rent:</span>
                  <span className="text-emerald-400">{formatETB(estimatedPricing.total)}</span>
                </div>
              </div>
            )}

            {/* Status & Payment Dispatch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Initial Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  <option value="confirmed">Confirmed (Awaiting Pickup)</option>
                  <option value="in_progress">In Progress (Direct Handover)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Payment Status</label>
                <select
                  value={createForm.paymentStatus}
                  onChange={(e) => setCreateForm({ ...createForm, paymentStatus: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  <option value="paid_mock">Paid (Simulated Receipt)</option>
                  <option value="pending">Pending Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Payment Channel</label>
                <select
                  value={createForm.paymentMethod}
                  onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  <option value="TeleBirr Demo">TeleBirr Demo</option>
                  <option value="CBE Birr">CBE Birr</option>
                  <option value="Cash at Desk">Cash at Desk</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* Admin Internal Dispatch Notes */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Dispatch Notes & Instructions (Optional)
              </label>
              <textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="e.g. Walk-in customer at Bole showroom; driver license #ET-99238 verified."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 h-16"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={actionLoading || !availabilityCheck.available}
              >
                {actionLoading ? 'Recording Agreement...' : 'Confirm & Create Rent-Out'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
