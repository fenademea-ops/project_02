import RouteGuard from '@/components/auth/RouteGuard';
import OwnerSidebar from '@/components/navigation/OwnerSidebar';

export default function OwnerLayout({ children }) {
  return (
    <RouteGuard requiredRole="owner">
      <div className="flex bg-slate-900 text-slate-100 min-h-screen">
        <OwnerSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
