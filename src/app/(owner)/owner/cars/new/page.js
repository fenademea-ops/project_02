'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ArrowLeft, Car, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

const NEIGHBOURHOODS = ['Bole', 'Kazanchis', 'Piassa', 'Sarbet', 'CMC', 'Megenagna', 'Gerji', 'Old Airport'];
const FEATURE_OPTIONS = [
  'Air Conditioning',
  'Bluetooth',
  'Apple CarPlay',
  'Backup Camera',
  'Leather Seats',
  'Sunroof',
  '4x4 / AWD',
  '7 Seats',
  'Keyless Entry',
  'Roof Rack',
];

export default function NewCarPage() {
  const router = useRouter();
  const { createCar, showToast } = useStore();

  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2022);
  const [transmission, setTransmission] = useState('Automatic');
  const [seats, setSeats] = useState(5);
  const [neighbourhood, setNeighbourhood] = useState('Bole');
  const [pricePerDay, setPricePerDay] = useState(3500);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
  );
  const [description, setDescription] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState(['Air Conditioning', 'Bluetooth']);
  const [loading, setLoading] = useState(false);

  const toggleFeature = (feat) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!model.trim() || !description.trim()) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    setLoading(true);
    const res = createCar({
      make,
      model,
      year: Number(year),
      transmission,
      seats: Number(seats),
      neighbourhood,
      pricePerDay: Number(pricePerDay),
      photos: [photoUrl],
      description,
      features: selectedFeatures,
    });
    setLoading(false);

    if (res.success) {
      router.push('/owner/cars');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/owner/cars"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Fleet
      </Link>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Addis Ababa Fleet Expansion
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          List a New Vehicle
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Newly registered listings will be placed into <strong className="text-amber-400">pending</strong> status
          for administrative safety verification.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800/80 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md">
        {/* Section 1: Basic Specifications */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-700 pb-2">
            1. Vehicle Identity & Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Make</label>
              <input
                type="text"
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Toyota, Hyundai, Suzuki"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Model</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. RAV4, Elantra, Prado"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
              <input
                type="number"
                min={2005}
                max={2026}
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Handover District (Addis Ababa)
              </label>
              <select
                value={neighbourhood}
                onChange={(e) => setNeighbourhood(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              >
                {NEIGHBOURHOODS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Technical Specs & Price */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-700 pb-2">
            2. Specs & Daily Pricing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Transmission</label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              >
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Passenger Seats</label>
              <input
                type="number"
                min={2}
                max={12}
                required
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Daily Price (ETB)
              </label>
              <input
                type="number"
                min={500}
                max={100000}
                required
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Photo & Description */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-700 pb-2">
            3. Photo & Overview
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Vehicle Photo URL
            </label>
            <input
              type="url"
              required
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default stock photo pre-filled. Fallback placeholder applies if image fails.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Vehicle Description
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlight fuel efficiency, cleanliness, pickup spot instructions, or travel restrictions..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Section 4: Features Checkboxes */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white border-b border-slate-700 pb-2">
            4. Features & Extras
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FEATURE_OPTIONS.map((feat) => {
              const checked = selectedFeatures.includes(feat);
              return (
                <button
                  type="button"
                  key={feat}
                  onClick={() => toggleFeature(feat)}
                  className={`p-2.5 rounded-lg border text-xs text-left cursor-pointer flex items-center justify-between transition-colors ${
                    checked
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{feat}</span>
                  {checked && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3">
          <Link href="/owner/cars">
            <Button variant="ghost" size="md" className="text-slate-400 hover:text-white">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="font-bold bg-emerald-600 hover:bg-emerald-500"
          >
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
}
