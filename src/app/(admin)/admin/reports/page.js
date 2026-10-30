'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  MapPin,
  DollarSign,
  PieChart,
  Users,
  Car,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';

export default function AdminReportsPage() {
  const { bookings, cars, users, disputes } = useStore();

  const [selectedReport, setSelectedReport] = useState('financial');
  const [dateRange, setDateRange] = useState('all');

  // Filter bookings by date
  const filteredBookings = useMemo(() => {
    if (dateRange === 'all') return bookings;
    const now = new Date();
    let cutoff = new Date(0);

    if (dateRange === '30d') {
      cutoff = new Date(now.setDate(now.getDate() - 30));
    } else if (dateRange === '90d') {
      cutoff = new Date(now.setDate(now.getDate() - 90));
    } else if (dateRange === 'year') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }

    return bookings.filter((b) => new Date(b.createdAt || b.startDate) >= cutoff);
  }, [bookings, dateRange]);

  // Financial aggregates
  const financials = useMemo(() => {
    let gross = 0;
    let commission = 0;
    let hostNet = 0;
    let completedCount = 0;

    filteredBookings.forEach((b) => {
      if (['confirmed', 'in_progress', 'completed', 'reviewed'].includes(b.status)) {
        const total = b.totalAmount || b.total || 0;
        const fee = b.platformFee || b.fee || 0;
        gross += total;
        commission += fee;
        hostNet += b.hostEarnings || (total - fee);
        completedCount++;
      }
    });

    return { gross, commission, hostNet, completedCount };
  }, [filteredBookings]);

  // Booking lifecycle status distribution
  const statusDistribution = useMemo(() => {
    const counts = {
      requested: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      reviewed: 0,
      cancelled: 0,
      declined: 0,
      disputed: 0,
      resolved: 0,
    };

    filteredBookings.forEach((b) => {
      if (counts[b.status] !== undefined) {
        counts[b.status]++;
      }
    });

    return counts;
  }, [filteredBookings]);

  // Fleet status distribution
  const fleetDistribution = useMemo(() => {
    const counts = {
      approved: 0,
      pending: 0,
      rejected: 0,
      suspended: 0,
      inactive: 0,
    };

    cars.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    });

    return counts;
  }, [cars]);

  // User account distribution
  const userDistribution = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status !== 'suspended').length;
    const suspended = users.filter((u) => u.status === 'suspended').length;
    const renters = users.filter((u) => u.roles?.includes('renter')).length;
    const hosts = users.filter((u) => u.roles?.includes('owner')).length;
    const admins = users.filter((u) => u.roles?.includes('admin')).length;

    return { total, active, suspended, renters, hosts, admins };
  }, [users]);

  // Neighbourhood turnover
  const neighbourhoodStats = useMemo(() => {
    const map = {};
    filteredBookings.forEach((b) => {
      const car = cars.find((c) => c.id === b.carId);
      const nh = car?.neighbourhood || 'Addis Ababa (General)';
      if (!map[nh]) {
        map[nh] = { neighbourhood: nh, bookingsCount: 0, daysCount: 0, volumeETB: 0 };
      }
      map[nh].bookingsCount += 1;
      map[nh].daysCount += b.totalDays || b.days || 1;
      map[nh].volumeETB += b.totalAmount || b.total || 0;
    });

    return Object.values(map).sort((a, b) => b.volumeETB - a.volumeETB);
  }, [filteredBookings, cars]);

  // CSV Export
  const handleExportCSV = () => {
    let rows = [];
    let filename = `sheggar_${selectedReport}_report_${new Date().toISOString().slice(0, 10)}`;

    if (selectedReport === 'financial') {
      rows = filteredBookings
        .filter((b) => ['confirmed', 'in_progress', 'completed', 'reviewed'].includes(b.status))
        .map((b) => {
          const car = cars.find((c) => c.id === b.carId);
          const renter = users.find((u) => u.id === b.renterId);
          const host = users.find((u) => u.id === b.ownerId);
          const total = b.totalAmount || b.total || 0;
          const fee = b.platformFee || b.fee || 0;
          return {
            BookingID: b.id,
            Vehicle: car ? `${car.make} ${car.model}` : 'N/A',
            Renter: renter?.name || 'Unknown',
            Host: host?.name || 'Unknown',
            StartDate: b.startDate,
            EndDate: b.endDate,
            RentalDays: b.totalDays || b.days || 1,
            GrossTotal_ETB: total,
            PlatformCommission_ETB: fee,
            HostNet_ETB: b.hostEarnings || (total - fee),
            Status: b.status,
            PaymentStatus: b.paymentStatus || 'pending',
          };
        });
    } else if (selectedReport === 'lifecycle') {
      rows = Object.entries(statusDistribution).map(([status, count]) => ({
        LifecycleStatus: status,
        BookingCount: count,
        PercentageOfTotal: filteredBookings.length > 0 ? ((count / filteredBookings.length) * 100).toFixed(1) + '%' : '0%',
      }));
    } else if (selectedReport === 'fleet') {
      rows = Object.entries(fleetDistribution).map(([status, count]) => ({
        ModerationStatus: status,
        VehicleCount: count,
        PercentageOfFleet: cars.length > 0 ? ((count / cars.length) * 100).toFixed(1) + '%' : '0%',
      }));
    } else if (selectedReport === 'neighbourhoods') {
      rows = neighbourhoodStats.map((n) => ({
        Neighbourhood: n.neighbourhood,
        BookingsCount: n.bookingsCount,
        RentalDays: n.daysCount,
        GrossVolume_ETB: n.volumeETB,
        SharePercentage: financials.gross > 0 ? Math.round((n.volumeETB / financials.gross) * 100) + '%' : '0%',
      }));
    } else if (selectedReport === 'users') {
      rows = users.map((u) => ({
        UserID: u.id,
        Name: u.name,
        Email: u.email,
        Roles: u.roles?.join(', ') || 'renter',
        Status: u.status,
        RegisteredAt: u.createdAt || '',
      }));
    }

    exportToCSV(rows, sanitizeFileName(filename));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-rose-500" />
            Executive Reports & Analytics Exports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Aggregate rental volume, platform commission, fleet status distributions, and district turnover.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="all">Date: All Time</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="year">This Year (YTD)</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            className="bg-rose-600 hover:bg-rose-500 font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Category Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'financial', label: 'Financial & Revenue GMV', icon: DollarSign },
          { id: 'lifecycle', label: 'Booking Lifecycle Volume', icon: Calendar },
          { id: 'fleet', label: 'Fleet Moderation Status', icon: Car },
          { id: 'neighbourhoods', label: 'Addis District Turnover', icon: MapPin },
          { id: 'users', label: 'User Governance & Roles', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedReport(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                selectedReport === tab.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. FINANCIAL REPORT */}
      {selectedReport === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 flex items-center justify-between">
                Gross Rental GMV
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </span>
              <div className="text-2xl font-black text-white">{formatETB(financials.gross)}</div>
              <span className="text-[11px] text-slate-500 block">
                From {financials.completedCount} eligible bookings
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 flex items-center justify-between">
                Marketplace Commission (10%)
                <DollarSign className="w-4 h-4 text-amber-400" />
              </span>
              <div className="text-2xl font-black text-amber-400">{formatETB(financials.commission)}</div>
              <span className="text-[11px] text-slate-500 block">Retained platform net revenue</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 flex items-center justify-between">
                Host Remittance (90%)
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </span>
              <div className="text-2xl font-black text-emerald-400">{formatETB(financials.hostNet)}</div>
              <span className="text-[11px] text-slate-500 block">Payable to vehicle owners</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
            <div className="font-bold text-white text-sm">Commission Calculation Methodology</div>
            <p>
              Under Sheggar Wheels marketplace rules, platform fees are calculated as 10% of the daily
              rate multiplied by rental duration. Hosts retain 90% net earnings upon successful trip
              completion. Simulated refunds triggered by admin cancel bookings and dispute settlements are
              tracked as gross reversals.
            </p>
          </div>
        </div>
      )}

      {/* 2. BOOKING LIFECYCLE DISTRIBUTION */}
      {selectedReport === 'lifecycle' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rose-500" />
            Booking Status Distribution ({filteredBookings.length} total)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(statusDistribution).map(([status, count]) => {
              const pct = filteredBookings.length > 0 ? Math.round((count / filteredBookings.length) * 100) : 0;
              return (
                <div key={status} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider capitalize">
                    {status.replace('_', ' ')}
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {count} <span className="text-xs text-slate-500 font-normal">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. FLEET MODERATION REPORT */}
      {selectedReport === 'fleet' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Car className="w-4 h-4 text-rose-500" />
            Vehicle Fleet Moderation Status ({cars.length} cars registered)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(fleetDistribution).map(([status, count]) => {
              const pct = cars.length > 0 ? Math.round((count / cars.length) * 100) : 0;
              return (
                <div key={status} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider capitalize">
                    {status}
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {count} <span className="text-xs text-slate-500 font-normal">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ADDIS DISTRICT TURNOVER */}
      {selectedReport === 'neighbourhoods' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Turnover by Addis Ababa District
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="table-responsive">`n              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Neighbourhood</th>
                    <th className="py-3 px-4 text-center">Bookings Placed</th>
                    <th className="py-3 px-4 text-center">Rental Days</th>
                    <th className="py-3 px-4 text-right">Gross GMV (ETB)</th>
                    <th className="py-3 px-4 text-right">Market Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {neighbourhoodStats.map((st) => {
                    const share =
                      financials.gross > 0 ? Math.round((st.volumeETB / financials.gross) * 100) : 0;
                    return (
                      <tr key={st.neighbourhood} className="hover:bg-slate-850/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {st.neighbourhood}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium">{st.bookingsCount}</td>
                        <td className="py-3.5 px-4 text-center font-medium">{st.daysCount}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400 text-sm">
                          {formatETB(st.volumeETB)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-400">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. USER GOVERNANCE & ROLES */}
      {selectedReport === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            User Account Distribution ({userDistribution.total} total)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Users
              </span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                {userDistribution.active}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Suspended Accounts
              </span>
              <div className="text-xl font-extrabold text-rose-400 mt-1">
                {userDistribution.suspended}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Renters
              </span>
              <div className="text-xl font-extrabold text-white mt-1">
                {userDistribution.renters}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Car Hosts / Owners
              </span>
              <div className="text-xl font-extrabold text-white mt-1">
                {userDistribution.hosts}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Administrators
              </span>
              <div className="text-xl font-extrabold text-rose-400 mt-1">
                {userDistribution.admins}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
