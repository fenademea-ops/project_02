'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { AlertOctagon, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export default function OwnerDisputesPage() {
  const { currentUser, cars, bookings, disputes, users } = useStore();

  const myCarIds = useMemo(() => {
    return cars.filter((c) => c.ownerId === currentUser?.id).map((c) => c.id);
  }, [cars, currentUser]);

  const myBookingIds = useMemo(() => {
    return bookings.filter((b) => myCarIds.includes(b.carId)).map((b) => b.id);
  }, [bookings, myCarIds]);

  const myDisputes = useMemo(() => {
    return disputes.filter((d) => myBookingIds.includes(d.bookingId));
  }, [disputes, myBookingIds]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Trip Disputes & Claims ({myDisputes.length})
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Cases involving security deposits, late drop-offs, fuel levels, or damages investigated by
          Sheggar Wheels Trust & Safety.
        </p>
      </div>

      {myDisputes.length === 0 ? (
        <EmptyState
          title="No disputes on your account"
          description="Your bookings have clean handover records with zero unresolved claims."
          className="bg-slate-800/60 border-slate-700 text-slate-300"
        />
      ) : (
        <div className="space-y-4">
          {myDisputes.map((d) => {
            const booking = bookings.find((b) => b.id === d.bookingId);
            const car = booking ? cars.find((c) => c.id === booking.carId) : null;
            const openedByUser = users.find((u) => u.id === d.openedBy);
            const isResolved = d.status === 'resolved';

            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div>
                    <span className="font-bold text-white text-base">{d.reason}</span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Vehicle: <strong>{car?.make} {car?.model}</strong> • Opened by{' '}
                      {openedByUser?.name || 'Party'} on {formatDate(d.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} type="dispute" />
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">
                    Claim Description:
                  </span>
                  {d.description}
                </div>

                {isResolved && d.resolutionNotes && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolution Finding (Admin Resolved on {formatDate(d.resolvedAt)}):
                    </span>
                    <p>{d.resolutionNotes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
