'use client';

import { useState } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import AdminSidebar from '@/components/navigation/AdminSidebar';
import AdminNavbar from '@/components/navigation/AdminNavbar';

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RouteGuard requiredRole="admin">
      <div className="flex bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-rose-500 selection:text-white">
        {/* Responsive Collapsible Sidebar */}
        <AdminSidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Main Content Column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Admin Navbar with Breadcrumbs, Alerts, and Profile */}
          <AdminNavbar onToggleMobileMenu={() => setMobileOpen(true)} />

          {/* Main Route Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
