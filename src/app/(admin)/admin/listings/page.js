'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import { validateDateRange } from '@/lib/validation';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import CarImageFallback from '@/components/ui/CarImageFallback';
import Modal from '@/components/ui/Modal';
import {
  Check,
  X,
  Eye,
  Search,
  Filter,
  Download,
  Edit,
  ShieldAlert,
  RotateCcw,
  Calendar,
  User,
  Clock,
  ArrowUpDown,
  Car as CarIcon,
  MapPin,
  Info,
  KeyRound,
  AlertTriangle,
  Wrench,
  Ban,
  CheckCircle,
  Plus,
  Trash2,
  Sparkles,
  Phone,
  Mail,
  AlertOctagon,
} from 'lucide-react';

export default function AdminListingsPage() {
  const {
    cars,
    users,
    bookings,
    moderateCar,
    adminEditCarAction,
    adminUpdateCarRentOutStatusAction,
    adminBlockCarDatesAction,
    adminUnblockCarDatesAction,
    getCarAvailability,
    showToast,
  } = useStore();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [transmissionFilter, setTransmissionFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals state
  const [inspectCar, setInspectCar] = useState(null);
  const [rejectModalCar, setRejectModalCar] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendModalCar, setSuspendModalCar] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [editModalCar, setEditModalCar] = useState(null);
  const [editFormData, setEditFormData] = useState({
    pricePerDay: '',
    neighbourhood: '',
    transmission: 'Automatic',
    seats: 5,
    status: 'approved',
  });

  // Dedicated Rent-Out & Availability Controls Modal State
  const [rentOutModalCar, setRentOutModalCar] = useState(null);
  const [rentOutForm, setRentOutForm] = useState({
    availabilityStatus: 'available',
    unavailabilityReason: '',
    availableFrom: '',
  });
  const [rentOutError, setRentOutError] = useState('');
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockError, setBlockError] = useState('');
  const [rentOutLoading, setRentOutLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute availability state and active rental data for all cars
  const carsWithAvailability = useMemo(() => {
    return cars.map((car) => {
      const avail = getCarAvailability(car.id);
      const owner = users.find((u) => u.id === car.ownerId);
      const carBookings = bookings.filter((b) => b.carId === car.id);

      // Active trip currently on road
      const activeRental = carBookings.find((b) => b.status === 'in_progress');
      // Reserved booking for today
      const reservedToday = carBookings.find(
        (b) => b.status === 'confirmed' && b.startDate <= todayStr && b.endDate >= todayStr
      );
      // Current active or today's booking
      const currentBooking = activeRental || reservedToday || null;
      const currentRenter = currentBooking ? users.find((u) => u.id === currentBooking.renterId) : null;

      // Upcoming confirmed bookings
      const upcomingBookings = carBookings.filter(
        (b) => b.status === 'confirmed' && b.startDate > todayStr
      );

      // Registration ref (plate number or fallback)
      const plateNumber = car.plateNumber || `ET-${car.id.slice(-4).toUpperCase()}`;

      return {
        ...car,
        plateNumber,
        owner,
        availability: avail,
        currentBooking,
        currentRenter,
        upcomingBookings,
        bookingsCount: carBookings.length,
        carBookings,
      };
    });
  }, [cars, users, bookings, getCarAvailability, todayStr]);

  // Tab Badge Metrics
  const metrics = useMemo(() => {
    const all = carsWithAvailability.length;
    const available = carsWithAvailability.filter(
      (c) => c.status === 'approved' && c.availability?.state === 'available'
    ).length;
    const unavailable = carsWithAvailability.filter(
      (c) => c.availability?.state === 'unavailable' || c.isAvailable === false
    ).length;
    const rented = carsWithAvailability.filter(
      (c) => c.availability?.state === 'rented' || c.currentBooking?.status === 'in_progress'
    ).length;
    const reserved = carsWithAvailability.filter(
      (c) => c.availability?.state === 'reserved'
    ).length;
    const maintenance = carsWithAvailability.filter(
      (c) => c.availability?.state === 'maintenance' || c.availabilityStatus === 'maintenance'
    ).length;
    const pending = carsWithAvailability.filter((c) => c.status === 'pending').length;
    const suspended = carsWithAvailability.filter((c) => c.status === 'suspended').length;
    const upcoming = carsWithAvailability.filter((c) => c.upcomingBookings?.length > 0).length;

    return { all, available, unavailable, rented, reserved, maintenance, pending, suspended, upcoming };
  }, [carsWithAvailability]);

  // Unique owners for filter dropdown
  const uniqueOwners = useMemo(() => {
    const map = new Map();
    carsWithAvailability.forEach((c) => {
      if (c.owner && !map.has(c.owner.id)) {
        map.set(c.owner.id, c.owner.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [carsWithAvailability]);

  // Filtered & Sorted records
  const filteredCars = useMemo(() => {
    let result = [...carsWithAvailability];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.plateNumber?.toLowerCase().includes(q) ||
          c.neighbourhood?.toLowerCase().includes(q) ||
          c.owner?.name?.toLowerCase().includes(q) ||
          c.owner?.email?.toLowerCase().includes(q)
      );
    }

    // Tab filter
    if (filterTab === 'available') {
      result = result.filter((c) => c.status === 'approved' && c.availability?.state === 'available');
    } else if (filterTab === 'unavailable') {
      result = result.filter((c) => c.availability?.state === 'unavailable' || c.isAvailable === false);
    } else if (filterTab === 'rented') {
      result = result.filter((c) => c.availability?.state === 'rented' || c.currentBooking?.status === 'in_progress');
    } else if (filterTab === 'reserved') {
      result = result.filter((c) => c.availability?.state === 'reserved');
    } else if (filterTab === 'maintenance') {
      result = result.filter((c) => c.availability?.state === 'maintenance' || c.availabilityStatus === 'maintenance');
    } else if (filterTab === 'pending') {
      result = result.filter((c) => c.status === 'pending');
    } else if (filterTab === 'suspended') {
      result = result.filter((c) => c.status === 'suspended');
    } else if (filterTab === 'upcoming') {
      result = result.filter((c) => c.upcomingBookings?.length > 0);
    }

    // Transmission filter
    if (transmissionFilter !== 'all') {
      result = result.filter((c) => c.transmission === transmissionFilter);
    }

    // Owner filter
    if (ownerFilter !== 'all') {
      result = result.filter((c) => c.ownerId === ownerFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'price_desc') return b.pricePerDay - a.pricePerDay;
      if (sortBy === 'price_asc') return a.pricePerDay - b.pricePerDay;
      if (sortBy === 'alpha') return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      return 0;
    });

    return result;
  }, [carsWithAvailability, searchQuery, filterTab, transmissionFilter, ownerFilter, sortBy]);

  // Handlers for Moderation
  const handleApprove = (carId) => {
    const res = moderateCar(carId, 'approved', 'Verified and approved by admin team.');
    if (res.success) {
      showToast('Listing approved and active for marketplace bookings', 'success');
    }
  };

  const handleConfirmReject = () => {
    if (!rejectModalCar) return;
    if (!rejectReason.trim()) {
      showToast('A specific rejection reason is required', 'error');
      return;
    }
    setLoading(true);
    const res = moderateCar(rejectModalCar.id, 'rejected', rejectReason.trim());
    setLoading(false);
    if (res.success) {
      setRejectModalCar(null);
      setRejectReason('');
      showToast('Listing marked as rejected with feedback', 'info');
    }
  };

  const handleConfirmSuspend = () => {
    if (!suspendModalCar) return;
    if (!suspendReason.trim()) {
      showToast('A reason for suspension is required', 'error');
      return;
    }
    setLoading(true);
    const res = moderateCar(suspendModalCar.id, 'suspended', suspendReason.trim());
    setLoading(false);
    if (res.success) {
      setSuspendModalCar(null);
      setSuspendReason('');
      showToast('Listing has been suspended from bookings', 'warning');
    }
  };

  const handleReactivate = (carId) => {
    const res = moderateCar(carId, 'approved', 'Reactivated by administrator.');
    if (res.success) {
      showToast('Vehicle reactivated and approved for hire', 'success');
    }
  };

  const openEditModal = (car) => {
    setEditModalCar(car);
    setEditFormData({
      pricePerDay: car.pricePerDay,
      neighbourhood: car.neighbourhood || 'Bole',
      transmission: car.transmission || 'Automatic',
      seats: car.seats || 5,
      status: car.status,
    });
  };

  const handleSaveEdit = () => {
    if (!editModalCar) return;
    const priceNum = Number(editFormData.pricePerDay);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Daily rental price must be a positive number', 'error');
      return;
    }
    setLoading(true);
    const res = adminEditCarAction(editModalCar.id, {
      pricePerDay: priceNum,
      neighbourhood: editFormData.neighbourhood,
      transmission: editFormData.transmission,
      seats: Number(editFormData.seats),
      status: editFormData.status,
    });
    setLoading(false);
    if (res.success) {
      setEditModalCar(null);
    }
  };

  // Open Manage Rent-Out Modal
  const openRentOutModal = (car) => {
    const enriched = carsWithAvailability.find((c) => c.id === car.id) || car;
    setRentOutModalCar(enriched);
    setRentOutForm({
      availabilityStatus: enriched.availabilityStatus || (enriched.isAvailable === false ? 'unavailable' : 'available'),
      unavailabilityReason: enriched.unavailabilityReason || '',
      availableFrom: enriched.availableFrom || '',
    });
    setRentOutError('');
    setBlockStartDate('');
    setBlockEndDate('');
    setBlockReason('');
    setBlockError('');
  };

  // Save Rent-Out Status (Availability / Maintenance / Suspended)
  const handleSaveRentOutStatus = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!rentOutModalCar) return;
    setRentOutError('');

    // Safety guard: Cannot mark available if active trip is currently in progress
    if (rentOutModalCar.currentBooking?.status === 'in_progress' && rentOutForm.availabilityStatus === 'available') {
      setRentOutError(
        `Cannot mark as Available for Rent: Vehicle is currently on trip with ${rentOutModalCar.currentRenter?.name || 'renter'} until ${rentOutModalCar.currentBooking.endDate} (Booking #${rentOutModalCar.currentBooking.id}). Custody must be returned and inspected first.`
      );
      return;
    }

    setRentOutLoading(true);
    const res = adminUpdateCarRentOutStatusAction(rentOutModalCar.id, {
      availabilityStatus: rentOutForm.availabilityStatus,
      isAvailable: rentOutForm.availabilityStatus === 'available',
      unavailabilityReason: rentOutForm.unavailabilityReason,
      availableFrom: rentOutForm.availableFrom,
    });
    setRentOutLoading(false);

    if (res.success) {
      const refreshed = carsWithAvailability.find((c) => c.id === rentOutModalCar.id);
      setRentOutModalCar(refreshed || res.car);
      showToast(`Rent-out status updated to "${rentOutForm.availabilityStatus.replace('_', ' ')}"`, 'success');
    } else {
      setRentOutError(res.error || 'Failed to update rent-out status');
    }
  };

  // Block calendar dates
  const handleAddBlockDates = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!rentOutModalCar) return;
    setBlockError('');

    if (!blockStartDate || !blockEndDate) {
      setBlockError('Both start date and end date are required.');
      return;
    }

    const rangeCheck = validateDateRange(blockStartDate, blockEndDate);
    if (!rangeCheck.valid) {
      setBlockError(rangeCheck.error || 'Invalid date range.');
      return;
    }

    setRentOutLoading(true);
    const res = adminBlockCarDatesAction(rentOutModalCar.id, {
      startDate: blockStartDate,
      endDate: blockEndDate,
      reason: blockReason,
    });
    setRentOutLoading(false);

    if (res.success) {
      const refreshed = carsWithAvailability.find((c) => c.id === rentOutModalCar.id);
      setRentOutModalCar(refreshed || res.car);
      setBlockStartDate('');
      setBlockEndDate('');
      setBlockReason('');
      showToast('Dates blocked on vehicle calendar', 'success');
    } else {
      setBlockError(res.error || 'Failed to block dates');
    }
  };

  // Unblock calendar dates
  const handleUnblockDates = (blockIdOrDate) => {
    if (!rentOutModalCar) return;
    setRentOutLoading(true);
    const res = adminUnblockCarDatesAction(rentOutModalCar.id, blockIdOrDate);
    setRentOutLoading(false);

    if (res.success) {
      const refreshed = carsWithAvailability.find((c) => c.id === rentOutModalCar.id);
      setRentOutModalCar(refreshed || res.car);
      showToast('Blocked period removed from vehicle calendar', 'info');
    } else {
      showToast(res.error || 'Failed to unblock dates', 'error');
    }
  };

  const handleExportCSV = () => {
    const rows = filteredCars.map((c) => ({
      CarID: c.id,
      PlateRegistration: c.plateNumber,
      Make: c.make,
      Model: c.model,
      Year: c.year,
      OwnerName: c.owner?.name || 'Unknown',
      OwnerEmail: c.owner?.email || '',
      Neighbourhood: c.neighbourhood || 'Addis Ababa',
      Transmission: c.transmission,
      DailyRate_ETB: c.pricePerDay,
      ListingApprovalStatus: c.status,
      RentalAvailabilityStatus: c.availability?.label || c.availability?.state,
      ActiveRenter: c.currentRenter?.name || 'None',
      ActiveRentalPeriod: c.currentBooking ? `${c.currentBooking.startDate} to ${c.currentBooking.endDate}` : 'None',
      TotalBookings: c.bookingsCount,
      CreatedAt: c.createdAt || '',
    }));
    exportToCSV(rows, sanitizeFileName(`sheggar_vehicles_rentout_${new Date().toISOString().slice(0, 10)}`));
    showToast('Vehicles & Rent-Out inventory exported to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CarIcon className="w-7 h-7 text-rose-500" />
            Cars & Fleet Listings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage individual car rent-out eligibility, maintenance blackouts, active trip custodies, and fleet moderation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Fleet CSV ({filteredCars.length})
          </Button>
        </div>
      </div>

      {/* Control Bar: Filters, Search & 9 Tab Categories */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by make, model, ID, plate, location, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Owner Filter */}
          <div className="md:col-span-3">
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All Vehicle Owners</option>
              {uniqueOwners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transmission Filter */}
          <div className="md:col-span-2">
            <select
              value={transmissionFilter}
              onChange={(e) => setTransmissionFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="all">All Transmissions</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-rose-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="alpha">Make/Model A-Z</option>
            </select>
          </div>
        </div>

        {/* 9 Core Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/60 pb-1">
          {[
            { id: 'all', label: `All Cars (${metrics.all})` },
            { id: 'available', label: `Available for Rent (${metrics.available})`, color: 'text-emerald-400 font-bold' },
            { id: 'rented', label: `Currently Rented (${metrics.rented})`, color: 'text-purple-400 font-bold' },
            { id: 'reserved', label: `Reserved (${metrics.reserved})` },
            { id: 'maintenance', label: `Maintenance (${metrics.maintenance})`, color: metrics.maintenance > 0 ? 'text-amber-400 font-bold' : '' },
            { id: 'unavailable', label: `Unavailable (${metrics.unavailable})` },
            { id: 'pending', label: `Pending Approval (${metrics.pending})`, color: metrics.pending > 0 ? 'text-amber-400 font-bold' : '' },
            { id: 'suspended', label: `Suspended (${metrics.suspended})` },
            { id: 'upcoming', label: `Upcoming Rentals (${metrics.upcoming})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-850'
              } ${tab.color || ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Vehicles & Rent-Out Table */}
      {filteredCars.length === 0 ? (
        <EmptyState
          title="No vehicles match your criteria"
          description="Try broadening your search term or switching active filter tabs."
          className="bg-slate-900 border-slate-800 text-slate-300 py-12"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Vehicle & Ref</th>
                  <th className="py-3.5 px-4">Host (Owner)</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 text-right">Daily Rate</th>
                  <th className="py-3.5 px-4 text-center">Listing Status</th>
                  <th className="py-3.5 px-4 text-center">Rental Availability</th>
                  <th className="py-3.5 px-4">Current Rental / Custody</th>
                  <th className="py-3.5 px-4 text-center">Trips</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredCars.map((car) => {
                  const isPending = car.status === 'pending';
                  const isApproved = car.status === 'approved';
                  const isSuspended = car.status === 'suspended';
                  const isRejected = car.status === 'rejected';

                  const isRented = car.currentBooking?.status === 'in_progress';
                  const isReserved = car.currentBooking?.status === 'confirmed';
                  const isMaintenance = car.availability?.state === 'maintenance' || car.availabilityStatus === 'maintenance';

                  return (
                    <tr key={car.id} className="hover:bg-slate-850/60 transition-colors group">
                      {/* Vehicle & Specs */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-slate-800">
                            <CarImageFallback
                              src={car.photos?.[0]}
                              alt={`${car.make} ${car.model}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              {car.make} {car.model}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-950 font-mono text-[9px] text-slate-300 border border-slate-800 font-semibold">
                                {car.plateNumber}
                              </span>
                              <span>• {car.year}</span>
                              <span>• {car.transmission}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-white">
                          {car.owner?.name || 'Unknown Owner'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {car.owner?.email}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {car.neighbourhood || 'Addis Ababa'}
                        </div>
                      </td>

                      {/* Daily Rate */}
                      <td className="py-3.5 px-4 text-right align-top font-extrabold text-emerald-400 text-sm whitespace-nowrap">
                        {formatETB(car.pricePerDay)}
                        <span className="text-[10px] text-slate-500 block font-normal">/ day</span>
                      </td>

                      {/* Listing Approval Status */}
                      <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                        <StatusBadge status={car.status} type="car" />
                        {car.moderationNotes && (
                          <div
                            title={car.moderationNotes}
                            className="text-[10px] text-slate-500 truncate max-w-[110px] mx-auto mt-0.5"
                          >
                            {car.moderationNotes}
                          </div>
                        )}
                      </td>

                      {/* Rental Availability Status */}
                      <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                        <StatusBadge
                          status={car.availability?.state}
                          className="text-[11px] font-semibold"
                        />
                        {car.availability?.reason && (
                          <div className="text-[9px] text-amber-400 truncate max-w-[120px] mx-auto mt-0.5">
                            {car.availability.reason}
                          </div>
                        )}
                      </td>

                      {/* Current Rental / Custody */}
                      <td className="py-3.5 px-4 align-top">
                        {isRented ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-purple-300 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                              Rented to {car.currentRenter?.name || 'Driver'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {car.currentBooking?.startDate} → {car.currentBooking?.endDate} ({car.currentBooking?.days}d)
                            </div>
                            <div className="text-[9px] font-mono text-slate-500">
                              Ref: #{car.currentBooking?.id}
                            </div>
                          </div>
                        ) : isReserved ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-blue-300 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-400" />
                              Reserved by {car.currentRenter?.name || 'Customer'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Pickup today: {car.currentBooking?.startDate}
                            </div>
                          </div>
                        ) : isMaintenance ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-amber-400 flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                              Maintenance / Service
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {car.unavailabilityReason || 'Routine checkup'}
                            </div>
                            {car.availableFrom && (
                              <div className="text-[9px] text-slate-500">Back: {car.availableFrom}</div>
                            )}
                          </div>
                        ) : car.isAvailable === false ? (
                          <div className="text-slate-400 text-[11px]">
                            <span className="text-rose-400 font-medium">Paused</span>
                            {car.unavailabilityReason && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                {car.unavailabilityReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Ready for Hire
                          </div>
                        )}
                      </td>

                      {/* Trips */}
                      <td className="py-3.5 px-4 text-center align-top font-semibold text-slate-300">
                        {car.bookingsCount}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right align-top whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Core Feature: Manage Rent-Out Button */}
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openRentOutModal(car)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white py-1 px-2.5 text-xs font-semibold shadow-xs"
                            title="Manage rent-out availability, block dates, maintenance, and rental periods"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1" />
                            Manage Rent-Out
                          </Button>

                          {/* Inspect Drawer */}
                          <button
                            onClick={() => setInspectCar(car)}
                            title="Inspect Details & Booking History"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(car)}
                            title="Edit Listing Attributes"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval / Rejection for Pending */}
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApprove(car.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 py-1 px-2 text-xs font-semibold"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setRejectModalCar(car)}
                                className="py-1 px-2 text-xs font-semibold"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {/* Suspend Approved Listing */}
                          {isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSuspendModalCar(car)}
                              className="text-xs text-rose-400 border-rose-500/40 hover:bg-rose-500/10 py-1 px-2"
                              title="Suspend from public marketplace"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                              Suspend
                            </Button>
                          )}

                          {/* Reactivate Suspended or Rejected */}
                          {(isSuspended || isRejected || car.status === 'inactive') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivate(car.id)}
                              className="text-xs text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 py-1 px-2"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Reactivate
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

      {/* ============================================================== */}
      {/* 1. DEDICATED MANAGE RENT-OUT & AVAILABILITY CONTROL MODAL */}
      {/* ============================================================== */}
      {rentOutModalCar && (
        <Modal
          isOpen={!!rentOutModalCar}
          onClose={() => setRentOutModalCar(null)}
          title={`Manage Rent-Out Controls — ${rentOutModalCar.make} ${rentOutModalCar.model}`}
          size="lg"
        >
          <div className="space-y-5 text-xs text-slate-300">
            {/* Vehicle Header & Current State Summary */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                  <CarImageFallback
                    src={rentOutModalCar.photos?.[0]}
                    alt={rentOutModalCar.model}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">
                    {rentOutModalCar.make} {rentOutModalCar.model} ({rentOutModalCar.year})
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono px-1.5 py-0.5 bg-slate-800 rounded-md text-[10px] text-slate-200 font-semibold">
                      {rentOutModalCar.plateNumber}
                    </span>
                    <span>• {rentOutModalCar.neighbourhood || 'Addis Ababa'}</span>
                    <span>• Host: {rentOutModalCar.owner?.name || 'Owner'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-emerald-400 font-extrabold text-base">
                  {formatETB(rentOutModalCar.pricePerDay)}/day
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <StatusBadge status={rentOutModalCar.status} type="car" />
                  <StatusBadge status={rentOutModalCar.availability?.state} />
                </div>
              </div>
            </div>

            {/* Error banner if rent-out update failed */}
            {rentOutError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{rentOutError}</span>
              </div>
            )}

            {/* Active Trip Custody Warning Banner */}
            {rentOutModalCar.currentBooking?.status === 'in_progress' && (
              <div className="p-4 bg-purple-950/40 border border-purple-800/60 rounded-xl text-purple-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                  Active Trip In Progress: Custody Handed to {rentOutModalCar.currentRenter?.name || 'Renter'}
                </div>
                <p className="text-[11px] text-purple-300 leading-relaxed">
                  Booking ref <strong>#{rentOutModalCar.currentBooking.id}</strong> started on{' '}
                  <strong>{rentOutModalCar.currentBooking.startDate}</strong> and is scheduled for return on{' '}
                  <strong>{rentOutModalCar.currentBooking.endDate}</strong> ({rentOutModalCar.currentBooking.days} days).
                </p>
                <div className="text-[10px] text-purple-400 pt-1">
                  Note: The vehicle cannot be marked available for new reservations until the customer safely returns the vehicle and custody is checked in via Return Inspection.
                </div>
              </div>
            )}

            {/* Reserved Today Banner */}
            {rentOutModalCar.currentBooking?.status === 'confirmed' && (
              <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-200 text-xs flex items-center justify-between">
                <div>
                  <strong className="text-white block">Confirmed Reservation for Today</strong>
                  <span className="text-[11px] text-blue-300">
                    Renter: {rentOutModalCar.currentRenter?.name || 'Customer'} (Trip: {rentOutModalCar.currentBooking.startDate} to {rentOutModalCar.currentBooking.endDate})
                  </span>
                </div>
                <StatusBadge status="confirmed" />
              </div>
            )}

            {/* 1. Main Rent-Out Operational Status Form */}
            <form onSubmit={handleSaveRentOutStatus} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Rent-Out Operational Status & New Booking Availability
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* State selector */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Marketplace Availability Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={rentOutForm.availabilityStatus}
                    onChange={(e) => setRentOutForm({ ...rentOutForm, availabilityStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium"
                  >
                    <option value="available">Available for Rent (Accepts New Bookings)</option>
                    <option value="maintenance">Maintenance (Undergoing Service / Repair)</option>
                    <option value="temporarily_unavailable">Temporarily Unavailable (Paused by Admin/Host)</option>
                    <option value="suspended">Suspended (Administrative Restriction)</option>
                  </select>
                </div>

                {/* Available again date */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Available Again From (Optional)
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={rentOutForm.availableFrom}
                    onChange={(e) => setRentOutForm({ ...rentOutForm, availableFrom: e.target.value })}
                    disabled={rentOutForm.availabilityStatus === 'available'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Unavailability reason */}
              {rentOutForm.availabilityStatus !== 'available' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Reason for Unavailability / Maintenance Notes <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={rentOutForm.unavailabilityReason}
                    onChange={(e) => setRentOutForm({ ...rentOutForm, unavailabilityReason: e.target.value })}
                    placeholder="e.g. Scheduled 10,000 km oil change & brake pad replacement at Bole workshop..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This reason will be displayed on the public vehicle card so customers know why the car cannot be reserved.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  loading={rentOutLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs py-1.5 px-4"
                >
                  Save Rent-Out Status
                </Button>
              </div>
            </form>

            {/* 2. Availability Calendar & Blocked Date Ranges */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3.5">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  Vehicle Availability Calendar & Blocked Maintenance Ranges
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Block specific periods for maintenance or owner blackouts without taking down the entire listing.
                </p>
              </div>

              {/* Add Block Form */}
              <form onSubmit={handleAddBlockDates} className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-rose-500" />
                  Block New Calendar Period
                </div>

                {blockError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                    {blockError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      min={todayStr}
                      value={blockStartDate}
                      onChange={(e) => setBlockStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      min={blockStartDate || todayStr}
                      value={blockEndDate}
                      onChange={(e) => setBlockEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Reason / Purpose</label>
                    <input
                      type="text"
                      placeholder="e.g. Scheduled Engine Service"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    loading={rentOutLoading}
                    className="text-xs"
                  >
                    + Add Blocked Period
                  </Button>
                </div>
              </form>

              {/* Active Blocked Dates List */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Active Blocked Dates & Blackout Periods
                </span>
                {(!rentOutModalCar.unavailableDates || rentOutModalCar.unavailableDates.length === 0) ? (
                  <div className="p-3 bg-slate-900 rounded-xl text-slate-500 text-xs italic text-center border border-slate-850">
                    No date ranges are currently blocked for this vehicle.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {rentOutModalCar.unavailableDates.map((block, idx) => {
                      const isString = typeof block === 'string';
                      const start = isString ? block : block.startDate;
                      const end = isString ? block : block.endDate;
                      const reason = isString ? 'Owner Blackout' : block.reason || 'Service / Maintenance';
                      const blockKey = isString ? block : block.id || `${start}-${end}`;

                      return (
                        <div
                          key={blockKey || idx}
                          className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-200">
                              {start} {end && end !== start ? `→ ${end}` : ''}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Reason: <span className="text-slate-300">{reason}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnblockDates(blockKey)}
                            title="Remove this blocked period"
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-white transition-colors cursor-pointer border border-rose-800/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Upcoming Confirmed Bookings */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Upcoming Confirmed Bookings ({rentOutModalCar.upcomingBookings?.length || 0})
                </h3>
                <span className="text-[10px] text-slate-500">Committed calendar periods</span>
              </div>

              {(!rentOutModalCar.upcomingBookings || rentOutModalCar.upcomingBookings.length === 0) ? (
                <div className="p-3 bg-slate-900 rounded-xl text-slate-500 text-xs italic text-center border border-slate-850">
                  No upcoming confirmed bookings on schedule.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {rentOutModalCar.upcomingBookings.map((b) => {
                    const renter = users.find((u) => u.id === b.renterId);
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {b.startDate} → {b.endDate} ({b.days || b.totalDays} days)
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Renter: {renter?.name || b.renterId} • ID: #{b.id}
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={b.status} />
                          <div className="font-bold text-emerald-400 text-xs mt-1">
                            {formatETB(b.total || b.totalAmount)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                variant="secondary"
                onClick={() => setRentOutModalCar(null)}
              >
                Close Controls
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectModalCar}
        onClose={() => setRejectModalCar(null)}
        title="Reject Listing Submission"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Provide a mandatory moderation reason for rejecting{' '}
            <span className="font-bold text-white">
              {rejectModalCar?.make} {rejectModalCar?.model}
            </span>
            . The host will be notified with this feedback.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unclear photos of vehicle interior, invalid plate documentation..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setRejectModalCar(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={loading}
              onClick={handleConfirmReject}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        isOpen={!!suspendModalCar}
        onClose={() => setSuspendModalCar(null)}
        title="Suspend Approved Vehicle"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Suspending{' '}
            <span className="font-bold text-white">
              {suspendModalCar?.make} {suspendModalCar?.model}
            </span>{' '}
            will hide it from search and prevent renters from initiating new booking requests.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reason for Suspension *
            </label>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Reported mechanical fault, insurance expiration inquiry..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setSuspendModalCar(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={loading}
              onClick={handleConfirmSuspend}
            >
              Confirm Suspension
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Vehicle Details Modal */}
      <Modal
        isOpen={!!editModalCar}
        onClose={() => setEditModalCar(null)}
        title={`Edit Vehicle: ${editModalCar?.make} ${editModalCar?.model}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Admin override for listing attributes. Changes are logged to the platform audit history.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Daily Rental Rate (ETB) *
              </label>
              <input
                type="number"
                min="100"
                step="50"
                value={editFormData.pricePerDay}
                onChange={(e) => setEditFormData({ ...editFormData, pricePerDay: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Neighbourhood *
              </label>
              <select
                value={editFormData.neighbourhood}
                onChange={(e) => setEditFormData({ ...editFormData, neighbourhood: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              >
                {['Bole', 'Kazanchis', 'Sarbet', 'Piassa', 'CMC', 'Gerji', 'Old Airport', 'Mexico', 'Megenagna'].map(
                  (zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transmission
              </label>
              <select
                value={editFormData.transmission}
                onChange={(e) => setEditFormData({ ...editFormData, transmission: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              >
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Passenger Seats
              </label>
              <input
                type="number"
                min="2"
                max="12"
                value={editFormData.seats}
                onChange={(e) => setEditFormData({ ...editFormData, seats: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Listing Approval State
            </label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            >
              <option value="approved">Approved & Active</option>
              <option value="pending">Pending Review</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setEditModalCar(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleSaveEdit}
            >
              Save Attributes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inspect Dossier Drawer Modal */}
      <Modal
        isOpen={!!inspectCar}
        onClose={() => setInspectCar(null)}
        title={inspectCar ? `${inspectCar.make} ${inspectCar.model} (${inspectCar.year})` : 'Vehicle Dossier'}
        size="lg"
      >
        {inspectCar && (
          <div className="space-y-4">
            {/* Gallery Preview */}
            <div className="grid grid-cols-3 gap-2">
              {inspectCar.photos?.slice(0, 3).map((photo, i) => (
                <div key={i} className="relative h-24 rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                  <CarImageFallback
                    src={photo}
                    alt={`${inspectCar.make} photo ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Daily Rate</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {formatETB(inspectCar.pricePerDay)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Plate Ref</span>
                <span className="font-semibold text-white">{inspectCar.plateNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                <span className="font-semibold text-white">{inspectCar.neighbourhood}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Listing Status</span>
                <StatusBadge status={inspectCar.status} type="car" />
              </div>
            </div>

            {/* Owner Details */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-500" />
                Registered Host Information
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">Host Name:</span>
                  <span className="font-semibold text-white">{inspectCar.owner?.name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Email Contact:</span>
                  <span className="font-semibold text-white">{inspectCar.owner?.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Complete Booking History for this vehicle */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Rental Trip History ({inspectCar.carBookings.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">All recorded requests</span>
              </h3>

              {inspectCar.carBookings.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg text-center border border-slate-800">
                  No rental bookings have been placed for this vehicle yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {inspectCar.carBookings.map((b) => {
                    const renter = users.find((u) => u.id === b.renterId);
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {formatDate(b.startDate)} &rarr; {formatDate(b.endDate)}
                            <span className="text-slate-500 font-normal ml-2">({b.totalDays || b.days} days)</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Renter: {renter?.name || b.renterId} • ID: #{b.id.slice(-6)}
                          </div>
                        </div>

                        <div className="text-right">
                          <StatusBadge status={b.status} />
                          <div className="font-bold text-emerald-400 mt-1">
                            {formatETB(b.totalAmount || b.total)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => {
                    const target = inspectCar;
                    setInspectCar(null);
                    openRentOutModal(target);
                  }}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1" />
                  Manage Rent-Out Controls
                </Button>
                <Link href={`/cars/${inspectCar.id}`} target="_blank">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Public Page
                  </Button>
                </Link>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setInspectCar(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
