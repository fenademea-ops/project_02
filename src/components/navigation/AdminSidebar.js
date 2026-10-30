'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import {
  ShieldCheck,
  Car,
  CalendarDays,
  KeyRound,
  CreditCard,
  Users,
  UserCheck,
  AlertOctagon,
  Star,
  BarChart3,
  Bell,
  History,
  Settings,
  HelpCircle,
  Globe,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  DollarSign,
} from 'lucide-react';

export default function AdminSidebar({ mobileOpen, onMobileClose }) {
  const pathname = usePathname();
  const { currentUser, signOut, cars, bookings, disputes, users } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute live badge counts
  const pendingCarsCount = useMemo(() => cars.filter((c) => c.status === 'pending').length, [cars]);
  const requestedBookingsCount = useMemo(() => bookings.filter((b) => b.status === 'requested').length, [bookings]);
  const activeRentOutsCount = useMemo(() => bookings.filter((b) => b.status === 'in_progress').length, [bookings]);
  const openDisputesCount = useMemo(() => disputes.filter((d) => d.status === 'open').length, [disputes]);
  const suspendedUsersCount = useMemo(() => users.filter((u) => u.status === 'suspended').length, [users]);
  const pendingPayoutsCount = useMemo(
    () => bookings.filter((b) => b.payoutStatus === 'payout_pending' || (b.status === 'completed' && !b.payoutStatus)).length,
    [bookings]
  );

  // Grouped 16 navigation items from requirement
  const navGroups = useMemo(
    () => [
      {
        title: 'Operations & Fleet',
        items: [
          {
            label: '1. Overview',
            href: '/admin',
            icon: ShieldCheck,
            exact: true,
          },
          {
            label: '2. Rent-Out Management',
            href: '/admin/rent-outs',
            icon: KeyRound,
            badge: activeRentOutsCount > 0 ? `${activeRentOutsCount} active` : null,
            badgeColor: 'bg-emerald-600',
          },
          {
            label: '3. Bookings & Reservations',
            href: '/admin/bookings',
            icon: CalendarDays,
            badge: requestedBookingsCount > 0 ? requestedBookingsCount : null,
            badgeColor: 'bg-amber-500',
          },
          {
            label: '4. Cars & Listings',
            href: '/admin/listings',
            icon: Car,
            badge: pendingCarsCount > 0 ? pendingCarsCount : null,
            badgeColor: 'bg-amber-500',
          },
        ],
      },
      {
        title: 'Community & Users',
        items: [
          {
            label: '5. Owners',
            href: '/admin/owners',
            icon: UserCheck,
          },
          {
            label: '6. Renters & Users',
            href: '/admin/users',
            icon: Users,
            badge: suspendedUsersCount > 0 ? suspendedUsersCount : null,
            badgeColor: 'bg-rose-500',
          },
          {
            label: '10. Reviews & Ratings',
            href: '/admin/reviews',
            icon: Star,
          },
          {
            label: '11. Disputes & Complaints',
            href: '/admin/disputes',
            icon: AlertOctagon,
            badge: openDisputesCount > 0 ? openDisputesCount : null,
            badgeColor: 'bg-rose-500',
          },
        ],
      },
      {
        title: 'Finance & Pricing',
        items: [
          {
            label: '7. Transactions & Payments',
            href: '/admin/payments',
            icon: CreditCard,
            badge: pendingPayoutsCount > 0 ? pendingPayoutsCount : null,
            badgeColor: 'bg-emerald-500',
          },
          {
            label: '8. Rental Pricing & Fees',
            href: '/admin/pricing',
            icon: DollarSign,
          },
          {
            label: '9. Categories & Vehicle Types',
            href: '/admin/categories',
            icon: Layers,
          },
        ],
      },
      {
        title: 'Governance & System',
        items: [
          {
            label: '12. Reports & Analytics',
            href: '/admin/reports',
            icon: BarChart3,
          },
          {
            label: '13. Notifications & Announcements',
            href: '/admin/announcements',
            icon: Bell,
          },
          {
            label: '14. Admin Activity Logs',
            href: '/admin/activity',
            icon: History,
          },
          {
            label: '15. Settings',
            href: '/admin/settings',
            icon: Settings,
          },
          {
            label: '16. Help & Support',
            href: '/admin/support',
            icon: HelpCircle,
          },
        ],
      },
    ],
    [
      activeRentOutsCount,
      requestedBookingsCount,
      pendingCarsCount,
      suspendedUsersCount,
      openDisputesCount,
      pendingPayoutsCount,
    ]
  );

  // Render function (not a component inside render)
  const renderSidebarContent = (onLinkClick, collapsedMode = false) => (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="space-y-5">
        {/* Brand header */}
        <div className={`px-2 flex items-center ${collapsedMode ? 'justify-center' : 'justify-between'}`}>
          <Link
            href="/admin"
            className="flex items-center gap-2.5 focus:outline-hidden focus:ring-2 focus:ring-rose-500 rounded-lg p-1"
            onClick={onLinkClick}
            title="Sheggar Wheels Admin Portal"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-700 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-900/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!collapsedMode && (
              <div className="min-w-0">
                <div className="font-extrabold text-sm text-white tracking-tight leading-none">
                  Sheggar Wheels
                </div>
                <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mt-0.5">
                  Admin Portal
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Grouped Navigation */}
        <nav className="space-y-4 px-1" aria-label="Admin Navigation Menu">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsedMode && (
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    title={collapsedMode ? item.label : undefined}
                    className={`flex items-center ${
                      collapsedMode ? 'justify-center px-2 py-2.5' : 'justify-between px-2.5 py-2'
                    } rounded-xl text-xs font-medium transition-all duration-150 group ${
                      isActive
                        ? 'bg-rose-950/80 text-rose-200 font-semibold border border-rose-800/60 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {!collapsedMode && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>
                    {!collapsedMode && item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 ${
                          item.badgeColor || 'bg-amber-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer controls: Collapse toggle, Public site, Profile */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2 mt-4">
        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex items-center ${
            collapsedMode ? 'justify-center' : 'justify-between'
          } w-full px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsedMode && <span className="text-[11px] font-medium">Collapse menu</span>}
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Public marketplace link */}
        <Link
          href="/"
          onClick={onLinkClick}
          className={`flex items-center ${
            collapsedMode ? 'justify-center p-2' : 'gap-2 px-2.5 py-1.5'
          } text-xs text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition-colors`}
          title="Return to Public Marketplace"
        >
          <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
          {!collapsedMode && <span className="truncate">Public Marketplace</span>}
        </Link>

        {/* User Card */}
        <div
          className={`flex items-center ${
            collapsedMode ? 'justify-center p-1' : 'justify-between px-2.5 py-1.5'
          } bg-slate-900/60 rounded-xl border border-slate-800/80`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'A'}
            </div>
            {!collapsedMode && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">Super Admin</div>
              </div>
            )}
          </div>
          {!collapsedMode && (
            <button
              onClick={signOut}
              title="Sign out of Admin Portal"
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (Controlled by parent or navbar) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-950 border-r border-slate-800 p-4 z-10 text-slate-200 overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Admin Navigation
              </span>
              <button
                onClick={onMobileClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              {renderSidebarContent(onMobileClose, false)}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-950 text-slate-200 border-r border-slate-800 min-h-screen p-3 shrink-0 overflow-y-auto sticky top-0 self-start max-h-screen transition-all duration-200 z-10 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {renderSidebarContent(undefined, isCollapsed)}
      </aside>
    </>
  );
}
