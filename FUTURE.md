# Production Roadmap & Backend Migration Architecture (FUTURE.md)

This document outlines the architectural cuts intentionally made for this frontend-only demo capstone and details the migration path toward a production-scale distributed backend.

---

## ✂️ Intentional Scope Cuts (Frontend-Only Prototype)

To deliver an ultra-responsive, self-contained Next.js marketplace demonstration without requiring external database servers, API credentials, or paid banking merchant accounts, the following decisions were made:

1. **Client-Side Persistence**: `localStorage` (durable state) and `sessionStorage` (session & drafts) replace a relational database.
2. **Mock Authentication**: One-click persona switcher and email lookup replace JWT token issuance, hashed passwords (bcrypt), and OAuth flows.
3. **Mock TeleBirr Mobile Money**: Realistic mobile checkout interfaces and procedural `TB-DEMO-XXXXX` codes replace live merchant API calls to Ethio Telecom.
4. **Simulated Telemetry**: Procedurally animated GPS coordinates replace live OBD-II vehicle tracking hardware and hardware telematics streams.

---

## 🏗️ What Moves to the Backend in Production

### 1. Database & Relational Persistence
- **Target**: PostgreSQL via Prisma ORM or Supabase PostgreSQL with PostGIS for geographic radius querying.
- **Why**: `localStorage` is restricted to ~5MB per origin, is isolated per device/browser, and does not support ACID transactions across multiple concurrent users.
- **Schema Mapping**:
  - `sw_users_v1` → `users` table with bcrypt password hashes and verified Ethiopian National ID (Fayda / Kebele ID) records.
  - `sw_cars_v1` → `cars` table with PostGIS `ST_Point` coordinates for spatial proximity queries (`ST_DWithin` radius search in Addis).
  - `sw_bookings_v1` → `bookings` table with PostgreSQL exclusion constraints (`EXCLUDE USING gist ... WITH &&`) to guarantee physical prevention of double bookings at the database engine level.

### 2. Secure Authentication & Session Tokens
- **Target**: NextAuth.js (Auth.js) or Supabase Auth.
- **Architecture**:
  - Secure, `HttpOnly`, `SameSite=Lax` encrypted session cookies.
  - Role-based JWT claims verified on Edge middleware (`src/middleware.js`), eliminating client-side flash during authentication checks.
  - Two-Factor SMS Authentication (OTP) via Ethio Telecom or local SMS gateways.

### 3. Real Payment Integration (TeleBirr & Chapa)
- **Target**: Official TeleBirr Merchant Gateway API + Chapa Payment Gateway.
- **Architecture**:
  - Server-side Next.js Route Handlers:
    - `POST /api/checkout/telebirr`: Server generates encrypted transaction payload with RSA private key and returns checkout redirection URL.
    - `POST /api/webhooks/telebirr`: Webhook endpoint with HMAC signature verification to confirm payment asynchronous callbacks.
  - Payout Settlement: Automated host remittances directly to host bank accounts (Commercial Bank of Ethiopia, Awash Bank, TeleBirr Partner Payouts) minus platform 10% commission.

### 4. Real-Time Telemetry via Server-Sent Events (SSE) & WebSockets
- **Target**: WebSocket server or Next.js Route Handler streaming Server-Sent Events (`GET /api/trips/[id]/stream`).
- **Architecture**:
  - Connected IoT OBD-II GPS trackers inside host vehicles push MQTT/HTTP telemetry packets to a regional ingestion gateway.
  - The live tracking map (`/bookings/[id]/track`) establishes an EventSource connection, rendering the car's actual coordinates along Churchill Road, Bole Road, or the Ring Road in real time.

### 5. Media Upload Pipeline
- **Target**: Cloudflare R2 or AWS S3 with presigned upload URLs.
- **Architecture**:
  - Hosts upload vehicle photos directly from mobile devices.
  - Server generates temporary presigned PUT URLs (`/api/upload/presign`).
  - Automatic WebP transcoding and responsive image variant generation via Sharp on Cloudflare Workers / Next.js Image Optimization.

### 6. Scheduled Background Workers & Cron Jobs
- **Target**: Inngest or Upstash QStash.
- **Workflows**:
  - Automated transition: Advancing `confirmed` bookings to `in_progress` at scheduled start time.
  - Auto-completion: Triggering trip handover inspection and auto-completing reservations after the drop-off time.
  - Review prompts: Sending automated SMS / email reminders to renters to leave reviews 24 hours post-trip.
