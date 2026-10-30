'use client';

import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import CarImageFallback from '@/components/ui/CarImageFallback';
import {
  Car,
  CalendarCheck,
  Clock,
  Compass,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

export default function RenterDashboardPage() {
  const { currentUser, bookings, cars, approvedCars } = useStore();

  const myBookings = bookings.filter((b) => b.renterId === currentUser?.id);
  const activeTrip = myBookings.find((b) => b.status === 'in_progress');
  const upcomingTrips = myBookings.filter((b) => b.status === 'confirmed');
  const pendingRequests = myBookings.filter((b) => b.status === 'requested');
  const completedTrips = myBookings.filter(
    (b) => b.status === 'completed' || b.status === 'reviewed'
  );

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your Addis Ababa car reservations, live GPS tracking, and trip receipts.
          </p>
        </div>

        <Link href="/cars">
          <Button variant="primary" size="md">
            <Compass className="w-4 h-4 mr-2" />
            Book a New Car
          </Button>
        </Link>
      </div>

      {/* 1. Active In-Progress Trip Banner (if any) */}
      {activeTrip && (
        (() => {
          const car = cars.find((c) => c.id === activeTrip.carId);
          return (
            <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-white/20">
                  <CarImageFallback
                    src={car?.photos[0]}
                    alt={`${car?.make} ${car?.model}`}
                    fill
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="animate-pulse flex h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Trip Currently Active
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {car?.make} {car?.model} ({car?.neighbourhood})
                  </h2>
                  <p className="text-xs text-slate-300">
                    Handover Period: {formatDate(activeTrip.startDate)} –{' '}
                    {formatDate(activeTrip.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Link href={`/bookings/${activeTrip.id}/track`} className="flex-1 md:flex-none">
                  <Button variant="amber" size="sm" className="w-full">
                    <Navigation className="w-4 h-4 mr-1.5" />
                    Live Route Tracking (Simulation)
                  </Button>
                </Link>
                <Link href={`/bookings/${activeTrip.id}`} className="flex-1 md:flex-none">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-white border-white/20 bg-white/10 hover:bg-white/20"
                  >
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          );
        })()
      )}

      {/* 2. Key Metrics Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Trips</span>
            <Car className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{myBookings.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Lifetime reservations</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Upcoming</span>
            <CalendarCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{upcomingTrips.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Confirmed bookings</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{pendingRequests.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting host approval</span>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{completedTrips.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Past journeys</span>
        </Card>
      </div>

      {/* 3. Recent Bookings Table / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recent Trip Bookings</h2>
          <Link
            href="/bookings"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View all ({myBookings.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {myBookings.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 text-xs">
            You haven&apos;t booked any cars yet.{' '}
            <Link href="/cars" className="text-emerald-600 font-semibold underline">
              Browse vehicles
            </Link>{' '}
            to start your journey!
          </Card>
        ) : (
          <div className="space-y-3">
            {myBookings.slice(0, 3).map((booking) => {
              const car = cars.find((c) => c.id === booking.carId);
              return (
                <Card
                  key={booking.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                      <CarImageFallback
                        src={car?.photos[0]}
                        alt={`${car?.make} ${car?.model}`}
                        fill
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {car?.make} {car?.model}
                        </span>
                        <StatusBadge status={booking.status} type="booking" />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDate(booking.startDate)} → {formatDate(booking.endDate)} •{' '}
                        {booking.days} days
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 block">Total cost</span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatETB(booking.total)}
                      </span>
                    </div>

                    <Link href={`/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        View Trip
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Recommended Cars Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Popular Weekend Rentals in Addis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {approvedCars.slice(0, 3).map((car) => (
            <Card key={car.id} hover className="p-4 flex flex-col justify-between">
              <div>
                <div className="relative h-32 w-full rounded-lg overflow-hidden bg-slate-100 mb-3">
                  <CarImageFallback
                    src={car.photos[0]}
                    alt={`${car.make} ${car.model}`}
                    fill
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {car.neighbourhood}
                  </div>
                </div>
                <h3 className="font-bold text-sm text-slate-900 truncate">
                  {car.make} {car.model}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {car.transmission} • {car.seats} seats
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-extrabold text-emerald-600">
                  {formatETB(car.pricePerDay)}
                  <span className="text-[10px] text-slate-400 font-normal">/day</span>
                </span>
                <Link href={`/cars/${car.id}`}>
                  <Button variant="outline" size="sm">
                    Book
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
