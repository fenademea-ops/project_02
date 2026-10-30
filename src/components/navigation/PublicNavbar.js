'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { Car, Compass, PlusCircle, User, LogOut, Menu, X, Shield, LayoutDashboard } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function PublicNavbar() {
  const pathname = usePathname();
  const { currentUser, signOut } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOwner = currentUser?.roles?.includes('owner');
  const isAdmin = currentUser?.roles?.includes('admin');

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              Sheggar<span className="text-emerald-600">Wheels</span>
            </span>
            <span className="block text-[10px] tracking-wider uppercase font-semibold text-slate-400">
              Addis Ababa P2P
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/cars"
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith('/cars') ? 'text-emerald-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Browse Cars
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/#neighbourhoods"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Neighbourhoods
          </Link>

          {/* List Your Car CTA */}
          <Link
            href={isOwner ? '/owner/cars/new' : '/signin?next=/owner/cars/new'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            List Your Car
          </Link>
        </nav>

        {/* User Actions / Portal Links */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* Contextual portal link */}
              {isAdmin ? (
                <Link href="/admin">
                  <Button variant="secondary" size="sm">
                    <Shield className="w-4 h-4 mr-1.5 text-emerald-400" />
                    Admin Portal
                  </Button>
                </Link>
              ) : isOwner ? (
                <Link href="/owner">
                  <Button variant="outline" size="sm">
                    <LayoutDashboard className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Host Console
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    <Compass className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Renter Dashboard
                  </Button>
                </Link>
              )}

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {currentUser.roles[0]}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  title="Sign out session"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/cars"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700"
          >
            Browse Cars
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700"
          >
            How It Works
          </Link>
          <Link
            href={isOwner ? '/owner/cars/new' : '/signin?next=/owner/cars/new'}
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-amber-700"
          >
            + List Your Car
          </Link>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <>
                <div className="text-sm font-semibold text-slate-800">
                  Signed in as {currentUser.name}
                </div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" size="sm" className="w-full">
                      Admin Portal
                    </Button>
                  </Link>
                )}
                {isOwner && (
                  <Link href="/owner" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Host Console
                    </Button>
                  </Link>
                )}
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Renter Dashboard
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-rose-600"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
