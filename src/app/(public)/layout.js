import PublicNavbar from '@/components/navigation/PublicNavbar';
import Link from 'next/link';
import { Car, Shield, Sparkles, MapPin } from 'lucide-react';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <PublicNavbar />
      <main className="flex-1">{children}</main>

      {/* Public Footer */}
      <footer className="bg-slate-900 text-slate-300 pt-14 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1: Brand Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <Car className="w-5 h-5" />
                </div>
                <span>Sheggar Wheels</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Addis Ababa’s peer-to-peer car sharing community. Connect with verified vehicle
                owners for trips across the capital and regional getaways.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Frontend demonstration capstone project</span>
              </div>
            </div>

            {/* Col 2: Neighbourhoods */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Key Hubs
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/cars?neighbourhood=Bole" className="hover:text-emerald-400">
                    Bole & Airport Corridor
                  </Link>
                </li>
                <li>
                  <Link href="/cars?neighbourhood=Kazanchis" className="hover:text-emerald-400">
                    Kazanchis (UNECA Zone)
                  </Link>
                </li>
                <li>
                  <Link href="/cars?neighbourhood=Piassa" className="hover:text-emerald-400">
                    Piassa & Arada
                  </Link>
                </li>
                <li>
                  <Link href="/cars?neighbourhood=Sarbet" className="hover:text-emerald-400">
                    Old Airport & Sarbet
                  </Link>
                </li>
                <li>
                  <Link href="/cars?neighbourhood=CMC" className="hover:text-emerald-400">
                    CMC & Ayat Residential
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Community & Trust */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Marketplace
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/cars" className="hover:text-emerald-400">
                    Browse All Vehicles
                  </Link>
                </li>
                <li>
                  <Link href="/signin?next=/owner/cars/new" className="hover:text-emerald-400">
                    List Your Vehicle
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-emerald-400">
                    Renter Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/owner" className="hover:text-emerald-400">
                    Host Console
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-emerald-400">
                    Admin Moderation
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Demo Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Simulation Platform</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                This app runs entirely in your browser using local storage state. All currency
                values (ETB), TeleBirr checkout numbers, and vehicle locations are simulated for
                testing.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>© 2026 Sheggar Wheels Addis Ababa. All rights reserved.</div>
            <div className="flex gap-4">
              <span>Demo Build v1.0.0</span>
              <span>•</span>
              <span>Next.js App Router</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
