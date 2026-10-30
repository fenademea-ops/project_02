'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate, formatRelativeTime } from '@/lib/format';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Users,
  Car,
  CalendarCheck,
  TrendingUp,
  Percent,
  CheckSquare,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MapPin,
  CreditCard,
  Banknote,
  DollarSign,
  Activity,
  History,
  Filter,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const { users, cars, bookings, disputes, activityLog } = useStore();
  const [isClient, setIsClient] = useState(false);
  const [RechartsComponents, setRechartsComponents] = useState(null);
  const [dateRange, setDateRange] = useState('all'); // 'all', '30d', '90d', 'year'

  useEffect(() => {
    setIsClient(true);
    import('recharts').then((recharts) => {
      setRechartsComponents({
        ResponsiveContainer: recharts.ResponsiveContainer,
        BarChart: recharts.BarChart,
        Bar: recharts.Bar,
        XAxis: recharts.XAxis,
        YAxis: recharts.YAxis,
        Tooltip: recharts.Tooltip,
        CartesianGrid: recharts.CartesianGrid,
        Legend: recharts.Legend,
      });
    });
  }, []);

  // Filter bookings based on selected date range
  const filteredBookings = useMemo(() => {
    if (dateRange === 'all') return bookings;
    const now = new Date();
    let cutoff = new Date();
    if (dateRange === '30d') cutoff.setDate(now.getDate() - 30);
    else if (dateRange === '90d') cutoff.setDate(now.getDate() - 90);
    else if (dateRange === 'year') cutoff.setFullYear(now.getFullYear(), 0, 1);

    const cutoffIso = cutoff.toISOString();
    return bookings.filter((b) => (b.createdAt || b.startDate) >= cutoffIso);
  }, [bookings, dateRange]);

  // Comprehensive Metrics Calculation
  const totalUsers = users.length;
  const activeRenters = users.filter((u) => u.roles.includes('renter') && u.status === 'active').length;
  const activeOwners = users.filter((u) => u.roles.includes('owner') && u.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;

  const totalCars = cars.length;
  const approvedCars = cars.filter((c) => c.status === 'approved').length;
  const readyForRentCars = cars.filter(
    (c) => c.status === 'approved' && c.isAvailable !== false && !['maintenance', 'temporarily_unavailable', 'unavailable', 'suspended'].includes(c.availabilityStatus)
  ).length;
  const maintenanceCars = cars.filter(
    (c) => c.availabilityStatus === 'maintenance' || (c.status === 'approved' && c.isAvailable === false)
  ).length;
  const pendingCars = cars.filter((c) => c.status === 'pending').length;
  const rejectedOrInactiveCars = cars.filter((c) => ['rejected', 'inactive', 'suspended'].includes(c.status)).length;

  const totalBookingsCount = filteredBookings.length;
  const requestedBookings = filteredBookings.filter((b) => b.status === 'requested').length;
  const confirmedBookings = filteredBookings.filter((b) => b.status === 'confirmed').length;
  const inProgressRentals = filteredBookings.filter((b) => b.status === 'in_progress').length;
  const completedRentals = filteredBookings.filter((b) => ['completed', 'reviewed'].includes(b.status)).length;
  const cancelledDeclined = filteredBookings.filter((b) => ['cancelled', 'declined'].includes(b.status)).length;
  const disputedBookings = filteredBookings.filter((b) => ['disputed', 'resolved'].includes(b.status)).length;

  // Financials
  const grossRevenueETB = useMemo(() => {
    return filteredBookings
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .reduce((sum, b) => sum + (b.total || 0), 0);
  }, [filteredBookings]);

  const platformCommissionETB = useMemo(() => {
    return filteredBookings
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .reduce((sum, b) => sum + (b.fee || 0), 0);
  }, [filteredBookings]);

  const ownerEarningsETB = useMemo(() => {
    return filteredBookings
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .reduce((sum, b) => sum + (b.subtotal || 0), 0);
  }, [filteredBookings]);

  const pendingPayoutsETB = useMemo(() => {
    return filteredBookings
      .filter(
        (b) =>
          !['cancelled', 'declined'].includes(b.status) &&
          (b.payoutStatus === 'payout_pending' || (b.status === 'completed' && !b.payoutStatus))
      )
      .reduce((sum, b) => sum + (b.subtotal || 0), 0);
  }, [filteredBookings]);

  const openDisputes = disputes.filter((d) => d.status === 'open');

  // Chart 1: Bookings by Status
  const statusChartData = useMemo(() => {
    const counts = {
      requested: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      reviewed: 0,
      disputed: 0,
      cancelled: 0,
      declined: 0,
    };
    filteredBookings.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status] += 1;
    });

    return [
      { name: 'Requested', count: counts.requested, fill: '#3b82f6' },
      { name: 'Confirmed', count: counts.confirmed, fill: '#10b981' },
      { name: 'In Progress', count: counts.in_progress, fill: '#f59e0b' },
      { name: 'Completed', count: counts.completed + counts.reviewed, fill: '#059669' },
      { name: 'Disputed', count: counts.disputed, fill: '#ef4444' },
      { name: 'Cancelled', count: counts.cancelled + counts.declined, fill: '#64748b' },
    ];
  }, [filteredBookings]);

  // Chart 2: Monthly Volume & Commission
  const monthlyRevenueData = useMemo(() => {
    const monthly = {};
    filteredBookings
      .filter((b) => !['cancelled', 'declined'].includes(b.status))
      .forEach((b) => {
        const date = new Date(b.createdAt || b.startDate);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        if (!monthly[monthKey]) {
          monthly[monthKey] = { month: monthKey, gross: 0, commission: 0, bookings: 0 };
        }
        monthly[monthKey].gross += b.total || 0;
        monthly[monthKey].commission += b.fee || 0;
        monthly[monthKey].bookings += 1;
      });

    return Object.values(monthly);
  }, [filteredBookings]);

  // Chart 3: Listings by Neighbourhood
  const neighbourhoodData = useMemo(() => {
    const counts = {};
    cars.forEach((c) => {
      const hood = c.neighbourhood || 'Other';
      counts[hood] = (counts[hood] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [cars]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-rose-500" />
            Platform Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time analytics, fleet moderation, booking settlements, and platform governance for Addis Ababa.
          </p>
        </div>

        {/* Date Filter selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Period:</span>
          {['all', '30d', '90d', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                dateRange === range
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {range === 'all' ? 'All Time' : range === 'year' ? 'This Year' : `Last ${range}`}
            </button>
          ))}
        </div>
      </div>

      {/* Critical Attention Banners */}
      {(pendingCars > 0 || openDisputes.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pendingCars > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong className="text-white block font-bold">
                    {pendingCars} Vehicle Listing{pendingCars > 1 ? 's' : ''} Awaiting Review
                  </strong>
                  <span>Verify photos, specifications, and owner details before approval.</span>
                </div>
              </div>
              <Link href="/admin/listings">
                <Button variant="amber" size="sm" className="shrink-0 text-xs py-1 px-3">
                  Moderate Queue
                </Button>
              </Link>
            </div>
          )}

          {openDisputes.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <strong className="text-white block font-bold">
                    {openDisputes.length} Open Dispute{openDisputes.length > 1 ? 's' : ''} Pending Resolution
                  </strong>
                  <span>Requires administrative investigation and formal policy notes.</span>
                </div>
              </div>
              <Link href="/admin/disputes">
                <Button variant="danger" size="sm" className="shrink-0 text-xs py-1 px-3">
                  Resolve Claims
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Section 1: Financial & Revenue Overview */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Banknote className="w-4 h-4 text-emerald-400" />
          Financial & Revenue Volume (ETB)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
              Gross Transacted Volume
            </span>
            <div className="text-2xl font-black text-emerald-400">{formatETB(grossRevenueETB)}</div>
            <span className="text-[10px] text-slate-500 mt-1 block">ETB gross client checkouts</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
              Platform Commission (10%)
            </span>
            <div className="text-2xl font-black text-white">{formatETB(platformCommissionETB)}</div>
            <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">Sheggar Wheels net revenue</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
              Hosts&apos; Net Earnings
            </span>
            <div className="text-2xl font-black text-slate-200">{formatETB(ownerEarningsETB)}</div>
            <span className="text-[10px] text-slate-500 mt-1 block">Payable to registered car owners</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
              Pending Host Payouts
            </span>
            <div className="text-2xl font-black text-amber-400">{formatETB(pendingPayoutsETB)}</div>
            <Link
              href="/admin/payments"
              className="text-[10px] text-amber-300 hover:underline mt-1 inline-flex items-center gap-1 font-semibold"
            >
              Process Payouts <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Section 2: Fleet & Vehicle Statistics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-sky-400" />
            Fleet & Vehicle Listings Summary
          </h2>
          <Link
            href="/admin/listings"
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
          >
            Manage Cars & Rent-Outs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Registered</span>
            <div className="text-lg font-bold text-white mt-1">{totalCars} Cars</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Corridors in Addis</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-emerald-400 block">Ready for Rent</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">{readyForRentCars} Available</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Approved & active</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-amber-400 block">Maintenance / Blocked</span>
            <div className="text-lg font-bold text-amber-400 mt-1">{maintenanceCars} Paused</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Service or temp hold</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-sky-400 block">Pending Inspection</span>
            <div className="text-lg font-bold text-sky-400 mt-1">{pendingCars} Review</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Awaiting admin moderation</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Suspended / Inactive</span>
            <div className="text-lg font-bold text-slate-400 mt-1">{rejectedOrInactiveCars} Offline</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Suspended or turned off</span>
          </div>
        </div>
      </div>

      {/* Section 3: Rentals & Booking Operations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-purple-400" />
            Bookings & Rental Lifecycle Statuses
          </h2>
          <Link
            href="/admin/rent-outs"
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
          >
            Manage Rent-Outs & Handovers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-slate-400 block">Total Bookings</span>
            <span className="text-lg font-black text-white block mt-0.5">{totalBookingsCount}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-blue-400 block">Requested</span>
            <span className="text-lg font-black text-white block mt-0.5">{requestedBookings}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-emerald-400 block">Confirmed</span>
            <span className="text-lg font-black text-white block mt-0.5">{confirmedBookings}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-amber-400 block">In Progress</span>
            <span className="text-lg font-black text-white block mt-0.5">{inProgressRentals}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-emerald-500 block">Completed</span>
            <span className="text-lg font-black text-white block mt-0.5">{completedRentals}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-rose-400 block">Disputed</span>
            <span className="text-lg font-black text-white block mt-0.5">{disputedBookings}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-slate-400 block">Cancelled</span>
            <span className="text-lg font-black text-white block mt-0.5">{cancelledDeclined}</span>
          </div>
        </div>
      </div>

      {/* Section 4: Users & Demographic Summary */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-400" />
          User Governance & Community
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Users</span>
            <div className="text-xl font-bold text-white mt-1">{totalUsers} Accounts</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Stored in demo registry</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Active Renters</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">{activeRenters} Drivers</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Verified customer accounts</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Active Car Owners</span>
            <div className="text-xl font-bold text-sky-400 mt-1">{activeOwners} Hosts</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Hosting vehicle inventory</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Suspended Accounts</span>
            <div className="text-xl font-bold text-rose-400 mt-1">{suspendedUsers} Locked</div>
            <Link
              href="/admin/users"
              className="text-[10px] text-rose-400 hover:underline mt-0.5 inline-flex items-center gap-1 font-semibold"
            >
              Manage Users <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Bookings by Lifecycle Status */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Bookings by Lifecycle Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status breakdown</p>
            </div>
            <Link href="/admin/bookings" className="text-xs text-rose-400 hover:underline">
              View All
            </Link>
          </div>

          {isClient && RechartsComponents ? (
            <div className="h-64 w-full">
              <RechartsComponents.ResponsiveContainer width="100%" height="100%">
                <RechartsComponents.BarChart data={statusChartData}>
                  <RechartsComponents.CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <RechartsComponents.XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <RechartsComponents.YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <RechartsComponents.Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  />
                  <RechartsComponents.Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#e11d48" />
                </RechartsComponents.BarChart>
              </RechartsComponents.ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Loading Chart...
            </div>
          )}
        </div>

        {/* Chart 2: Fleet by Addis Ababa Neighbourhood */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Fleet Distribution by Neighbourhood</h3>
              <p className="text-xs text-slate-400 mt-0.5">Vehicles stationed per corridor</p>
            </div>
            <Link href="/admin/listings" className="text-xs text-rose-400 hover:underline">
              View Fleet
            </Link>
          </div>

          {isClient && RechartsComponents ? (
            <div className="h-64 w-full">
              <RechartsComponents.ResponsiveContainer width="100%" height="100%">
                <RechartsComponents.BarChart data={neighbourhoodData}>
                  <RechartsComponents.CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <RechartsComponents.XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <RechartsComponents.YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <RechartsComponents.Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  />
                  <RechartsComponents.Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#0284c7" />
                </RechartsComponents.BarChart>
              </RechartsComponents.ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Loading Chart...
            </div>
          )}
        </div>
      </div>

      {/* Quick Operations Management Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/admin/rent-outs"
          className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-700/50 rounded-2xl transition-all group shadow-md"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Car className="w-4 h-4" />
          </div>
          <div className="font-bold text-white text-xs group-hover:text-emerald-400 transition-colors">Rent-Outs</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Custody & returns</div>
        </Link>

        <Link
          href="/admin/bookings"
          className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-700/50 rounded-2xl transition-all group shadow-md"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/40 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">Bookings</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Reservations queue</div>
        </Link>

        <Link
          href="/admin/listings"
          className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-700/50 rounded-2xl transition-all group shadow-md"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/40 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="font-bold text-white text-xs group-hover:text-rose-400 transition-colors">Listings</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Fleet approvals</div>
        </Link>

        <Link
          href="/admin/owners"
          className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-700/50 rounded-2xl transition-all group shadow-md"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/40 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="font-bold text-white text-xs group-hover:text-blue-400 transition-colors">Car Owners</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Host accounts</div>
        </Link>

        <Link
          href="/admin/payments"
          className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-700/50 rounded-2xl transition-all group shadow-md"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="font-bold text-white text-xs group-hover:text-emerald-400 transition-colors">Payments</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Payout settlements</div>
        </Link>

        <Link
          href="/admin/pricing"
          className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-700/50 rounded-2xl transition-all group shadow-md"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/40 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Percent className="w-4 h-4" />
          </div>
          <div className="font-bold text-white text-xs group-hover:text-purple-400 transition-colors">Pricing & Fees</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Commission rules</div>
        </Link>
      </div>

      {/* Recent Activity Audit Trail */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-sm text-white">Recent Admin Activity Audit Log</h3>
          </div>
          <Link href="/admin/activity" className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold">
            Full Audit Log <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activityLog.length === 0 ? (
          <p className="text-xs text-slate-500">No activity logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {activityLog.slice(0, 5).map((act) => (
              <div key={act.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-200">{act.explanation}</span>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-mono text-rose-400">{act.action}</span>
                    <span>•</span>
                    <span>By {act.actorName}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                  {formatRelativeTime(act.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
