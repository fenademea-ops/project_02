/**
 * Unified Status Badge / Pill Component
 */

export default function StatusBadge({ status, type = 'booking', className = '' }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  const styles = {
    // Booking states
    requested: 'bg-amber-100 text-amber-800 border-amber-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    reviewed: 'bg-teal-100 text-teal-800 border-teal-300',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-300',
    declined: 'bg-rose-100 text-rose-800 border-rose-300',
    disputed: 'bg-orange-100 text-orange-900 border-orange-400 font-semibold',
    resolved: 'bg-cyan-100 text-cyan-800 border-cyan-300',

    // Car listing states
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    rejected: 'bg-rose-100 text-rose-800 border-rose-300',
    draft: 'bg-slate-100 text-slate-700 border-slate-300',
    inactive: 'bg-gray-100 text-gray-600 border-gray-300',
    suspended: 'bg-rose-100 text-rose-900 border-rose-400 font-semibold',

    // Rental availability states
    available: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    rented: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold',
    reserved: 'bg-blue-100 text-blue-800 border-blue-300',
    blackout: 'bg-slate-200 text-slate-700 border-slate-400',
    maintenance: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    unavailable: 'bg-rose-50 text-rose-800 border-rose-300',
    temporarily_unavailable: 'bg-rose-100 text-rose-800 border-rose-300',
    blocked: 'bg-slate-200 text-slate-800 border-slate-400',

    // User states
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',

    // Payment & Payout states
    paid_mock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    refunded_mock: 'bg-slate-100 text-slate-700 border-slate-300',
    payout_pending: 'bg-amber-100 text-amber-800 border-amber-300',
    paid_out: 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold',

    // Review moderation states
    published: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    hidden: 'bg-slate-200 text-slate-700 border-slate-400',
    flagged: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
  };

  const statusStyle = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = normalized.replace('_', ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize whitespace-nowrap shadow-xs ${statusStyle} ${className}`}
    >
      {label}
    </span>
  );
}
