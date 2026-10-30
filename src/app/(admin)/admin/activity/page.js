'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import {
  Activity,
  Search,
  Download,
  Filter,
  Shield,
  Clock,
  User,
  Car,
  Calendar,
  CreditCard,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function AdminActivityPage() {
  const { activityLog, users, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Enriched logs with actor user details
  const enrichedLogs = useMemo(() => {
    return activityLog.map((log) => {
      const actor = users.find((u) => u.id === log.actorId);
      return {
        ...log,
        actorName: actor?.name || log.actorId || 'Administrator',
        actorEmail: actor?.email || '',
      };
    });
  }, [activityLog, users]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const total = enrichedLogs.length;
    const cars = enrichedLogs.filter((l) => l.recordType === 'car').length;
    const bookings = enrichedLogs.filter((l) => l.recordType === 'booking').length;
    const usersCount = enrichedLogs.filter((l) => l.recordType === 'user').length;
    const financial = enrichedLogs.filter((l) => l.recordType === 'payment' || l.action?.includes('payout') || l.action?.includes('refund')).length;

    return { total, cars, bookings, usersCount, financial };
  }, [enrichedLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${l.action} ${l.recordType} ${l.recordId} ${l.explanation} ${l.actorName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (typeFilter !== 'all' && l.recordType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedLogs, searchQuery, typeFilter]);

  const handleExportCSV = () => {
    const rows = filteredLogs.map((l) => ({
      LogID: l.id,
      Timestamp: l.timestamp,
      Action: l.action,
      ActorID: l.actorId,
      ActorName: l.actorName,
      RecordType: l.recordType,
      RecordID: l.recordId,
      Explanation: l.explanation || '',
    }));

    exportToCSV(rows, sanitizeFileName(`sheggar_admin_activity_${new Date().toISOString().slice(0, 10)}`));
    showToast('Activity log exported to CSV', 'info');
  };

  const getActionBadgeStyle = (action = '') => {
    if (action.includes('approved') || action.includes('reinstated') || action.includes('start') || action.includes('complete')) {
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
    }
    if (action.includes('rejected') || action.includes('suspended') || action.includes('cancel')) {
      return 'bg-rose-950/60 text-rose-400 border-rose-800';
    }
    if (action.includes('payout') || action.includes('refund') || action.includes('payment')) {
      return 'bg-cyan-950/60 text-cyan-400 border-cyan-800';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-rose-500" />
            Platform Audit Trail & Admin Activity
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Chronological audit log recording moderation actions, state changes, simulated payouts, and account interventions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Audit CSV ({filteredLogs.length})
        </Button>
      </div>

      {/* Audit Transparency Disclaimer */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3">
        <Shield className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-bold text-white">Browser Demo Storage Notice:</span> Activity logs
          are persisted to <code className="font-mono text-rose-400">sw_activity_v1</code> in browser{' '}
          <code className="font-mono text-slate-400">localStorage</code>. For educational purposes,
          this provides full audit visibility across demo sessions. In production, tamper-proof
          append-only database logging with cryptographic signing would be enforced.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Logged Events
          </span>
          <div className="text-2xl font-black text-white mt-1">{metrics.total}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Audit entries</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Vehicle Actions
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.cars}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Moderation & edits</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Booking Actions
          </span>
          <div className="text-2xl font-black text-blue-400 mt-1">{metrics.bookings}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Lifecycle transitions</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Account Interventions
          </span>
          <div className="text-2xl font-black text-purple-400 mt-1">{metrics.usersCount}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Suspensions & updates</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Financial Events
          </span>
          <div className="text-2xl font-black text-cyan-400 mt-1">{metrics.financial}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Payouts & refunds</span>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, record ID, actor, or explanation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Record Types</option>
              <option value="car">Vehicles (car)</option>
              <option value="booking">Bookings (booking)</option>
              <option value="user">Users (user)</option>
              <option value="dispute">Disputes (dispute)</option>
              <option value="review">Reviews (review)</option>
              <option value="announcement">Announcements (announcement)</option>
              <option value="settings">Settings (settings)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="No activity records found"
          description="Try broadening your search term or clearing active filters."
          className="bg-slate-900 border-slate-800 text-slate-300 py-12"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="table-responsive">`n            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target Record</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Explanation / Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'Recent'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border capitalize ${getActionBadgeStyle(
                          log.action
                        )}`}
                      >
                        {log.action?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Target Record */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white capitalize">
                        {log.recordType}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        #{log.recordId}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {log.actorName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.actorId}
                      </div>
                    </td>

                    {/* Explanation */}
                    <td className="py-3.5 px-4 max-w-md text-slate-300">
                      {log.explanation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
