# Sheggar Wheels (ሸገር ዊልስ) — Peer-to-Peer Car Rental Marketplace

> **Production-grade Next.js Capstone Application for Addis Ababa, Ethiopia**  
> Built with Next.js App Router, React 19, Tailwind CSS v4, Leaflet, and Recharts.

---

## 🌟 Overview & Purpose

**Sheggar Wheels** is a modern, responsive, frontend-first peer-to-peer car sharing marketplace designed specifically for the mobility needs of Addis Ababa. It connects verified local vehicle hosts in key metropolitan corridors (Bole, Kazanchis, Piassa, Old Airport/Sarbet, CMC, Megenagna, and Gerji) with business travelers, diaspora visitors, and local drivers looking for flexible daily rentals without traditional rental desk bureaucracy.

The platform simulates full marketplace functionality directly in browser storage (`localStorage` for durable demo state, `sessionStorage` for temporary session & checkout drafts), featuring mock TeleBirr mobile wallet checkouts, GPS route tracking simulations, host fleet management, customer review threads, and a super-admin operations control center.

---

## 🚀 Key Features by Actor

### 1. Visitors & Renters
- **Dynamic Fleet Browsing**: Real-time multi-attribute search (case-insensitive keyword, Addis Ababa neighborhood, price range, transmission, passenger seats, and trip dates).
- **Date Overlap Prevention**: Instant availability checks against existing active reservations before checkout.
- **Detailed Vehicle Profiles**: Multi-photo gallery, technical specifications, host credibility card, and pickup zone radius on interactive OpenStreetMap Leaflet maps.
- **Mock TeleBirr Checkout**: Frictionless simulated mobile payment with custom phone entry, PIN verification, and instantaneous `TB-DEMO-XXXXX` transaction references.
- **Official VAT & Trip Receipts**: Printable receipt view itemizing daily lease rates, 10% platform assurance fees, and transaction timestamps.
- **Simulated GPS Fleet Tracking**: Live Leaflet navigation interface displaying active vehicle telemetry, progress, speed, and emergency contacts.
- **Verified Review Engine**: 1–5 star ratings and comments restricted strictly to verified completed trips.
- **Audit CSV Export**: One-click RFC 4180-compliant CSV download of past and upcoming personal trips.

### 2. Vehicle Hosts / Owners
- **Host Operations Console**: Key performance metrics (approved fleet count, pending booking requests, active road rentals, net earnings in ETB, and fleet utilization rate).
- **Instant Booking Approvals**: One-click approve/decline actions with built-in conflict detection preventing double-booking overlaps.
- **Fleet Management**: Add new vehicles (automatically placed in `pending` review status), edit pricing, and toggle active/inactive availability.
- **Blackout Calendar**: Custom date blocker for maintenance, inspections, or personal family use.
- **Monthly Earnings Visualizer**: Recharts bar graph displaying monthly net revenue (ETB), accessible tabular financial ledger, and CSV export.
- **Public Host Replies**: Direct public replies to renter reviews to reinforce reputation.
- **Dispute Tracking**: Full visibility into claims involving deposits, fuel discrepancy, or handover timing.

### 3. Trust & Safety Super-Admin (Complete Management Control Center)
- **Executive Command Center (`/admin`)**: 18 real-time calculated KPIs (gross GMV, 10% platform take, host net disbursements, pending payouts, fleet breakdown, lifecycle status counts), 30/90-day date filters, Recharts booking volume & neighbourhood bar charts, and live activity audit preview.
- **Vehicle Fleet Moderation (`/admin/listings`)**: Multi-attribute search and filtering by approval status, transmission, owner, and live rental availability. Features vehicle inspector modal (complete specs, photos, host contact, and booking history), approval, rejection with mandatory reason, suspension, reactivation, and details edit modal.
- **Rental Operations & Booking Management (`/admin/bookings`)**: Master audit table of all 8 lifecycle statuses (`requested`, `confirmed`, `in_progress`, `completed`, `reviewed`, `cancelled`, `declined`, `disputed`, `resolved`). Schedule collision detector, dispatch start, return check-in, cancellation with mandatory justification, mock TeleBirr refund generation, and RFC 4180 CSV export.
- **Rental Operations & Availability Matrix (`/admin/operations`)**: Real-time dispatch hub with 7-day pickup/return horizons, overdue vehicle check-in alerts, reservation collision warning, and fleet availability status matrix across all Addis Ababa zones.
- **Financial Ledger & Payouts (`/admin/payments`)**: Financial audit trail itemizing TeleBirr references, gross amounts, 10% platform take, host net earnings, one-click simulated host payouts (`PO-ETB-XXXXX`), simulated refunds (`RF-DEMO-XXXXX`), and financial CSV exports.
- **Reviews & Community Moderation (`/admin/reviews`)**: Star rating analysis, host replies, flagging inappropriate comments, hiding violations with required explanation, restoring reviews, and CSV exports.
- **Trust & Safety Dispute Center (`/admin/disputes` & `/admin/disputes/[id]`)**: Full dispute dossier with attached booking details, renter/host claim statements, and formal binding resolution workflow.
- **User Accounts & Governance (`/admin/users` & `/admin/users/[id]`)**: Searchable user registry with role audits, vehicle/trip counters, suspension modal requiring reason, self-suspension protection, and last active admin guard.
- **Broadcast Announcements (`/admin/announcements`)**: Global alert banners with audience targeting (all users, renters only, hosts only), editing modal, activation toggling, and deletion.
- **Executive Reports & Analytics (`/admin/reports`)**: Multi-category reporting (Financial GMV, Booking Lifecycle Distribution, Fleet Moderation Status, Addis District Turnover, User Governance) with date filtering and dedicated CSV download.
- **Audit Trail & Admin Activity (`/admin/activity`)**: Chronological audit log recorded in `sw_activity_v1` tracking all administrative actions (approvals, rejections, edits, cancellations, payouts, refunds, dispute resolutions) with CSV export.
- **Platform & Marketplace Settings (`/admin/settings`)**: Configurable platform commission rate (%), fixed booking fee (ETB), min/max rental durations, cancellation grace window, and serviced Addis Ababa neighbourhoods.

---

## 👥 Pre-Configured Demo Accounts

Sheggar Wheels includes 5 ready-to-use demo personas. Use the global **"Demo Logins / Switch Role"** modal in the header to switch roles with a single click:

| Name | Role | Email | Status | Intended Persona & Testing Purpose |
|---|---|---|---|---|
| **Abebe Kebede** | `renter` | `abebe@example.com` | Active | Active renter with past trip history and active reservations |
| **Bethlehem Tadesse** | `owner` | `bethlehem@example.com` | Active | Premier host with multiple approved vehicles in Bole & Kazanchis |
| **Dawit Haile** | `renter`, `owner` | `dawit@example.com` | Active | Dual account testing both rental and host consoles |
| **Sara Mengistu** | `admin` | `admin@sheggarwheels.com` | Active | Super-administrator with moderation, user governance & dispute access |
| **Yared Lemma** | `renter` | `yared@example.com` | **Suspended** | Demonstrates access-blocking for suspended accounts |

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router, JavaScript)
- **UI Library**: React 19, Vanilla Tailwind CSS v4 design tokens
- **Icons**: Lucide React
- **Mapping**: Leaflet + React-Leaflet (client-side dynamic import with `ssr: false`)
- **Data Visualization**: Recharts (client-side dynamic bar charts)
- **Persistence**: Browser Storage (`localStorage` for entities, `sessionStorage` for session and checkout drafts)
- **Unit & Negative Testing**: Vitest
- **Linting & Code Quality**: ESLint 9

---

## ⚙️ Local Setup & Scripts

```bash
# Clone the repository and navigate to the project directory
cd sq6-feneti-demissie/module-03-react-nextjs/Days/Day_51/sheggar-wheels

# Install all dependencies
npm install

# Run automated unit and negative security tests
npm run test

# Run the local development server (starts on http://localhost:3000)
npm run dev

# Run production build and static analysis
npm run build

# Start production server
npm run start
```

---

## 🔐 Negative Security Tests

The test suite in `src/lib/__tests__/marketplace.test.js` enforces non-negotiable security rules:
1. **Unauthenticated Booking Prevention**: Calling `createBooking` without an active session immediately returns `"Not signed in"` and writes nothing to storage.
2. **Unauthorized Record Cancellation**: A renter attempting to cancel another user's booking returns `"Not yours"` and leaves the state intact.
3. **URL Parameter Injection Guard**: Owner attempting to edit another owner's vehicle via URL ID returns `"Not yours"`.
4. **Suspension Lockdown**: Suspended users are barred from creating bookings or mutating marketplace data.
5. **Open Redirect Vector Neutralization**: `safeReturnPath` strictly neutralizes protocol-relative (`//evil.com`), JavaScript schemes (`javascript:...`), and external URLs (`https://...`), guaranteeing internal redirection.

---

## ⚠️ Limitations & Educational Scope

- **Frontend-Only Simulation**: There is no live backend server, PostgreSQL database, or banking gateway. All persistence resides in client browser storage.
- **Cross-Browser Scenarios**: Incognito mode or clearing browsing data will reinitialize the platform back to the default seed dataset.
- **Mock TeleBirr**: No actual mobile money transactions occur; payment references (`TB-DEMO-XXXXX`) are procedurally generated for workflow testing.
