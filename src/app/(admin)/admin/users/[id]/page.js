'use client';

import { useMemo, use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate, formatETB } from '@/lib/format';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Car,
  CalendarCheck,
  ShieldAlert,
} from 'lucide-react';

export default function AdminUserDetailPage({ params }) {
  const unwrappedParams = use(params);
  const targetUserId = unwrappedParams.id;

  const { users, cars, bookings, currentUser, updateUserStatusAction } = useStore();

  const user = users.find((u) => u.id === targetUserId);

  const userCars = useMemo(() => {
    return cars.filter((c) => c.ownerId === targetUserId);
  }, [cars, targetUserId]);

  const userBookings = useMemo(() => {
    return bookings.filter((b) => b.renterId === targetUserId);
  }, [bookings, targetUserId]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">User Not Found</h1>
        <Link href="/admin/users">
          <Button variant="outline" size="sm">
            Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  const isSelf = user.id === currentUser?.id;
  const isSuspended = user.status === 'suspended';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users Registry
      </Link>

      {/* User Header Profile Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500/30 text-rose-400 font-black text-2xl flex items-center justify-center shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{user.name}</h1>
              <StatusBadge status={user.status} type="user" />
            </div>
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {user.phone}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Account Created: {formatDate(user.createdAt)}
            </div>
          </div>
        </div>

        <div>
          {!isSelf && (
            <Button
              variant={isSuspended ? 'outline' : 'danger'}
              size="sm"
              onClick={() => {
                const next = isSuspended ? 'active' : 'suspended';
                updateUserStatusAction(user.id, next);
              }}
            >
              {isSuspended ? 'Reinstate Account' : 'Suspend Account'}
            </Button>
          )}
        </div>
      </div>

      {/* Grid: Listings + Bookings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicles Listed */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Car className="w-4 h-4 text-emerald-400" />
            Vehicles Listed ({userCars.length})
          </h2>

          {userCars.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              User has not registered any vehicles as a host.
            </p>
          ) : (
            <div className="divide-y divide-slate-800">
              {userCars.map((car) => (
                <div key={car.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">
                      {car.make} {car.model}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {car.neighbourhood} • {formatETB(car.pricePerDay)}/day
                    </span>
                  </div>
                  <StatusBadge status={car.status} type="car" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trips Booked */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-sky-400" />
            Renter Bookings ({userBookings.length})
          </h2>

          {userBookings.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              User has not made any trip reservations.
            </p>
          ) : (
            <div className="divide-y divide-slate-800">
              {userBookings.map((b) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">
                      {b.days} Days • {formatDate(b.startDate)}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Total: {formatETB(b.total)}
                    </span>
                  </div>
                  <StatusBadge status={b.status} type="booking" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
