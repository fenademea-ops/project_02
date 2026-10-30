'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB } from '@/lib/format';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import CarImageFallback from '@/components/ui/CarImageFallback';
import {
  Car,
  PlusCircle,
  Edit,
  Calendar,
  Eye,
  Power,
  MapPin,
} from 'lucide-react';

export default function OwnerCarsPage() {
  const { currentUser, cars, toggleCarStatus, showToast } = useStore();

  const myCars = useMemo(() => {
    return cars.filter((c) => c.ownerId === currentUser?.id);
  }, [cars, currentUser]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Vehicle Fleet ({myCars.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage listing status, edit rates, configure unavailable dates, and view reservation
            history.
          </p>
        </div>

        <Link href="/owner/cars/new">
          <Button variant="primary" size="md">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add New Vehicle
          </Button>
        </Link>
      </div>

      {myCars.length === 0 ? (
        <EmptyState
          title="No vehicles listed yet"
          description="Start earning in Addis Ababa by listing your car for verified renters."
          actionLabel="Create First Listing"
          onAction={() => {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/owner/cars/new';
          }}
          className="bg-slate-800/60 border-slate-700 text-slate-300"
        />
      ) : (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Specs</th>
                  <th className="py-3 px-4 text-right">Daily Rate</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {myCars.map((car) => {
                  const isInactive = car.status === 'inactive';
                  return (
                    <tr key={car.id} className="hover:bg-slate-700/30 transition-colors">
                      {/* Vehicle Thumbnail & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-slate-700">
                            <CarImageFallback
                              src={car.photos[0]}
                              alt={`${car.make} ${car.model}`}
                              fill
                            />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {car.make} {car.model}
                            </div>
                            <div className="text-[11px] text-slate-400">Model Year {car.year}</div>
                          </div>
                        </div>
                      </td>

                      {/* District */}
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {car.neighbourhood}
                        </span>
                      </td>

                      {/* Specs */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {car.transmission} • {car.seats} Seats
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400 text-sm">
                        {formatETB(car.pricePerDay)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={car.status} type="car" />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/owner/cars/${car.id}/edit`}>
                            <button
                              title="Edit Listing"
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
                              aria-label="Edit listing"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </Link>

                          <Link href={`/owner/cars/${car.id}/availability`}>
                            <button
                              title="Manage Availability"
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-400 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
                              aria-label="Manage calendar"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </Link>

                          <Link href={`/owner/cars/${car.id}/bookings`}>
                            <button
                              title="View Bookings"
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sky-400 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
                              aria-label="View bookings"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Link>

                          <button
                            onClick={() => toggleCarStatus(car.id)}
                            title={isInactive ? 'Activate Car' : 'Deactivate Car'}
                            className={`p-1.5 rounded-lg cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors ${
                              isInactive
                                ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800'
                                : 'bg-slate-700 text-rose-400 hover:bg-slate-600'
                            }`}
                            aria-label={isInactive ? 'Activate' : 'Deactivate'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
