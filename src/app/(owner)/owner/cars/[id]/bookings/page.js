'use client';

import { useMemo, use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB, formatDate } from '@/lib/format';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { ArrowLeft, Calendar, User, Phone } from 'lucide-react';

export default function CarBookingsPage({ params }) {
  const unwrappedParams = use(params);
  const carId = unwrappedParams.id;

  const { cars, bookings, users } = useStore();

  const car = cars.find((c) => c.id === carId);

  const carBookings = useMemo(() => {
    return bookings.filter((b) => b.carId === carId);
  }, [bookings, carId]);

  if (!car) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Vehicle Not Found</h1>
        <Link href="/owner/cars">
          <Button variant="outline" size="sm">
            Back to Fleet
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/owner/cars"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Fleet
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Bookings for {car.make} {car.model}
        </h1>
        <p className="text-xs text-slate-400">
          History of all requested, active, and completed reservations for this vehicle.
        </p>
      </div>

      {carBookings.length === 0 ? (
        <EmptyState
          title="No reservations for this vehicle"
          description="When renters book this car, their trip details will appear here."
          className="bg-slate-800/60 border-slate-700 text-slate-300"
        />
      ) : (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Renter</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4 text-center">Duration</th>
                  <th className="py-3 px-4 text-right">Payout (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {carBookings.map((b) => {
                  const renter = users.find((u) => u.id === b.renterId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-white">{b.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{renter?.name || 'Renter'}</div>
                        <div className="text-[11px] text-slate-400">{renter?.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(b.startDate)} → {formatDate(b.endDate)}
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{b.days} Days</td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                        {formatETB(b.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={b.status} type="booking" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
