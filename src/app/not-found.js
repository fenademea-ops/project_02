import Link from 'next/link';
import { Car, Compass, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
          <Car className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            404 Error
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Off the Beaten Path
          </h1>
          <p className="text-sm text-slate-500">
            The page you are looking for does not exist or has been relocated to another
            neighbourhood in Addis Ababa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/cars" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full">
              <Compass className="w-4 h-4 mr-2" />
              Browse Vehicles
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
