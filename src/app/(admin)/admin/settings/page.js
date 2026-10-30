'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/useStore';
import Button from '@/components/ui/Button';
import {
  Settings,
  DollarSign,
  Clock,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  Info,
  Plus,
  X,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { settings, updateSettingsAction, resetSettingsAction, showToast } = useStore();

  const [formData, setFormData] = useState({
    platformCommissionRate: 10,
    bookingFeeFixed: 0,
    minRentalDays: 1,
    maxRentalDays: 30,
    cancellationGraceHours: 24,
    supportedNeighbourhoods: [],
    maintenanceNotice: '',
  });

  const [newZoneInput, setNewZoneInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        platformCommissionRate: settings.commissionPercent ?? settings.platformCommissionRate ?? 10,
        bookingFeeFixed: settings.bookingFeeFixed ?? 0,
        minRentalDays: settings.minRentalDays ?? 1,
        maxRentalDays: settings.maxRentalDays ?? 30,
        cancellationGraceHours: settings.cancellationGraceHours ?? 24,
        supportedNeighbourhoods: settings.supportedNeighbourhoods || [],
        maintenanceNotice: settings.maintenanceNotice || '',
      });
    }
  }, [settings]);

  const handleSave = (e) => {
    e.preventDefault();

    // Validation
    const comm = Number(formData.platformCommissionRate);
    if (isNaN(comm) || comm < 0 || comm > 50) {
      showToast('Commission rate must be between 0% and 50%', 'error');
      return;
    }

    const minDays = Number(formData.minRentalDays);
    const maxDays = Number(formData.maxRentalDays);
    if (isNaN(minDays) || minDays < 1) {
      showToast('Minimum rental days must be at least 1', 'error');
      return;
    }
    if (isNaN(maxDays) || maxDays < minDays) {
      showToast('Maximum rental days must be greater than minimum', 'error');
      return;
    }

    setLoading(true);
    const res = updateSettingsAction({
      ...formData,
      commissionPercent: comm,
      platformCommissionRate: comm,
      bookingFeeFixed: Number(formData.bookingFeeFixed) || 0,
      minRentalDays: minDays,
      maxRentalDays: maxDays,
      cancellationGraceHours: Number(formData.cancellationGraceHours) || 24,
    });
    setLoading(false);
  };

  const handleReset = () => {
    if (confirm('Reset platform settings back to default configuration?')) {
      resetSettingsAction();
    }
  };

  const handleAddZone = () => {
    if (!newZoneInput.trim()) return;
    const zone = newZoneInput.trim();
    if (formData.supportedNeighbourhoods.includes(zone)) {
      showToast('Zone already in supported list', 'info');
      return;
    }
    setFormData({
      ...formData,
      supportedNeighbourhoods: [...formData.supportedNeighbourhoods, zone],
    });
    setNewZoneInput('');
  };

  const handleRemoveZone = (zoneToRemove) => {
    setFormData({
      ...formData,
      supportedNeighbourhoods: formData.supportedNeighbourhoods.filter((z) => z !== zoneToRemove),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-rose-500" />
            Platform & Marketplace Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure financial fee models, rental duration boundaries, cancellation rules, and serviced Addis Ababa zones.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset to Defaults
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Financial & Commission */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Marketplace Monetization & Fees
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Platform Commission Rate (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={formData.platformCommissionRate}
                  onChange={(e) =>
                    setFormData({ ...formData, platformCommissionRate: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white pr-8 focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Portion of gross rental subtotal retained by Sheggar Wheels (default: 10%).
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Fixed Demo Booking Surcharge (ETB)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.bookingFeeFixed}
                  onChange={(e) =>
                    setFormData({ ...formData, bookingFeeFixed: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white pr-12 focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  ETB
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Flat processing surcharge applied per reservation (default: 0 ETB).
              </p>
            </div>
          </div>
        </div>

        {/* Rental Rules & Cancellation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
            <Clock className="w-4 h-4 text-blue-400" />
            Duration Limits & Cancellation Policy
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Minimum Rental Days *
              </label>
              <input
                type="number"
                min="1"
                max="14"
                value={formData.minRentalDays}
                onChange={(e) =>
                  setFormData({ ...formData, minRentalDays: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Shortest allowable booking duration.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Maximum Rental Days *
              </label>
              <input
                type="number"
                min="2"
                max="90"
                value={formData.maxRentalDays}
                onChange={(e) =>
                  setFormData({ ...formData, maxRentalDays: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Longest allowable booking duration.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Cancellation Grace Window (Hours)
              </label>
              <input
                type="number"
                min="0"
                max="72"
                value={formData.cancellationGraceHours}
                onChange={(e) =>
                  setFormData({ ...formData, cancellationGraceHours: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Hours before trip for full mock refund.</p>
            </div>
          </div>
        </div>

        {/* Coverage Zones */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
            <MapPin className="w-4 h-4 text-rose-500" />
            Serviced Addis Ababa Neighbourhoods
          </div>

          <div className="text-xs space-y-3">
            <div className="flex flex-wrap gap-2">
              {formData.supportedNeighbourhoods.map((zone) => (
                <span
                  key={zone}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium"
                >
                  <MapPin className="w-3 h-3 text-rose-500" />
                  {zone}
                  <button
                    type="button"
                    onClick={() => handleRemoveZone(zone)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-sm pt-2">
              <input
                type="text"
                placeholder="Add neighbourhood (e.g. Lebu, Summit)..."
                value={newZoneInput}
                onChange={(e) => setNewZoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddZone();
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddZone}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Maintenance Notice */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Demo Maintenance Notice Banner
          </div>

          <div className="text-xs space-y-2">
            <label className="block font-semibold text-slate-300">
              Global Platform Announcement Text (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.maintenanceNotice}
              onChange={(e) =>
                setFormData({ ...formData, maintenanceNotice: e.target.value })
              }
              placeholder="e.g. Sheggar Wheels is performing scheduled demo maintenance on Sunday at 02:00 UTC..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="bg-rose-600 hover:bg-rose-500 px-6 py-2.5 font-bold"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
