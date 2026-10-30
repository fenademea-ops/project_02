'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { formatETB } from '@/lib/format';
import { isCarAvailableForDates } from '@/lib/validation';
import CarImageFallback from '@/components/ui/CarImageFallback';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import {
  Search,
  Filter,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Users,
  Car as CarIcon,
  Sparkles,
} from 'lucide-react';

const NEIGHBOURHOODS = [
  'All',
  'Bole',
  'Kazanchis',
  'Piassa',
  'Sarbet',
  'CMC',
  'Megenagna',
  'Gerji',
];

const TRANSMISSIONS = ['All', 'Automatic', 'Manual'];
const SEAT_OPTIONS = [
  { label: 'Any seats', value: '0' },
  { label: '4+ seats', value: '4' },
  { label: '5+ seats', value: '5' },
  { label: '7+ seats', value: '7' },
];

const SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Newest Listings', value: 'newest' },
  { label: 'Popularity', value: 'popularity' },
];

const PAGE_SIZE = 6;

function CarsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { approvedCars, bookings } = useStore();

  // Read URL params
  const initialSearch = searchParams.get('q') || '';
  const initialNeighbourhood = searchParams.get('neighbourhood') || 'All';
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialTransmission = searchParams.get('transmission') || 'All';
  const initialSeats = searchParams.get('seats') || '0';
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const initialSort = searchParams.get('sort') || 'price-asc';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  // Component local states synced with URL
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [neighbourhood, setNeighbourhood] = useState(initialNeighbourhood);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [transmission, setTransmission] = useState(initialTransmission);
  const [minSeats, setMinSeats] = useState(initialSeats);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [sortBy, setSortBy] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync state to URL params whenever filters change
  const updateUrlParams = (newParams) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val && val !== 'All' && val !== '0' && val !== '') {
        params.set(key, String(val));
      } else {
        params.delete(key);
      }
    });
    router.replace(`/cars?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (key, value) => {
    setCurrentPage(1); // Clamp back to page 1 on filter alteration
    updateUrlParams({
      q: key === 'q' ? value : searchQuery,
      neighbourhood: key === 'neighbourhood' ? value : neighbourhood,
      minPrice: key === 'minPrice' ? value : minPrice,
      maxPrice: key === 'maxPrice' ? value : maxPrice,
      transmission: key === 'transmission' ? value : transmission,
      seats: key === 'seats' ? value : minSeats,
      startDate: key === 'startDate' ? value : startDate,
      endDate: key === 'endDate' ? value : endDate,
      sort: key === 'sort' ? value : sortBy,
      page: 1,
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setNeighbourhood('All');
    setMinPrice('');
    setMaxPrice('');
    setTransmission('All');
    setMinSeats('0');
    setStartDate('');
    setEndDate('');
    setSortBy('price-asc');
    setCurrentPage(1);
    router.replace('/cars', { scroll: false });
  };

  // Filter & Sort computation
  const filteredCars = useMemo(() => {
    return approvedCars.filter((car) => {
      // 1. Text search (make, model, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${car.make} ${car.model} ${car.description} ${car.neighbourhood}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // 2. Neighbourhood
      if (neighbourhood !== 'All' && car.neighbourhood.toLowerCase() !== neighbourhood.toLowerCase()) {
        return false;
      }

      // 3. Min Price
      if (minPrice && car.pricePerDay < Number(minPrice)) {
        return false;
      }

      // 4. Max Price
      if (maxPrice && car.pricePerDay > Number(maxPrice)) {
        return false;
      }

      // 5. Transmission
      if (transmission !== 'All' && car.transmission.toLowerCase() !== transmission.toLowerCase()) {
        return false;
      }

      // 6. Seats
      if (minSeats !== '0' && car.seats < Number(minSeats)) {
        return false;
      }

      // 7. Date range availability check
      if (startDate && endDate) {
        const available = isCarAvailableForDates(
          car.id,
          startDate,
          endDate,
          bookings,
          car.unavailableDates
        );
        if (!available.available) {
          return false;
        }
      }

      return true;
    });
  }, [
    approvedCars,
    bookings,
    searchQuery,
    neighbourhood,
    minPrice,
    maxPrice,
    transmission,
    minSeats,
    startDate,
    endDate,
  ]);

  // Sort cars
  const sortedCars = useMemo(() => {
    const list = [...filteredCars];
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => a.pricePerDay - b.pricePerDay);
      case 'price-desc':
        return list.sort((a, b) => b.pricePerDay - a.pricePerDay);
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'popularity':
        // Count bookings per car
        return list.sort((a, b) => {
          const countA = bookings.filter((bk) => bk.carId === a.id).length;
          const countB = bookings.filter((bk) => bk.carId === b.id).length;
          return countB - countA;
        });
      default:
        return list;
    }
  }, [filteredCars, sortBy, bookings]);

  // Pagination slicing
  const totalPages = Math.ceil(sortedCars.length / PAGE_SIZE);
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const paginatedCars = sortedCars.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const hasActiveFilters =
    searchQuery ||
    neighbourhood !== 'All' ||
    minPrice ||
    maxPrice ||
    transmission !== 'All' ||
    minSeats !== '0' ||
    startDate ||
    endDate;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Browse Addis Ababa Vehicles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Showing verified peer-to-peer car listings in Sheggar.
          </p>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              handleFilterChange('sort', e.target.value);
            }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left Filters Sidebar + Right Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                Filters
              </h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vehicle Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Toyota, RAV4, Hybrid..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleFilterChange('q', e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            {/* Neighbourhood */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Neighbourhood
              </label>
              <select
                value={neighbourhood}
                onChange={(e) => {
                  setNeighbourhood(e.target.value);
                  handleFilterChange('neighbourhood', e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
              >
                {NEIGHBOURHOODS.map((n) => (
                  <option key={n} value={n}>
                    {n === 'All' ? 'All Neighbourhoods' : n}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range (ETB) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Price Range (ETB / day)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min ETB"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    handleFilterChange('minPrice', e.target.value);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 min-h-[40px]"
                />
                <input
                  type="number"
                  placeholder="Max ETB"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    handleFilterChange('maxPrice', e.target.value);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 min-h-[40px]"
                />
              </div>
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Transmission
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TRANSMISSIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTransmission(t);
                      handleFilterChange('transmission', t);
                    }}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border cursor-pointer min-h-[40px] flex items-center justify-center transition-all ${transmission === t
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Seats */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Minimum Capacity
              </label>
              <select
                value={minSeats}
                onChange={(e) => {
                  setMinSeats(e.target.value);
                  handleFilterChange('seats', e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 min-h-[40px]"
              >
                {SEAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability Dates */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Check Specific Dates
              </label>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    handleFilterChange('startDate', e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 min-h-[40px]"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    handleFilterChange('endDate', e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 min-h-[40px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cars Results Grid */}
        <div className="lg:col-span-3 space-y-6">
          {paginatedCars.length === 0 ? (
            <EmptyState
              title="No cars match your filters"
              description="Try broadening your search keywords, clearing selected dates, or expanding the price range."
              actionLabel="Reset All Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedCars.map((car) => {
                const isMaintenance = car.availabilityStatus === 'maintenance';
                const isUnavailable = car.isAvailable === false || ['temporarily_unavailable', 'unavailable'].includes(car.availabilityStatus);

                return (
                  <Card key={car.id} hover className="flex flex-col group h-full">
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <CarImageFallback
                        src={car.photos[0]}
                        alt={`${car.make} ${car.model}`}
                        fill
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        {car.neighbourhood}
                      </div>

                      {isMaintenance && (
                        <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          Maintenance
                        </div>
                      )}
                      {!isMaintenance && isUnavailable && (
                        <div className="absolute top-3 right-3 bg-rose-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          Unavailable
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>
                            {car.year} • {car.transmission}
                          </span>
                          <span>{car.seats} Seats</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {car.make} {car.model}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                          {car.description}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400">Daily rate</span>
                          <div className="text-base font-extrabold text-emerald-600">
                            {formatETB(car.pricePerDay)}
                          </div>
                        </div>
                        <Link href={`/cars/${car.id}`}>
                          <Button variant={isMaintenance || isUnavailable ? 'secondary' : 'primary'} size="sm">
                            {isMaintenance || isUnavailable ? 'View Details' : 'View & Book'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {sortedCars.length > 0 && (
            <Pagination
              currentPage={clampedPage}
              totalPages={totalPages}
              totalItems={sortedCars.length}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => {
                setCurrentPage(page);
                updateUrlParams({ page });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CarsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CarsContent />
    </Suspense>
  );
}
