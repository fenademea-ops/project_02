'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  ShieldCheck,
  Clock,
  Phone,
  Mail,
  AlertTriangle,
  FileText,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function AdminSupportPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'How does the complete Rent-Out lifecycle work?',
      a: 'The rental lifecycle begins with a renter booking request (status: requested). An administrator or vehicle owner reviews and approves the request (status: confirmed). On the scheduled pickup day, vehicle keys are inspected and custody is handed over (status: in_progress). Upon return, vehicle odometer and fuel are inspected and custody is marked complete (status: completed), which automatically queues the simulated host payout in the Payments ledger.',
    },
    {
      q: 'How are platform commission and host payouts calculated?',
      a: 'Sheggar Wheels charges a standard 10% platform commission on the rental subtotal (Duration in Days × Daily Price). For example, a 4-day rental at 4,500 ETB/day yields a subtotal of 18,000 ETB, a platform fee of 1,800 ETB, and a renter total of 19,800 ETB. The vehicle host is settled 18,000 ETB upon successful return completion.',
    },
    {
      q: 'What is the procedure for handling overdue vehicle returns?',
      a: 'If a rental remains in_progress past its scheduled endDate, the system flags it with an OVERDUE indicator. The administrator must first contact the renter and host via phone/SMS. If the renter requests an extension and the vehicle has no overlapping bookings, an extension note is logged. If unresponsive within 6 hours, an official administrative dispute is escalated and emergency dispatch protocols are initiated.',
    },
    {
      q: 'How do simulated demo payments work?',
      a: 'Sheggar Wheels is a frontend-only application. All TeleBirr, Commercial Bank of Ethiopia (CBE), and debit card transactions generate simulated mock payment references (e.g. TB-DEMO-xxxxx). No real monetary transfers occur. Payouts and refunds update internal localStorage ledgers for demonstration fidelity.',
    },
    {
      q: 'What happens when an owner or renter account is suspended?',
      a: 'When an account is suspended, the user is barred from creating new vehicle listings, booking new cars, or approving requests. All historical rental agreements, booking records, and reviews are preserved for audit and legal compliance. Suspensions require a documented administrative reason.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Admin Operations Guide & SLA Support
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Standard operating procedures, emergency incident response, and administrator documentation for Sheggar Wheels.
          </p>
        </div>

        <Link href="/admin/rent-outs">
          <Button variant="primary" className="text-xs">
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
            Go to Rent-Outs
          </Button>
        </Link>
      </div>

      {/* SLA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-sm">Response Time SLA</h3>
          <p className="text-xs text-slate-400">
            Booking requests must be approved or declined within <strong>2 hours</strong> during business hours (8 AM – 8 PM EAT).
          </p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-sm">Vehicle Inspection SLA</h3>
          <p className="text-xs text-slate-400">
            All host vehicles must present valid Ethiopian road-worthiness certificates and commercial third-party insurance before approval.
          </p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-sm">Dispute Resolution SLA</h3>
          <p className="text-xs text-slate-400">
            Customer damage or deposit disputes must be formally reviewed and resolved with written explanation within <strong>24 hours</strong>.
          </p>
        </div>
      </div>

      {/* Operations Handbook Section */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Core Administrator Checklists</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
            <h4 className="font-bold text-emerald-400 text-sm">Handover Checklist (Pickup)</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400">
              <li>Verify renter photo ID / valid Ethiopian driving license.</li>
              <li>Inspect vehicle exterior and take 4-point timestamped photos.</li>
              <li>Confirm fuel level (minimum 1/4 tank or full-to-full policy).</li>
              <li>Ensure emergency spare tire, jack, and triangle are in the trunk.</li>
              <li>Hand over vehicle keys and transition status to <em>in_progress</em>.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
            <h4 className="font-bold text-blue-400 text-sm">Return Checklist (Dropoff)</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400">
              <li>Check odometer reading against daily mileage allowances.</li>
              <li>Inspect vehicle body for any new scratches or dents.</li>
              <li>Verify fuel gauge matches pickup handover level.</li>
              <li>Recover keys and record inspection note in Rent-Out Management.</li>
              <li>Transition status to <em>completed</em> to release host payout.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">
          Administrator FAQ
        </h3>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left text-xs font-semibold text-white hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-400 border-t border-slate-800/60 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact & Dispatch Protocol */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <h3 className="font-bold text-white text-sm">Emergency Dispatch & Incident Contacts (Addis Ababa)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-500 block">Operations Hotline</span>
              <span className="font-bold text-white">+251 91 123 4567</span>
            </div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-blue-400" />
            <div>
              <span className="text-[10px] text-slate-500 block">Support Desk</span>
              <span className="font-bold text-white">admin@sheggarwheels.et</span>
            </div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <div>
              <span className="text-[10px] text-slate-500 block">Incident Desk</span>
              <span className="font-bold text-white">Bole Subcity, Addis Ababa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
