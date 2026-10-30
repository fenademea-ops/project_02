'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/useStore';
import Button from '@/components/ui/Button';
import { ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function EditCarPage({ params }) {
  const unwrappedParams = use(params);
  const carId = unwrappedParams.id;
  const router = useRouter();

  const { cars, currentUser, updateCar, showToast } = useStore();

  const car = cars.find((c) => c.id === carId);

  // Negative test rule: Owner editing another owner's car via URL ID is refused
  if (car && currentUser && car.ownerId !== currentUser.id && !currentUser.roles.includes('admin')) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-900/40 text-rose-400 flex items-center justify-center mx-auto border border-rose-700">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Access Denied: Not Yours</h1>
        <p className="text-xs text-slate-400">
          You cannot edit a vehicle that does not belong to your account.
        </p>
        <Link href="/owner/cars">
          <Button variant="primary" size="sm">
            Back to My Fleet
          </Button>
        </Link>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Vehicle Not Found</h1>
        <Link href="/owner/cars">
          <Button variant="outline" size="sm">
            Back to Fleet
          </Button>
        </Link>
      </div>
    );
  }

  return <EditCarForm car={car} onCancel={() => router.push('/owner/cars')} />;
}

function EditCarForm({ car, onCancel }) {
  const router = useRouter();
  const { updateCar, showToast } = useStore();

  const [pricePerDay, setPricePerDay] = useState(car.pricePerDay);
  const [description, setDescription] = useState(car.description);
  const [neighbourhood, setNeighbourhood] = useState(car.neighbourhood);
  const [photoUrl, setPhotoUrl] = useState(car.photos[0] || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const res = updateCar(car.id, {
      pricePerDay: Number(pricePerDay),
      description,
      neighbourhood,
      photos: [photoUrl],
    });

    setLoading(false);
    if (res.success) {
      router.push('/owner/cars');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/owner/cars"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Fleet
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Edit Listing: {car.make} {car.model}
        </h1>
        <p className="text-xs text-slate-400">
          Update daily pricing, description, or pickup neighbourhood in Addis Ababa.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-5"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Daily Rental Rate (ETB)
          </label>
          <input
            type="number"
            min={500}
            required
            value={pricePerDay}
            onChange={(e) => setPricePerDay(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Handover Neighbourhood
          </label>
          <input
            type="text"
            required
            value={neighbourhood}
            onChange={(e) => setNeighbourhood(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Primary Photo URL
          </label>
          <input
            type="url"
            required
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
          />
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
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="pt-3 border-t border-slate-700 flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onCancel} className="text-slate-400">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
