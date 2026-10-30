'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import { formatETB } from '@/lib/format';
import CarImageFallback from '@/components/ui/CarImageFallback';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  Search,
  MapPin,
  Calendar,
  ShieldCheck,
  Zap,
  Users,
  Star,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Clock,
  Fuel,
} from 'lucide-react';

const NEIGHBOURHOODS = [
  'All Neighbourhoods',
  'Bole',
  'Kazanchis',
  'Piassa',
  'Sarbet',
  'CMC',
  'Megenagna',
  'Gerji',
];

export default function HomePage() {
  const router = useRouter();
  const { approvedCars } = useStore();

  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('All Neighbourhoods');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedNeighbourhood && selectedNeighbourhood !== 'All Neighbourhoods') {
      params.set('neighbourhood', selectedNeighbourhood);
    }
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    router.push(`/cars?${params.toString()}`);
  };

  const featuredCars = approvedCars.slice(0, 4);

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-900 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Addis Ababa&apos;s Premier Peer-to-Peer Car Sharing
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Rent verified cars from trusted hosts in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300">
              Sheggar
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg leading-relaxed">
            Skip bureaucratic car rental desks. Book high-clearance SUVs, hybrid crossovers, and
            agile sedans parked right in Bole, Kazanchis, Piassa, and Sarbet.
          </p>

          {/* Quick Search Card */}
          <div className="pt-6 max-w-4xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-200/80 text-slate-900 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end"
            >
              {/* Neighbourhood dropdown */}
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Pickup Zone
                </label>
                <select
                  value={selectedNeighbourhood}
                  onChange={(e) => setSelectedNeighbourhood(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  {NEIGHBOURHOODS.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Trip Start
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              {/* End Date */}
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Trip End
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              {/* Search button */}
              <div>
                <Button type="submit" variant="primary" size="md" className="w-full font-bold">
                  <Search className="w-4 h-4 mr-1.5" />
                  Search Fleet
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. Value Props Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Verified Addis Hosts</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each host and vehicle profile passes thorough inspection.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">TeleBirr Instant Mock</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulated fast mobile checkout with transparent ETB pricing.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Neighbourhood Pickup</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick up near Bole Medhanialem, Kazanchis, or CMC.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Flexible Durations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                From single-day city runs to multi-week regional expeditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Cars Carousel / Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Handpicked Fleet
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Top Rated Vehicles in Addis
            </h2>
          </div>
          <Link
            href="/cars"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            <span>View all vehicles ({approvedCars.length})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCars.map((car) => (
            <Card key={car.id} hover className="flex flex-col group">
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
                    <span className="text-xs text-slate-400">Daily rate</span>
                    <div className="text-base font-extrabold text-emerald-600">
                      {formatETB(car.pricePerDay)}
                    </div>
                  </div>
                  <Link href={`/cars/${car.id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="bg-slate-100 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Simple & Transparent
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              How Sheggar Wheels Works
            </h2>
            <p className="text-sm text-slate-500 max-w-xl mx-auto mt-2">
              Get behind the wheel in three effortless steps without paperwork headaches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 text-left space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Choose Your Ride</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter by neighborhood, price range, transmission, and exact trip dates. Read
                authentic reviews from fellow Addis drivers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 text-left space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Reserve & Confirm</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submit your booking. The car owner reviews and approves the reservation. Complete
                demo TeleBirr checkout with zero transaction fees.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 text-left space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Key Handover & Drive</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Meet your local host at the agreed pickup zone in Bole, Kazanchis, or Piassa.
                Inspect the vehicle and enjoy your journey!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Addis Ababa Neighbourhoods Hub */}
      <section id="neighbourhoods" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Explore Addis Ababa
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Cars In Every Major District
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Whether you need a car near Bole International Airport or diplomatic UNECA Kazanchis.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: 'Bole', desc: 'Airport corridor & dining', count: 3 },
            { name: 'Kazanchis', desc: 'UNECA & embassies', count: 2 },
            { name: 'Piassa', desc: 'Historic center & jewelry', count: 1 },
            { name: 'Sarbet', desc: 'Old Airport & AU area', count: 2 },
            { name: 'CMC', desc: 'Eastern residential hub', count: 1 },
          ].map((nh) => (
            <Link
              key={nh.name}
              href={`/cars?neighbourhood=${nh.name}`}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {nh.name}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{nh.desc}</div>
              <div className="text-[10px] font-semibold text-emerald-600 mt-2">
                Browse listings →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Host Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Host on Sheggar Wheels
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              Earn up to 60,000 ETB / month sharing your car
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Offset your vehicle maintenance and loan payments. You decide the schedule, set the
              daily price, and approve every renter.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/signin?next=/owner/cars/new">
              <Button variant="amber" size="lg" className="w-full sm:w-auto font-bold">
                List Your Vehicle
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/cars">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-white border-slate-700 bg-white/10 hover:bg-white/20"
              >
                Browse Fleet First
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
