'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[Sheggar Wheels Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-rose-200 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Application Error Encountered</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error?.message ||
              'A runtime error occurred in this view. You can reload this view or return to the marketplace.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="danger" size="md" onClick={() => reset()} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload View
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
