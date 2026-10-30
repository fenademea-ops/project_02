'use client';

import { use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import TripTrackingMap from '@/components/map/TripTrackingMap';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { ArrowLeft, Phone, ShieldCheck, MapPin, Compass, Navigation } from 'lucide-react';

export default function BookingTrackPage({ params }) {
  const unwrappedParams = use(params);
  const bookingId = unwrappedParams.id;

  const { bookings, cars, users, currentUser } = useStore();

  const booking = bookings.find((b) => b.id === bookingId);
  const car = booking ? cars.find((c) => c.id === booking.carId) : null;
  const host = booking ? users.find((u) => u.id === booking.ownerId) : null;

  // Negative test rule: unauthorized user cannot view private tracking
  if (booking && currentUser && booking.renterId !== currentUser.id && !currentUser.roles.includes('admin') && booking.ownerId !== currentUser.id) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
        <p className="text-sm text-slate-600">You do not have permission to view live telemetry for this reservation.</p>
        <Link href="/bookings">
          <Button variant="primary" size="sm">Back to My Bookings</Button>
        </Link>
      </div>
    );
  }

  if (!booking || !car) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Trip Not Found</h1>
        <Link href="/bookings">
          <Button variant="outline" size="sm">
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  // Derive coordinates based on neighbourhood
  const neighbourhoodCoords = {
    Bole: [8.995, 38.788],
    Kazanchis: [9.019, 38.775],
    Piassa: [9.035, 38.752],
    Sarbet: [8.991, 38.741],
    CMC: [9.022, 38.831],
    Megenagna: [9.021, 38.799],
    Gerji: [8.989, 38.805],
  };

  const startCoords = neighbourhoodCoords[car.neighbourhood] || [8.995, 38.788];
  const endCoords = [9.035, 38.752]; // Piassa destination

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Booking Receipt
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Live Trip Tracking (Simulation)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time GPS telemetry for {car.make} {car.model} in Addis Ababa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} type="booking" />
        </div>
      </div>

      {/* Main Tracking HUD Map */}
      <TripTrackingMap
        booking={booking}
        car={car}
        startCoords={startCoords}
        endCoords={endCoords}
      />

      {/* Host & Handover Information Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Vehicle & Pickup
          </div>
          <div className="font-bold text-sm text-slate-900">
            {car.make} {car.model} ({car.year})
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            {car.neighbourhood}, Addis Ababa
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Host Handover Contact
          </div>
          <div className="font-bold text-sm text-slate-900">{host?.name || 'Local Host'}</div>
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {host?.phone || '+251 91 100 0000'}
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Roadside Safety
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            Need urgent assistance? Addis roadside dispatch is on standby 24/7.
          </div>
          <div className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Covered by Sheggar Assurance
          </div>
        </Card>
      </div>
    </div>
  );
}
