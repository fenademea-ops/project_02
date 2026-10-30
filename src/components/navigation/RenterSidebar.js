'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import {
  LayoutDashboard,
  CalendarCheck,
  Compass,
  ArrowRightLeft,
  LogOut,
  Car,
  PlusCircle,
  Menu,
  X,
} from 'lucide-react';

export default function RenterSidebar() {
  const pathname = usePathname();
  const { currentUser, signOut } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Bookings', href: '/bookings', icon: CalendarCheck },
    { label: 'Explore Cars', href: '/cars', icon: Compass },
  ];

  const renderSidebarContent = (onLinkClick) => (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-6">
        {/* Brand header */}
        <div className="px-2">
          <Link href="/" className="flex items-center gap-2" onClick={onLinkClick}>
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 leading-tight">Sheggar Wheels</div>
              <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                Renter Portal
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Switch Mode Box */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div className="text-xs font-bold text-amber-900 mb-1">Own a car in Addis?</div>
          <p className="text-[11px] text-amber-800 mb-2.5">
            Share it with verified renters and earn daily income in ETB.
          </p>
          <Link
            href="/owner/cars/new"
            onClick={onLinkClick}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            List Vehicle
          </Link>
        </div>
      </div>

      {/* User profile & actions */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-slate-800 truncate">
              {currentUser?.name || 'Renter'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{currentUser?.email}</div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Car className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900">Renter Portal</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Open renter menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-slate-200 p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Renter Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              {renderSidebarContent(() => setMobileOpen(false))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 min-h-screen flex-col p-4 shrink-0 overflow-y-auto sticky top-0 self-start max-h-screen">
        {renderSidebarContent()}
      </aside>
    </>
  );
}
