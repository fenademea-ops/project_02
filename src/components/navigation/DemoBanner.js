'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/useStore';
import { Users, RotateCcw, AlertCircle, ShieldAlert, Sparkles, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function DemoBanner() {
  const {
    currentUser,
    users,
    signInAsDemo,
    signOut,
    resetData,
    activeAnnouncements,
  } = useStore();

  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [closedAnnouncements, setClosedAnnouncements] = useState([]);

  const visibleAnnouncements = activeAnnouncements.filter(
    (a) => !closedAnnouncements.includes(a.id)
  );

  return (
    <>
      {/* 1. Global Announcement Bars (Admin-controlled) */}
      {visibleAnnouncements.map((ann) => (
        <div
          key={ann.id}
          className="bg-emerald-900 text-emerald-100 text-xs sm:text-sm px-4 py-2 border-b border-emerald-800 flex items-center justify-between shadow-xs transition-all"
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
            <span className="font-semibold text-emerald-300 shrink-0">{ann.title}:</span>
            <span className="truncate">{ann.message}</span>
          </div>
          <button
            onClick={() => setClosedAnnouncements((prev) => [...prev, ann.id])}
            className="text-emerald-300 hover:text-white p-1 rounded-sm cursor-pointer ml-2"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* 2. Global Demo Data Mode Pill & Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wide uppercase text-[10px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Demo Data Mode
          </span>
          <span className="hidden md:inline text-slate-400">
            Browser Storage • Mock TeleBirr Payments • Addis Ababa Simulation
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                Acting as: <strong className="text-white">{currentUser.name}</strong> (
                {currentUser.roles.join(', ')})
              </span>
              <button
                onClick={() => setIsSwitchOpen(true)}
                className="text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
              >
                Switch Role
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSwitchOpen(true)}
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              <Users className="w-3 h-3" />
              Demo Logins
            </button>
          )}

          <span className="text-slate-600">|</span>

          <button
            onClick={resetData}
            title="Reset localStorage & sessionStorage to default initial seed"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>
        </div>
      </div>

      {/* 3. Quick Role Switcher Modal */}
      <Modal
        isOpen={isSwitchOpen}
        onClose={() => setIsSwitchOpen(false)}
        title="Quick Switch Demo Persona"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select one of the pre-configured Addis Ababa demo accounts to instantly test role-based
            views, permissions, and booking workflows without real credentials.
          </p>

          <div className="grid gap-3">
            {users.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              const isSuspended = u.status === 'suspended';

              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-900">{u.name}</span>
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700"
                        >
                          {r}
                        </span>
                      ))}
                      {isSuspended && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-700">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{u.bio || u.email}</p>
                  </div>

                  <div>
                    {isCurrent ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md">
                        Active Now
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={isSuspended ? 'danger' : 'outline'}
                        onClick={() => {
                          signInAsDemo(u.id);
                          setIsSwitchOpen(false);
                        }}
                      >
                        {isSuspended ? 'Test Block' : 'Switch To'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {currentUser && (
              <Button variant="ghost" size="sm" onClick={() => { signOut(); setIsSwitchOpen(false); }}>
                Sign Out Session
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetData();
                setIsSwitchOpen(false);
              }}
              className="text-rose-600 hover:text-rose-700"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset All Demo Storage
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
