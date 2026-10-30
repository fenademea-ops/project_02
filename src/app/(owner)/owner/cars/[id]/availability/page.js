'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ArrowLeft, Calendar, Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function CarAvailabilityPage({ params }) {
  const unwrappedParams = use(params);
  const carId = unwrappedParams.id;

  const { cars, currentUser, updateCar, showToast } = useStore();
  const car = cars.find((c) => c.id === carId);

  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const unavailableDates = car.unavailableDates || [];

  const handleAddBlockedDate = (e) => {
    e.preventDefault();
    if (!newBlockedDate) return;

    if (unavailableDates.includes(newBlockedDate)) {
      showToast('Date is already blocked', 'error');
      return;
    }

    setSubmitting(true);
    const updated = [...unavailableDates, newBlockedDate].sort();
    const res = updateCar(car.id, { unavailableDates: updated });
    setSubmitting(false);

    if (res.success) {
      setNewBlockedDate('');
      showToast(`Blocked ${formatDate(newBlockedDate)} from booking`, 'info');
    }
  };

  const handleRemoveBlockedDate = (dateToRemove) => {
    const updated = unavailableDates.filter((d) => d !== dateToRemove);
    const res = updateCar(car.id, { unavailableDates: updated });
    if (res.success) {
      showToast(`Unblocked ${formatDate(dateToRemove)}`, 'success');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/owner/cars"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Fleet
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Manage Availability: {car.make} {car.model}
        </h1>
        <p className="text-xs text-slate-400">
          Blackout dates when your vehicle is in personal use or undergoing scheduled maintenance in
          Addis.
        </p>
      </div>

      {/* Add Blocked Date Form */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          Block a Date from Calendar
        </h2>

        <form onSubmit={handleAddBlockedDate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            required
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-amber-500 min-h-[44px]"
          />
          <Button
            type="submit"
            variant="amber"
            size="md"
            loading={submitting}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Block Date
          </Button>
        </form>
      </div>

      {/* List of currently blocked dates */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Currently Unavailable Dates ({unavailableDates.length})
        </h2>

        {unavailableDates.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
            No dates are currently blacked out. This car is available for all unbooked dates.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/60 rounded-xl bg-slate-800/80 border border-slate-700 overflow-hidden">
            {unavailableDates.map((dateStr) => (
              <div
                key={dateStr}
                className="p-3.5 flex items-center justify-between text-xs text-slate-200 hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="font-semibold">{formatDate(dateStr)}</span>
                  <span className="text-[11px] text-slate-400 font-mono">({dateStr})</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveBlockedDate(dateStr)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 cursor-pointer transition-colors"
                  title="Remove block"
                  aria-label="Remove block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
