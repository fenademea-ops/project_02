'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { formatETB } from '@/lib/format';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import CarImageFallback from '@/components/ui/CarImageFallback';
import {
  Layers,
  Search,
  Car,
  DollarSign,
  Users,
  Compass,
  ArrowRight,
  PlusCircle,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const CATEGORY_DEFINITIONS = [
  {
    id: 'economy',
    name: 'Economy Compact',
    description: 'Fuel-efficient, easy-to-park city cars ideal for navigating Addis Ababa traffic and daily errands.',
    typicalModels: ['Toyota Vitz', 'Suzuki Swift', 'Toyota Yaris'],
    seatCapacity: '4–5 Seats',
    benchmarkPrice: 2800,
    icon: 'compact',
  },
  {
    id: 'sedan',
    name: 'Mid-Size Sedan',
    description: 'Comfortable, stylish commuter sedans with air conditioning, perfect for executive commuting and airport pickups.',
    typicalModels: ['Toyota Corolla', 'Hyundai Elantra', 'Honda Civic'],
    seatCapacity: '5 Seats',
    benchmarkPrice: 4200,
    icon: 'sedan',
  },
  {
    id: 'suv',
    name: 'Crossover & Compact SUV',
    description: 'High ground clearance, smooth all-wheel drive, and generous cargo capacity for family trips down to Bishoftu.',
    typicalModels: ['Toyota RAV4 Hybrid', 'Hyundai Tucson', 'Kia Sportage'],
    seatCapacity: '5 Seats',
    benchmarkPrice: 5500,
    icon: 'suv',
  },
  {
    id: '4wd',
    name: 'Full-Size 4WD & Off-Road',
    description: 'Heavy-duty 4-wheel-drive vehicles designed for long-distance Ethiopian travel, safari expeditions, and rugged terrain.',
    typicalModels: ['Toyota Land Cruiser Prado V6', 'Nissan Patrol', 'Mitsubishi Pajero'],
    seatCapacity: '7 Seats',
    benchmarkPrice: 11000,
    icon: '4wd',
  },
  {
    id: 'van',
    name: 'Passenger Van & Minibus',
    description: 'High-capacity passenger vans tailored for church groups, wedding parties, corporate delegations, and group airport shuttles.',
    typicalModels: ['Toyota HiAce', 'Toyota Quantum'],
    seatCapacity: '12–15 Seats',
    benchmarkPrice: 8500,
    icon: 'van',
  },
  {
    id: 'hybrid',
    name: 'Electric & Hybrid Vehicles',
    description: 'Modern hybrid and pure electric fleet reducing fuel consumption and emissions in the capital.',
    typicalModels: ['Toyota RAV4 Hybrid AWD', 'BYD Song Plus', 'Toyota Prius'],
    seatCapacity: '5 Seats',
    benchmarkPrice: 4800,
    icon: 'hybrid',
  },
  {
    id: 'luxury',
    name: 'Luxury & VIP Fleet',
    description: 'Premium prestige vehicles with leather trim, chauffeur options, and executive status for VIP diplomatic events.',
    typicalModels: ['Land Cruiser V8 VIP', 'Mercedes-Benz E-Class'],
    seatCapacity: '5–7 Seats',
    benchmarkPrice: 18000,
    icon: 'luxury',
  },
];

export default function AdminCategoriesPage() {
  const { cars } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectCategory, setInspectCategory] = useState(null);

  // Group cars into categories based on keywords
  const enrichedCategories = useMemo(() => {
    return CATEGORY_DEFINITIONS.map((cat) => {
      const matchingCars = cars.filter((c) => {
        const text = `${c.make} ${c.model} ${c.description || ''} ${c.features?.join(' ') || ''}`.toLowerCase();
        if (cat.id === 'hybrid') {
          return text.includes('hybrid') || text.includes('electric') || text.includes('ev');
        }
        if (cat.id === '4wd') {
          return text.includes('prado') || text.includes('land cruiser') || text.includes('patrol') || text.includes('4wd');
        }
        if (cat.id === 'van') {
          return text.includes('van') || text.includes('hiace') || (c.seats && c.seats >= 8);
        }
        if (cat.id === 'suv') {
          return text.includes('rav4') || text.includes('suv') || text.includes('tucson') || text.includes('crossover');
        }
        if (cat.id === 'sedan') {
          return text.includes('corolla') || text.includes('sedan') || text.includes('elantra') || text.includes('civic');
        }
        if (cat.id === 'economy') {
          return text.includes('vitz') || text.includes('swift') || text.includes('yaris') || text.includes('compact');
        }
        if (cat.id === 'luxury') {
          return (c.pricePerDay && c.pricePerDay >= 10000) || text.includes('luxury') || text.includes('vip');
        }
        return false;
      });

      const approvedCars = matchingCars.filter((c) => c.status === 'approved');
      const prices = approvedCars.map((c) => c.pricePerDay).filter(Boolean);
      const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : cat.benchmarkPrice;
      const minPrice = prices.length > 0 ? Math.min(...prices) : cat.benchmarkPrice;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : cat.benchmarkPrice;

      return {
        ...cat,
        totalCars: matchingCars.length,
        approvedCars: approvedCars.length,
        avgPrice,
        minPrice,
        maxPrice,
        carsList: matchingCars,
        sampleImage: matchingCars[0]?.photos?.[0],
      };
    });
  }, [cars]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return enrichedCategories;
    const q = searchQuery.toLowerCase();
    return enrichedCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.typicalModels.some((m) => m.toLowerCase().includes(q))
    );
  }, [enrichedCategories, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Vehicle Categories & Segments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organize fleet categories, monitor segment rate averages, and guide vehicle pricing across Addis Ababa.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl group"
          >
            <div className="space-y-4">
              {/* Card top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-rose-400 font-bold shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight group-hover:text-rose-400 transition-colors">
                      {cat.name}
                    </h3>
                    <span className="text-[10px] text-slate-500">{cat.seatCapacity}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 shrink-0">
                  {cat.totalCars} Listed
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 line-clamp-2">
                {cat.description}
              </p>

              {/* Typical models chips */}
              <div className="flex flex-wrap gap-1">
                {cat.typicalModels.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded-md text-[10px] bg-slate-950 border border-slate-800/80 text-slate-300 font-medium"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Rate Stats */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Avg Rate</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {formatETB(cat.avgPrice)}/day
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Active Range</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {formatETB(cat.minPrice)} – {formatETB(cat.maxPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-4">
              <span className="text-xs text-slate-500">
                {cat.approvedCars} Approved Fleet
              </span>
              <button
                onClick={() => setInspectCategory(cat)}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Inspect Fleet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Category Modal */}
      {inspectCategory && (
        <Modal
          isOpen={!!inspectCategory}
          onClose={() => setInspectCategory(null)}
          title={`${inspectCategory.name} — Fleet Breakdown`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <p>{inspectCategory.description}</p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Benchmark Daily Rate</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {formatETB(inspectCategory.avgPrice)} / day
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase">Fleet Count</span>
                <span className="text-sm font-bold text-white">
                  {inspectCategory.carsList.length} Vehicles
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">
                Matching Listed Vehicles
              </h4>

              {inspectCategory.carsList.length === 0 ? (
                <p className="text-slate-500 italic p-3 bg-slate-950 rounded-xl">
                  No active vehicles currently listed under this category.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {inspectCategory.carsList.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-10 h-8 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                          <CarImageFallback src={c.photos?.[0]} alt={c.model} fill />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {c.make} {c.model} ({c.year})
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatETB(c.pricePerDay)}/day • {c.neighbourhood || 'Addis Ababa'}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                href="/admin/listings"
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                Go to Fleet & Listings →
              </Link>
              <Button variant="secondary" onClick={() => setInspectCategory(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
