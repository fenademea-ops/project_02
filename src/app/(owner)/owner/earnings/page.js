'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/lib/useStore';
import { formatETB } from '@/lib/format';
import { generateCsv, downloadCsv } from '@/lib/csv';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  BarChart2,
} from 'lucide-react';

export default function OwnerEarningsPage() {
  const { currentUser, cars, bookings } = useStore();
  const [isClient, setIsClient] = useState(false);
  const [RechartsComponents, setRechartsComponents] = useState(null);

  useEffect(() => {
    setIsClient(true);
    import('recharts').then((recharts) => {
      setRechartsComponents({
        ResponsiveContainer: recharts.ResponsiveContainer,
        BarChart: recharts.BarChart,
        Bar: recharts.Bar,
        XAxis: recharts.XAxis,
        YAxis: recharts.YAxis,
        Tooltip: recharts.Tooltip,
        CartesianGrid: recharts.CartesianGrid,
      });
    });
  }, []);

  const myCarIds = useMemo(() => {
    return cars.filter((c) => c.ownerId === currentUser?.id).map((c) => c.id);
  }, [cars, currentUser]);

  const paidBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        myCarIds.includes(b.carId) &&
        ['confirmed', 'in_progress', 'completed', 'reviewed'].includes(b.status)
    );
  }, [bookings, myCarIds]);

  // Aggregate monthly earnings
  const monthlyData = useMemo(() => {
    const months = ['Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'];
    const map = {};

    months.forEach((m) => {
      map[m] = { month: m, bookingsCount: 0, daysCount: 0, gross: 0, fee: 0, netPayout: 0 };
    });

    paidBookings.forEach((b) => {
      const date = new Date(b.startDate);
      const mKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!map[mKey]) {
        map[mKey] = { month: mKey, bookingsCount: 0, daysCount: 0, gross: 0, fee: 0, netPayout: 0 };
      }
      map[mKey].bookingsCount += 1;
      map[mKey].daysCount += b.days || 1;
      map[mKey].gross += b.total || 0;
      map[mKey].fee += b.fee || 0;
      map[mKey].netPayout += b.subtotal || 0;
    });

    return Object.values(map);
  }, [paidBookings]);

  const totalEarnings = paidBookings.reduce((sum, b) => sum + (b.subtotal || 0), 0);
  const totalDays = paidBookings.reduce((sum, b) => sum + (b.days || 0), 0);
  const avgPayout = paidBookings.length > 0 ? Math.round(totalEarnings / paidBookings.length) : 0;

  const handleExportCsv = () => {
    const rows = monthlyData.map((m) => ({
      month: m.month,
      bookingsCount: m.bookingsCount,
      daysRented: m.daysCount,
      grossETB: m.gross,
      platformFeeETB: m.fee,
      netPayoutETB: m.netPayout,
    }));

    const headers = [
      { key: 'month', label: 'Month' },
      { key: 'bookingsCount', label: 'Completed Bookings' },
      { key: 'daysRented', label: 'Days Rented' },
      { key: 'grossETB', label: 'Gross Volume (ETB)' },
      { key: 'platformFeeETB', label: 'Commission (ETB)' },
      { key: 'netPayoutETB', label: 'Net Host Payout (ETB)' },
    ];

    const csv = generateCsv(rows, headers);
    downloadCsv(`sheggar-monthly-earnings-${Date.now()}.csv`, csv);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Earnings & Payout Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track your vehicle fleet revenue in Ethiopian Birr (ETB) with monthly breakdown.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCsv} className="text-slate-300">
          <Download className="w-4 h-4 mr-1.5" />
          Export Payout CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Net Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatETB(totalEarnings)}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Accrued to your host wallet</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Days Rented</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalDays} Days</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across all approved vehicles</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Avg Payout Per Trip</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{formatETB(avgPayout)}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Average ticket value</span>
        </div>
      </div>

      {/* Monthly Recharts Bar Chart */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            Monthly Net Earnings (ETB)
          </h2>
          <span className="text-xs text-slate-400">Recharts Visualization</span>
        </div>

        <div className="h-64 w-full pt-2">
          {isClient && RechartsComponents ? (
            <RechartsComponents.ResponsiveContainer width="100%" height="100%">
              <RechartsComponents.BarChart data={monthlyData}>
                <RechartsComponents.CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <RechartsComponents.XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <RechartsComponents.YAxis stroke="#94a3b8" fontSize={11} />
                <RechartsComponents.Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [formatETB(val), 'Net Payout']}
                />
                <RechartsComponents.Bar
                  dataKey="netPayout"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                />
              </RechartsComponents.BarChart>
            </RechartsComponents.ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
              Loading chart visual...
            </div>
          )}
        </div>
      </div>

      {/* Accessible Financial Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Monthly Financial Breakdown</h2>
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="table-responsive">`n            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4 text-center">Rentals</th>
                  <th className="py-3 px-4 text-center">Days Rented</th>
                  <th className="py-3 px-4 text-right">Gross Total</th>
                  <th className="py-3 px-4 text-right">Platform Fee (10%)</th>
                  <th className="py-3 px-4 text-right font-black text-white">Net Payout (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {monthlyData.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{row.month}</td>
                    <td className="py-3 px-4 text-center">{row.bookingsCount}</td>
                    <td className="py-3 px-4 text-center">{row.daysCount}</td>
                    <td className="py-3 px-4 text-right">{formatETB(row.gross)}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatETB(row.fee)}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400">
                      {formatETB(row.netPayout)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/90 font-black text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3 px-4 text-white" colSpan={3}>
                    Lifetime Total
                  </td>
                  <td className="py-3 px-4 text-right">
                    {formatETB(monthlyData.reduce((s, r) => s + r.gross, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {formatETB(monthlyData.reduce((s, r) => s + r.fee, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-bold text-sm">
                    {formatETB(totalEarnings)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
