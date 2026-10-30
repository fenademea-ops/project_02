import './globals.css';
import { StoreProvider } from '@/lib/useStore';
import DemoBanner from '@/components/navigation/DemoBanner';
import ToastContainer from '@/components/ui/ToastContainer';

export const metadata = {
  title: 'Sheggar Wheels | Peer-to-Peer Car Rental in Addis Ababa',
  description:
    'Experience seamless car sharing across Addis Ababa. Rent clean, verified vehicles in Bole, Kazanchis, Piassa, CMC, and Sarbet directly from local hosts.',
  keywords: [
    'Car rental Addis Ababa',
    'Sheggar Wheels',
    'Ethiopia car hire',
    'Bole car rental',
    'Kazanchis vehicle share',
    'Peer-to-peer car sharing',
  ],
  authors: [{ name: 'Sheggar Wheels Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Sheggar Wheels — Drive Addis Ababa',
    description:
      'Premier peer-to-peer car sharing in Addis Ababa. Verified cars, instant bookings, transparent prices in ETB.',
    url: '/',
    siteName: 'Sheggar Wheels',
    locale: 'en_ET',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
        {/* Skip to Content for keyboard screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white text-xs font-bold"
        >
          Skip to content
        </a>
        <StoreProvider>
          {/* Global Demo Banner and Persona Switcher */}
          <DemoBanner />
          {/* Main App Landmark */}
          <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
            {children}
          </main>
          {/* In-app Toasts */}
          <ToastContainer />
        </StoreProvider>
      </body>
    </html>
  );
}
