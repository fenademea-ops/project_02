'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import {
  AlertOctagon,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Search,
  Download,
  Filter,
} from 'lucide-react';

export default function AdminDisputesPage() {
  const { disputes, bookings, cars, users, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const openCount = disputes.filter((d) => d.status === 'open').length;

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      const booking = bookings.find((b) => b.id === d.bookingId);
      const car = booking ? cars.find((c) => c.id === booking.carId) : null;
      const opener = users.find((u) => u.id === d.openedBy);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${d.id} ${d.reason} ${d.description} ${opener?.name} ${car?.make} ${car?.model} ${d.bookingId}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (statusFilter !== 'all' && d.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [disputes, bookings, cars, users, searchQuery, statusFilter]);

  const handleExportCSV = () => {
    const rows = filteredDisputes.map((d) => {
      const booking = bookings.find((b) => b.id === d.bookingId);
      const car = booking ? cars.find((c) => c.id === booking.carId) : null;
      const opener = users.find((u) => u.id === d.openedBy);

      return {
        DisputeID: d.id,
        BookingID: d.bookingId,
        Vehicle: car ? `${car.make} ${car.model}` : 'N/A',
        OpenedBy: opener?.name || d.openedBy,
        Reason: d.reason,
        Description: d.description,
        Status: d.status,
        ResolutionNotes: d.resolutionNotes || '',
        ResolvedAt: d.resolvedAt || '',
        CreatedAt: d.createdAt || '',
      };
    });

    exportToCSV(rows, sanitizeFileName(`sheggar_disputes_${new Date().toISOString().slice(0, 10)}`));
    showToast('Disputes exported to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <AlertOctagon className="w-7 h-7 text-rose-500" />
            Trust & Safety Dispute Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Investigate customer claims, fuel disputes, and damage reports. Admin resolutions are recorded with full audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {openCount > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {openCount} Case{openCount > 1 ? 's' : ''} Require Resolution
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV ({filteredDisputes.length})
          </Button>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by dispute ID, claim reason, description, user, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Dispute States ({disputes.length})</option>
              <option value="open">Open / Unresolved ({openCount})</option>
              <option value="resolved">Resolved ({disputes.length - openCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Disputes Table */}
      {filteredDisputes.length === 0 ? (
        <EmptyState
          title="No disputes match your query"
          description="The platform currently has zero open or past customer claims matching criteria."
          className="bg-slate-900 border-slate-800 text-slate-300 py-12"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="table-responsive">`n            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Dispute ID</th>
                  <th className="py-3.5 px-4">Claim Reason & Statement</th>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">Opened By</th>
                  <th className="py-3.5 px-4">Date Filed</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredDisputes.map((d) => {
                  const booking = bookings.find((b) => b.id === d.bookingId);
                  const car = booking ? cars.find((c) => c.id === booking.carId) : null;
                  const opener = users.find((u) => u.id === d.openedBy);

                  return (
                    <tr key={d.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        #{d.id.slice(-6)}
                      </td>

                      <td className="py-3.5 px-4 max-w-sm">
                        <span className="font-semibold text-white block">{d.reason}</span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {d.description}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {car ? `${car.make} ${car.model}` : 'Vehicle'}
                        </div>
                        <div className="text-[11px] text-slate-400">{car?.neighbourhood}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">{opener?.name || 'User'}</div>
                        <div className="text-[11px] text-slate-400">{opener?.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">{formatDate(d.createdAt)}</td>

                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={d.status} type="dispute" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/admin/disputes/${d.id}`}>
                          <Button
                            variant={d.status === 'open' ? 'danger' : 'outline'}
                            size="sm"
                            className="text-xs py-1 px-3"
                          >
                            {d.status === 'open' ? 'Review & Resolve' : 'View Findings'}
                          </Button>
                        </Link>
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
