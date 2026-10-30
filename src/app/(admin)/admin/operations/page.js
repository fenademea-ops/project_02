'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import CarImageFallback from '@/components/ui/CarImageFallback';
import {
  Calendar,
  Clock,
  Car,
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  MapPin,
  User,
  Filter,
} from 'lucide-react';

export default function AdminOperationsPage() {
  const {
    cars,
    bookings,
    users,
    getCarAvailability,
    adminStartBookingAction,
    adminCompleteBookingAction,
    adminCancelBookingAction,
    showToast,
  } = useStore();

  const [zoneFilter, setZoneFilter] = useState('all');
  const [horizonDays, setHorizonDays] = useState(7);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute fleet status counts
  const fleetMetrics = useMemo(() => {
    let available = 0;
    let rented = 0;
    let reserved = 0;
    let blackout = 0;
    let suspendedOrPending = 0;

    cars.forEach((car) => {
      if (car.status !== 'approved') {
        suspendedOrPending++;
        return;
      }
      const avail = getCarAvailability(car.id, todayStr);
      if (avail.state === 'rented') rented++;
      else if (avail.state === 'reserved') reserved++;
      else if (avail.state === 'blackout') blackout++;
      else available++;
    });

    return { available, rented, reserved, blackout, suspendedOrPending };
  }, [cars, getCarAvailability, todayStr]);

  // Find Overdue rentals (status = in_progress and endDate < todayStr)
  const overdueBookings = useMemo(() => {
    return bookings.filter((b) => {
      return b.status === 'in_progress' && b.endDate < todayStr;
    }).map((b) => ({
      ...b,
      car: cars.find((c) => c.id === b.carId),
      renter: users.find((u) => u.id === b.renterId),
      host: users.find((u) => u.id === b.ownerId),
    }));
  }, [bookings, cars, users, todayStr]);

  // Find Schedule Conflicts (two overlapping confirmed or in_progress bookings for same car)
  const conflicts = useMemo(() => {
    const list = [];
    const active = bookings.filter((b) => ['confirmed', 'in_progress'].includes(b.status));

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const b1 = active[i];
        const b2 = active[j];
        if (b1.carId === b2.carId) {
          // Check overlap
          if (b1.startDate <= b2.endDate && b1.endDate >= b2.startDate) {
            list.push({
              car: cars.find((c) => c.id === b1.carId),
              booking1: b1,
              booking2: b2,
            });
          }
        }
      }
    }
    return list;
  }, [bookings, cars]);

  // Horizon date string
  const horizonDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + horizonDays);
    return d.toISOString().split('T')[0];
  }, [horizonDays]);

  // Upcoming Starts (status === 'confirmed' and startDate between today and horizon)
  const upcomingStarts = useMemo(() => {
    return bookings
      .filter((b) => b.status === 'confirmed' && b.startDate >= todayStr && b.startDate <= horizonDateStr)
      .map((b) => ({
        ...b,
        car: cars.find((c) => c.id === b.carId),
        renter: users.find((u) => u.id === b.renterId),
        host: users.find((u) => u.id === b.ownerId),
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [bookings, cars, users, todayStr, horizonDateStr]);

  // Upcoming Returns (status === 'in_progress' and endDate between today and horizon)
  const upcomingReturns = useMemo(() => {
    return bookings
      .filter((b) => b.status === 'in_progress' && b.endDate >= todayStr && b.endDate <= horizonDateStr)
      .map((b) => ({
        ...b,
        car: cars.find((c) => c.id === b.carId),
        renter: users.find((u) => u.id === b.renterId),
        host: users.find((u) => u.id === b.ownerId),
      }))
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [bookings, cars, users, todayStr, horizonDateStr]);

  // Fleet matrix with availability
  const fleetMatrix = useMemo(() => {
    return cars
      .filter((c) => zoneFilter === 'all' || c.neighbourhood === zoneFilter)
      .map((car) => {
        const avail = getCarAvailability(car.id, todayStr);
        const owner = users.find((u) => u.id === car.ownerId);
        const upcomingTrip = bookings.find(
          (b) => b.carId === car.id && b.status === 'confirmed' && b.startDate >= todayStr
        );
        return {
          ...car,
          owner,
          availability: avail,
          upcomingTrip,
        };
      });
  }, [cars, users, bookings, getCarAvailability, todayStr, zoneFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-rose-500" />
            Rental Operations & Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time fleet dispatch, upcoming vehicle handovers, return check-ins, overdue alerts, and reservation clash protection.
          </p>
        </div>

        {/* Horizon selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <span className="text-slate-400 font-medium pl-2 pr-1">Horizon:</span>
          {[3, 7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setHorizonDays(days)}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                horizonDays === days
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Availability Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Available Now
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {fleetMetrics.available}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Ready for instant hire</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Currently on Trip
          </span>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {fleetMetrics.rented}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">In renter custody</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Reserved Upcoming
          </span>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {fleetMetrics.reserved}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Locked for future trips</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Host Blackout
          </span>
          <div className="text-2xl font-black text-slate-400 mt-1">
            {fleetMetrics.blackout}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Maintenance / personal</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Under Review / Susp.
          </span>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {fleetMetrics.suspendedOrPending}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Not open to public</span>
        </div>
      </div>

      {/* Critical Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Rentals Alert */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${overdueBookings.length > 0 ? 'text-rose-500' : 'text-slate-500'}`} />
              Overdue Check-ins ({overdueBookings.length})
            </h2>
            <span className="text-[11px] text-slate-500">Scheduled return date passed</span>
          </div>

          {overdueBookings.length === 0 ? (
            <div className="p-3 bg-slate-950/60 rounded-xl text-xs text-slate-400 text-center">
              All active rentals are on schedule. No overdue returns.
            </div>
          ) : (
            <div className="space-y-2">
              {overdueBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white">
                      {b.car?.make} {b.car?.model} • #{b.id.slice(-6)}
                    </div>
                    <div className="text-[11px] text-rose-400 mt-0.5">
                      Return was due: <span className="font-bold">{formatDate(b.endDate)}</span> • Renter: {b.renter?.name} ({b.renter?.phone || 'N/A'})
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => adminCompleteBookingAction(b.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1 px-2.5"
                  >
                    Check In Return
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Conflicts Alert */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${conflicts.length > 0 ? 'text-amber-500' : 'text-slate-500'}`} />
              Schedule Collisions ({conflicts.length})
            </h2>
            <span className="text-[11px] text-slate-500">Overlapping active bookings</span>
          </div>

          {conflicts.length === 0 ? (
            <div className="p-3 bg-slate-950/60 rounded-xl text-xs text-slate-400 text-center">
              No reservation collisions detected. Fleet schedule is harmonious.
            </div>
          ) : (
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-xl text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white">
                      {c.car?.make} {c.car?.model}
                    </div>
                    <div className="text-[11px] text-amber-300 mt-0.5">
                      Overlap between #{c.booking1.id.slice(-6)} ({formatDate(c.booking1.startDate)} &rarr; {formatDate(c.booking1.endDate)}) and #{c.booking2.id.slice(-6)} ({formatDate(c.booking2.startDate)} &rarr; {formatDate(c.booking2.endDate)})
                    </div>
                  </div>
                  <Link href={`/admin/bookings?search=${c.car?.id}`}>
                    <Button variant="outline" size="sm" className="text-xs text-amber-400 border-amber-500/40 py-1 px-2">
                      Resolve
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Operations Dispatch Queue: Starts & Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Starts / Handovers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-400" />
              Upcoming Pickups (Next {horizonDays} Days)
            </h2>
            <span className="text-[11px] text-slate-400">{upcomingStarts.length} departures</span>
          </div>

          {upcomingStarts.length === 0 ? (
            <div className="p-4 bg-slate-950 rounded-xl text-xs text-slate-500 text-center">
              No confirmed trip departures scheduled in this {horizonDays}-day horizon.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {upcomingStarts.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {b.car?.make} {b.car?.model}
                      <span className="text-[10px] text-slate-500 font-mono">#{b.id.slice(-6)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Starts: <span className="text-purple-300 font-semibold">{formatDate(b.startDate)}</span> • Renter: {b.renter?.name || 'Unknown'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => adminStartBookingAction(b.id)}
                      className="bg-purple-600 hover:bg-purple-500 text-xs py-1 px-2.5 font-semibold"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Dispatch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Returns / Check-ins */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Upcoming Returns (Next {horizonDays} Days)
            </h2>
            <span className="text-[11px] text-slate-400">{upcomingReturns.length} returns</span>
          </div>

          {upcomingReturns.length === 0 ? (
            <div className="p-4 bg-slate-950 rounded-xl text-xs text-slate-500 text-center">
              No active vehicle returns scheduled in this {horizonDays}-day horizon.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {upcomingReturns.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {b.car?.make} {b.car?.model}
                      <span className="text-[10px] text-slate-500 font-mono">#{b.id.slice(-6)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Returns: <span className="text-emerald-300 font-semibold">{formatDate(b.endDate)}</span> • Renter: {b.renter?.name || 'Unknown'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => adminCompleteBookingAction(b.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1 px-2.5 font-semibold"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Check In
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fleet Availability Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-rose-500" />
              Fleet Availability Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status across all vehicles registered on the platform.
            </p>
          </div>

          {/* Zone filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Zone:</span>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Addis Zones</option>
              {['Bole', 'Kazanchis', 'Sarbet', 'Piassa', 'CMC', 'Gerji', 'Old Airport', 'Mexico', 'Megenagna'].map(
                (z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="table-responsive">`n          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4 text-right">Daily Rate</th>
                <th className="py-3 px-4 text-center">Rental Availability</th>
                <th className="py-3 px-4">Next Reservation</th>
                <th className="py-3 px-4">Host Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {fleetMatrix.map((c) => (
                <tr key={c.id} className="hover:bg-slate-850/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">
                      {c.make} {c.model} ({c.year})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {c.transmission} • {c.seats} seats
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {c.neighbourhood}
                  </td>

                  <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                    {formatETB(c.pricePerDay)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={c.availability?.state} />
                  </td>

                  <td className="py-3 px-4">
                    {c.upcomingTrip ? (
                      <span className="text-blue-300 font-medium">
                        {formatDate(c.upcomingTrip.startDate)} &rarr; {formatDate(c.upcomingTrip.endDate)}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No upcoming trip</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-white font-medium">{c.owner?.name || 'Owner'}</div>
                    <div className="text-[11px] text-slate-400">{c.owner?.phone || '+251 91 100 0000'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
