'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import {
  Bell,
  Menu,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
  Car,
  CalendarCheck,
  AlertOctagon,
  CreditCard,
  RotateCcw,
  ExternalLink,
  User,
  History,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Route display metadata
const ROUTE_META = {
  '/admin': { title: 'Admin Overview', crumb: 'Overview' },
  '/admin/rent-outs': { title: 'Rent-Out Management', crumb: 'Rent-Outs' },
  '/admin/rentals': { title: 'Rent-Out Management', crumb: 'Rent-Outs' },
  '/admin/bookings': { title: 'Bookings & Reservations', crumb: 'Bookings' },
  '/admin/listings': { title: 'Fleet & Listings', crumb: 'Listings' },
  '/admin/owners': { title: 'Car Owner Management', crumb: 'Owners' },
  '/admin/users': { title: 'Renters & Users', crumb: 'Users' },
  '/admin/payments': { title: 'Transactions & Payments', crumb: 'Payments' },
  '/admin/pricing': { title: 'Rental Pricing & Fees', crumb: 'Pricing' },
  '/admin/categories': { title: 'Vehicle Categories', crumb: 'Categories' },
  '/admin/reviews': { title: 'Reviews Moderation', crumb: 'Reviews' },
  '/admin/disputes': { title: 'Disputes & Complaints', crumb: 'Disputes' },
  '/admin/reports': { title: 'Reports & Analytics', crumb: 'Reports' },
  '/admin/announcements': { title: 'Announcements', crumb: 'Announcements' },
  '/admin/activity': { title: 'Audit Activity Logs', crumb: 'Activity Logs' },
  '/admin/settings': { title: 'Platform Settings', crumb: 'Settings' },
  '/admin/support': { title: 'Help & Support Guide', crumb: 'Help & Support' },
};

export default function AdminNavbar({ onToggleMobileMenu }) {
  const pathname = usePathname();
  const { currentUser, signOut, cars, bookings, disputes, resetData, showToast } = useStore();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Today in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // System alerts computation
  const alerts = useMemo(() => {
    const list = [];

    // Pending car approvals
    const pendingCars = cars.filter((c) => c.status === 'pending');
    if (pendingCars.length > 0) {
      list.push({
        id: 'alert-cars',
        type: 'warning',
        icon: Car,
        title: `${pendingCars.length} Vehicle Listing${pendingCars.length > 1 ? 's' : ''} Pending`,
        desc: 'New cars waiting for documentation inspection and approval.',
        href: '/admin/listings?filter=pending',
      });
    }

    // Pending booking requests
    const requestedBookings = bookings.filter((b) => b.status === 'requested');
    if (requestedBookings.length > 0) {
      list.push({
        id: 'alert-requests',
        type: 'info',
        icon: CalendarCheck,
        title: `${requestedBookings.length} Booking Request${requestedBookings.length > 1 ? 's' : ''} Awaiting Review`,
        desc: 'New renter reservations requiring approval or host coordination.',
        href: '/admin/rent-outs?filter=requested',
      });
    }

    // Overdue active rentals
    const overdueRentals = bookings.filter(
      (b) => b.status === 'in_progress' && b.endDate < todayStr
    );
    if (overdueRentals.length > 0) {
      list.push({
        id: 'alert-overdue',
        type: 'danger',
        icon: Clock,
        title: `${overdueRentals.length} Overdue Vehicle Return${overdueRentals.length > 1 ? 's' : ''}`,
        desc: 'Vehicles that have passed the agreed return schedule and require follow-up.',
        href: '/admin/rent-outs?filter=overdue',
      });
    }

    // Open disputes
    const openDisputes = disputes.filter((d) => d.status === 'open');
    if (openDisputes.length > 0) {
      list.push({
        id: 'alert-disputes',
        type: 'danger',
        icon: AlertOctagon,
        title: `${openDisputes.length} Open Customer Dispute${openDisputes.length > 1 ? 's' : ''}`,
        desc: 'Disputes or claims filed by renters or hosts needing investigation.',
        href: '/admin/disputes',
      });
    }

    // Pending simulated payouts
    const pendingPayouts = bookings.filter(
      (b) => b.payoutStatus === 'payout_pending' || (b.status === 'completed' && !b.payoutStatus)
    );
    if (pendingPayouts.length > 0) {
      list.push({
        id: 'alert-payouts',
        type: 'info',
        icon: CreditCard,
        title: `${pendingPayouts.length} Host Payout${pendingPayouts.length > 1 ? 's' : ''} Ready`,
        desc: 'Completed trips ready for simulated TeleBirr or CBE transfer.',
        href: '/admin/payments',
      });
    }

    return list;
  }, [cars, bookings, disputes, todayStr]);

  const currentMeta = ROUTE_META[pathname] || {
    title: 'Admin Dashboard',
    crumb: pathname.replace('/admin/', '').replace('-', ' '),
  };

  const handleConfirmReset = () => {
    resetData();
    setResetModalOpen(false);
    showToast('Marketplace demo data successfully reset to seed defaults.', 'info');
  };

  return (
    <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs & Title */}
          <div className="hidden sm:block">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5" aria-label="Breadcrumb">
              <Link href="/admin" className="hover:text-slate-200 transition-colors">
                Admin
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-rose-400 font-medium">{currentMeta.crumb}</span>
            </nav>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              {currentMeta.title}
            </h1>
          </div>

          <div className="sm:hidden">
            <h1 className="text-sm font-bold text-white leading-tight">
              {currentMeta.crumb}
            </h1>
          </div>
        </div>

        {/* Right: Quick Actions, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Marketplace link */}
          <Link
            href="/"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Open public marketplace"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Public Site</span>
          </Link>

          {/* Reset Demo Data quick trigger */}
          <button
            onClick={() => setResetModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-amber-300 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Reset demo data to default seed"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Reset Demo</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
              aria-label="View notifications and alerts"
            >
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-40 text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">System Alerts</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {alerts.length} Active
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Live Status</span>
                  </div>

                  <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto my-2">
                    {alerts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                        All systems operational. No active alerts requiring attention.
                      </div>
                    ) : (
                      alerts.map((alert) => {
                        const Icon = alert.icon;
                        const badgeColor =
                          alert.type === 'danger'
                            ? 'text-rose-400 bg-rose-950/60 border-rose-800/40'
                            : alert.type === 'warning'
                            ? 'text-amber-400 bg-amber-950/60 border-amber-800/40'
                            : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';

                        return (
                          <Link
                            key={alert.id}
                            href={alert.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-slate-800/50 transition-colors group"
                          >
                            <div className={`p-2 rounded-lg border ${badgeColor} shrink-0 mt-0.5`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors">
                                {alert.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                {alert.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-center">
                    <Link
                      href="/admin/activity"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                    >
                      View Full Audit Activity Log →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer"
              aria-label="Admin user menu"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {currentUser?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider leading-none">
                  Super Admin
                </div>
              </div>
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-40 text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 border-b border-slate-800 mb-1">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser?.name || 'Sara Mengistu'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {currentUser?.email || 'admin@sheggarwheels.et'}
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Super Administrator
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      href="/admin/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Platform Settings</span>
                    </Link>
                    <Link
                      href="/admin/activity"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <History className="w-4 h-4 text-slate-400" />
                      <span>Audit Activity Logs</span>
                    </Link>
                    <Link
                      href="/admin/support"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help & Operations SLA</span>
                    </Link>
                  </div>

                  <div className="pt-2 mt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        signOut();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg w-full transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Demo Data */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Marketplace Demo Data"
      >
        <div className="space-y-4 text-slate-300">
          <p className="text-sm">
            Are you sure you want to reset all marketplace data back to the default seed state?
          </p>
          <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200">
            <strong>Warning:</strong> Any mock bookings, test car submissions, and dispute resolutions created during this session will be restored to seed values.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmReset}>
              Yes, Reset Demo Data
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
