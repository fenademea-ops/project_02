'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import { exportToCSV, sanitizeFileName } from '@/lib/csv';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import {
  Users,
  Search,
  Download,
  Filter,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Eye,
  RotateCcw,
  User,
  Car,
  Calendar,
} from 'lucide-react';

export default function AdminUsersPage() {
  const {
    users,
    cars,
    bookings,
    currentUser,
    updateUserStatusAction,
    showToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [suspendModalUser, setSuspendModalUser] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Enriched users with listings & bookings count
  const enrichedUsers = useMemo(() => {
    return users.map((u) => {
      const userListings = cars.filter((c) => c.ownerId === u.id);
      const userBookings = bookings.filter((b) => b.renterId === u.id);
      const isOwner = u.roles?.includes('owner');
      const isRenter = u.roles?.includes('renter');

      return {
        ...u,
        listingsCount: userListings.length,
        bookingsCount: userBookings.length,
        isOwner,
        isRenter,
      };
    });
  }, [users, cars, bookings]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return enrichedUsers.filter((u) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${u.name} ${u.email} ${u.phone} ${u.id}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (roleFilter !== 'all' && !u.roles?.includes(roleFilter)) {
        return false;
      }

      if (statusFilter !== 'all' && u.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedUsers, searchQuery, roleFilter, statusFilter]);

  const handleConfirmSuspend = () => {
    if (!suspendModalUser) return;
    if (!suspendReason.trim()) {
      showToast('A reason for suspending this account is required', 'error');
      return;
    }
    setLoading(true);
    const res = updateUserStatusAction(suspendModalUser.id, 'suspended');
    setLoading(false);
    if (res.success) {
      setSuspendModalUser(null);
      setSuspendReason('');
    }
  };

  const handleReinstate = (targetUser) => {
    updateUserStatusAction(targetUser.id, 'active');
  };

  const handleExportCSV = () => {
    const rows = filteredUsers.map((u) => ({
      UserID: u.id,
      FullName: u.name,
      Email: u.email,
      Phone: u.phone,
      Roles: u.roles?.join('; ') || 'renter',
      Status: u.status,
      TotalVehiclesListed: u.listingsCount,
      TotalTripsBooked: u.bookingsCount,
      RegisteredAt: u.createdAt || '',
    }));

    exportToCSV(rows, sanitizeFileName(`sheggar_users_${new Date().toISOString().slice(0, 10)}`));
    showToast('Users exported to CSV', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-rose-500" />
            User Accounts & Platform Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit user roles, active vs suspended credentials, and platform activity logs.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Users CSV ({filteredUsers.length})
        </Button>
      </div>

      {/* Control Bar */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or User ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Roles</option>
              <option value="renter">Renters</option>
              <option value="owner">Hosts / Car Owners</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No users match your criteria"
          description="Try clearing your search query or role filter."
          className="bg-slate-900 border-slate-800 text-slate-300 py-12"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">User & Contact</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Roles</th>
                  <th className="py-3.5 px-4 text-center">Cars</th>
                  <th className="py-3.5 px-4 text-center">Trips</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isSuspended = u.status === 'suspended';

                  return (
                    <tr key={u.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {u.name}
                          {isSelf && (
                            <span className="text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800 px-1.5 py-0.5 rounded-sm">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {u.email} <span className="text-slate-600">#{u.id.slice(-6)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400">{u.phone}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r) => (
                            <span
                              key={r}
                              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm ${
                                r === 'admin'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : r === 'owner'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-300">
                        {u.listingsCount}
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-300">
                        {u.bookingsCount}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">{formatDate(u.createdAt)}</td>

                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={u.status} type="user" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/users/${u.id}`}>
                            <button
                              title="View Full User Profile Dossier"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Link>

                          {!isSelf && (
                            <>
                              {!isSuspended ? (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setSuspendModalUser(u)}
                                  className="py-1 px-2.5 text-xs font-semibold"
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReinstate(u)}
                                  className="text-xs text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 py-1 px-2.5"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Reinstate
                                </Button>
                              )}
                            </>
                          )}
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

      {/* Suspend Account Modal */}
      <Modal
        isOpen={!!suspendModalUser}
        onClose={() => setSuspendModalUser(null)}
        title={`Suspend User Account: ${suspendModalUser?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Suspending <span className="font-bold text-slate-800">{suspendModalUser?.name}</span> ({suspendModalUser?.email}) will revoke their permission to create bookings, publish new vehicle listings, or make protected changes.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Suspension Reason *
            </label>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Terms of Service violation, repeated dispute complaints, or unverified contact information..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setSuspendModalUser(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={loading}
              onClick={handleConfirmSuspend}
            >
              Confirm Account Suspension
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
