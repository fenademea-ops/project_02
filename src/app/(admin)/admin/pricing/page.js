'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/useStore';
import { formatETB } from '@/lib/format';
import Button from '@/components/ui/Button';
import {
  DollarSign,
  Percent,
  Clock,
  ShieldCheck,
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
  Car,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function AdminPricingPage() {
  const { settings, updateSettingsAction, resetSettingsAction, showToast } = useStore();

  const [formData, setFormData] = useState({
    commissionPercent: 10,
    minRentalDays: 1,
    maxRentalDays: 30,
    cancellationGraceHours: 24,
    chauffeurDailyRate: 1500,
    securityDepositStandard: 5000,
  });

  const [saving, setSaving] = useState(false);

  // Simulator state
  const [simDailyRate, setSimDailyRate] = useState(4500);
  const [simDays, setSimDays] = useState(4);
  const [simIncludeDriver, setSimIncludeDriver] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        commissionPercent: settings.commissionPercent ?? 10,
        minRentalDays: settings.minRentalDays ?? 1,
        maxRentalDays: settings.maxRentalDays ?? 30,
        cancellationGraceHours: settings.cancellationGraceHours ?? 24,
        chauffeurDailyRate: settings.chauffeurDailyRate ?? 1500,
        securityDepositStandard: settings.securityDepositStandard ?? 5000,
      });
    }
  }, [settings]);

  // Simulator calculation
  const simulation = useMemo(() => {
    const rate = Math.max(0, Number(simDailyRate) || 0);
    const days = Math.max(1, Number(simDays) || 1);
    const commPct = Math.max(0, Number(formData.commissionPercent) || 0);
    const driverFee = simIncludeDriver ? (Number(formData.chauffeurDailyRate) || 0) * days : 0;

    const baseRentalSubtotal = rate * days;
    const platformFee = Math.round(baseRentalSubtotal * (commPct / 100));
    const totalRenterCost = baseRentalSubtotal + platformFee + driverFee;
    const hostNetPayout = baseRentalSubtotal + driverFee;

    return {
      rate,
      days,
      baseRentalSubtotal,
      platformFee,
      driverFee,
      totalRenterCost,
      hostNetPayout,
    };
  }, [simDailyRate, simDays, simIncludeDriver, formData.commissionPercent, formData.chauffeurDailyRate]);

  const handleSave = (e) => {
    e.preventDefault();

    const comm = Number(formData.commissionPercent);
    if (isNaN(comm) || comm < 0 || comm > 50) {
      showToast('Commission rate must be between 0% and 50%', 'error');
      return;
    }

    const minDays = Number(formData.minRentalDays);
    const maxDays = Number(formData.maxRentalDays);
    if (isNaN(minDays) || minDays < 1) {
      showToast('Minimum rental days must be at least 1 day', 'error');
      return;
    }
    if (isNaN(maxDays) || maxDays < minDays) {
      showToast('Maximum rental days must be greater than minimum duration', 'error');
      return;
    }

    const graceHours = Number(formData.cancellationGraceHours);
    if (isNaN(graceHours) || graceHours < 0) {
      showToast('Cancellation grace period cannot be negative', 'error');
      return;
    }

    setSaving(true);
    const res = updateSettingsAction({
      commissionPercent: comm,
      minRentalDays: minDays,
      maxRentalDays: maxDays,
      cancellationGraceHours: graceHours,
      chauffeurDailyRate: Number(formData.chauffeurDailyRate) || 1500,
      securityDepositStandard: Number(formData.securityDepositStandard) || 5000,
    });
    setSaving(false);

    if (res.success) {
      showToast('Platform pricing rules saved and updated globally', 'success');
    }
  };

  const handleReset = () => {
    if (confirm('Reset platform pricing parameters to standard Sheggar Wheels defaults?')) {
      resetSettingsAction();
      showToast('Pricing rules reset to default parameters', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Rental Pricing & Fee Configuration
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure platform commission fees, rental duration boundaries, chauffeur add-ons, and test pricing formulas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleReset} className="text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Core Marketplace Fees</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Applied automatically to all renter checkouts and host payouts across Addis Ababa.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Active Setting
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Platform Commission */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Platform Commission Fee (% of Subtotal)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={formData.commissionPercent}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Default standard is 10%. Retained by Sheggar Wheels for insurance and platform operations.
                </p>
              </div>

              {/* Cancellation Grace */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cancellation Grace Period (Hours)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="72"
                    value={formData.cancellationGraceHours}
                    onChange={(e) => setFormData({ ...formData, cancellationGraceHours: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Renters can cancel penalty-free up to this many hours before the scheduled pickup.
                </p>
              </div>

              {/* Min Days */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Minimum Rental Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={formData.minRentalDays}
                  onChange={(e) => setFormData({ ...formData, minRentalDays: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Max Days */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Maximum Rental Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.maxRentalDays}
                  onChange={(e) => setFormData({ ...formData, maxRentalDays: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Chauffeur Add-on Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Optional Chauffeur Add-on (ETB / Day)
                </label>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  value={formData.chauffeurDailyRate}
                  onChange={(e) => setFormData({ ...formData, chauffeurDailyRate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Security Deposit Standard */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Standard Security Deposit Hold (ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  step="500"
                  value={formData.securityDepositStandard}
                  onChange={(e) => setFormData({ ...formData, securityDepositStandard: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <Button type="submit" variant="primary" disabled={saving}>
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? 'Saving...' : 'Save Platform Pricing'}
              </Button>
            </div>
          </form>

          {/* Benchmark Guidance Table */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Addis Ababa Market Rate Benchmarks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Vehicle Class</th>
                    <th className="py-2.5 px-3">Representative Models</th>
                    <th className="py-2.5 px-3">Recommended Daily Range</th>
                    <th className="py-2.5 px-3">Typical Target Segment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Economy Compact</td>
                    <td className="py-2.5 px-3 text-slate-400">Toyota Vitz, Suzuki Swift, Yaris</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">2,200 – 3,500 ETB</td>
                    <td className="py-2.5 px-3">City Commuters, Daily Drivers</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Mid-Size Sedan</td>
                    <td className="py-2.5 px-3 text-slate-400">Toyota Corolla, Hyundai Elantra</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">3,500 – 5,000 ETB</td>
                    <td className="py-2.5 px-3">Business & Airport Transfers</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Crossover / Compact SUV</td>
                    <td className="py-2.5 px-3 text-slate-400">Toyota RAV4 Hybrid, Hyundai Tucson</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">4,500 – 7,500 ETB</td>
                    <td className="py-2.5 px-3">Family Outings, Bishoftu Trips</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Full-Size 4WD SUV</td>
                    <td className="py-2.5 px-3 text-slate-400">Land Cruiser Prado V6, Patrol</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">9,000 – 16,000 ETB</td>
                    <td className="py-2.5 px-3">Upcountry Travel & Rugged Terrain</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-white">Passenger Van</td>
                    <td className="py-2.5 px-3 text-slate-400">Toyota HiAce, Quantum</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">7,000 – 12,000 ETB</td>
                    <td className="py-2.5 px-3">Group Tours & Events</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Live Pricing Formula Simulator */}
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5 shadow-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
              <Calculator className="w-4 h-4 text-rose-400" />
              <span>Rental Formula Simulator</span>
            </div>
            <p className="text-xs text-slate-400">
              Test how custom rates and durations calculate split margins in real-time.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Daily Vehicle Rate (ETB):</label>
                <input
                  type="number"
                  min="500"
                  max="100000"
                  step="500"
                  value={simDailyRate}
                  onChange={(e) => setSimDailyRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Rental Duration (Days):</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={simDays}
                  onChange={(e) => setSimDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="simDriver"
                  checked={simIncludeDriver}
                  onChange={(e) => setSimIncludeDriver(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="simDriver" className="text-slate-300 cursor-pointer">
                  Include Chauffeur Driver (+{formatETB(formData.chauffeurDailyRate)}/day)
                </label>
              </div>
            </div>

            {/* Visual Calculation Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Vehicle Subtotal ({simulation.days}d @ {formatETB(simulation.rate)}):</span>
                <span className="font-mono text-white">{formatETB(simulation.baseRentalSubtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Platform Commission ({formData.commissionPercent}%):</span>
                <span className="font-mono text-emerald-400">+{formatETB(simulation.platformFee)}</span>
              </div>

              {simulation.driverFee > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Chauffeur Service ({simulation.days}d):</span>
                  <span className="font-mono text-white">+{formatETB(simulation.driverFee)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white text-sm">
                <span>Renter Total Charged:</span>
                <span className="text-emerald-400 font-mono">{formatETB(simulation.totalRenterCost)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex justify-between text-[11px] text-slate-400">
                <span>Host Net Settlement:</span>
                <span className="font-mono text-white font-semibold">{formatETB(simulation.hostNetPayout)}</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Sheggar Wheels Retained:</span>
                <span className="font-mono text-emerald-400 font-semibold">{formatETB(simulation.platformFee)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
