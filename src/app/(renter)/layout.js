import RouteGuard from '@/components/auth/RouteGuard';
import RenterSidebar from '@/components/navigation/RenterSidebar';

export default function RenterLayout({ children }) {
  return (
    <RouteGuard requiredRole="renter">
      <div className="flex bg-slate-50 min-h-screen">
        <RenterSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
