# Sheggar Wheels — Rendering & Routing Strategy (STRATEGY.md)

This document provides a comprehensive technical breakdown of every route in Sheggar Wheels, outlining the rendering method, component lifecycle, and architectural rationale.

---

## 🗺️ Master Routing Table

| Route | Route Group | Rendering Strategy | Client / Server | Rationale |
|---|---|---|---|---|
| `/` | `(public)` | **Static (○)** | Client Hydrated | Landing page with hero search, value props, and static featured vehicle snapshots. Prerenders instantly for SEO. |
| `/cars` | `(public)` | **Static Shell (○)** | Client Hydrated (`Suspense`) | Catalogue search and filtering requires URL query params (`q`, `neighbourhood`, `sort`, `page`). Wrapped in `Suspense` for instantaneous static shell delivery and reactive client filtering. |
| `/cars/[id]` | `(public)` | **Dynamic (ƒ)** | Client Component | Vehicle profile, interactive photo gallery, live price calculations for chosen dates, and Leaflet location map. |
| `/signin` | `(public)` | **Static Shell (○)** | Client Hydrated (`Suspense`) | Sign-in portal with 1-click demo personas and mock email sign-in. Accesses `?next=` query param safely inside `Suspense`. |
| `/signup` | `(public)` | **Static Shell (○)** | Client Hydrated (`Suspense`) | Registration form creating new renter and host accounts. |
| `/dashboard` | `(renter)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Renter personal overview. Shell prerenders; client hook populates live user bookings, active trip telemetry, and stats. |
| `/bookings` | `(renter)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Tabbed reservation management, cancellation modals, and RFC 4180 CSV export. |
| `/bookings/[id]` | `(renter)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | Printable VAT/Trip Receipt, itemized charges, and dispute submission trigger. Strictly checks record ownership. |
| `/bookings/[id]/track` | `(renter)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | Live simulated GPS tracking map rendered client-side via Leaflet with animated route telemetry. |
| `/bookings/[id]/review` | `(renter)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | Star rating and driver feedback form. Validates that the trip status is completed and unreviewed. |
| `/checkout` | `(renter)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Mock TeleBirr payment gateway. Reads `sw_checkout_draft_v1` from `sessionStorage` and transitions booking upon confirmation. |
| `/owner` | `(owner)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Host Operations dashboard. Renders KPIs, fleet utilization, and pending booking approvals with overlap detection. |
| `/owner/cars` | `(owner)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Master fleet table with quick edit, availability calendar, and status toggle. |
| `/owner/cars/new` | `(owner)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Vehicle listing creation form. Automatically assigns `pending` status for admin safety verification. |
| `/owner/cars/[id]/edit` | `(owner)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | Vehicle listing modification. Strictly verifies that `car.ownerId === currentUser.id`. |
| `/owner/cars/[id]/availability` | `(owner)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | Calendar blackout dates manager. Adds and removes blackout intervals. |
| `/owner/cars/[id]/bookings` | `(owner)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | Vehicle-specific reservation history table. |
| `/owner/earnings` | `(owner)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Recharts monthly revenue bar chart, accessible financial ledger, and CSV export. |
| `/owner/reviews` | `(owner)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Feedback left by renters on owner's fleet with public host reply forms. |
| `/owner/disputes` | `(owner)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Visibility into open customer disputes and admin resolutions. |
| `/admin` | `(admin)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Super-Admin operations console. Platform GMV, mock commission (10%), user counts, and status distribution chart. |
| `/admin/listings` | `(admin)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Vehicle moderation queue for approving or rejecting submissions with audit notes. |
| `/admin/users` | `(admin)` | **Static Shell (○)** | Client Component (`RouteGuard`) | User registry with search, role filters, and instant account suspension/reinstatement. |
| `/admin/users/[id]` | `(admin)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | User profile inspection, listed vehicle inventory, and rental audit logs. |
| `/admin/bookings` | `(admin)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Master audit ledger of every booking transition across the marketplace with CSV download. |
| `/admin/disputes` | `(admin)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Trust & Safety dispute resolution queue. |
| `/admin/disputes/[id]` | `(admin)` | **Dynamic (ƒ)** | Client Component (`RouteGuard`) | Case determination screen: statements from renter and owner, booking parameters, and resolution form. |
| `/admin/reports` | `(admin)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Financial and volume reporting broken down by Addis Ababa districts with CSV export. |
| `/admin/announcements` | `(admin)` | **Static Shell (○)** | Client Component (`RouteGuard`) | Global notification management broadcasting banners across the header. |
| `/sitemap.xml` | Root | **Static (○)** | Server Function | Dynamically generates XML sitemap including public landing, catalogue, and approved car profile URLs. |
| `/robots.txt` | Root | **Static (○)** | Server Function | Directs crawlers to allow public pages while strictly disallowing private dashboards and checkout drafts. |
| `/_not-found` | Root | **Static (○)** | Client Component | Branded 404 error page. |

---

## 🏛️ Architectural Strategy Details

### 1. Browser-Storage Constraint & Client Component Hydration
Because Sheggar Wheels is a **frontend-only** application where durability resides in browser `localStorage` and `sessionStorage`, Next.js server components cannot execute database queries or read client storage during server rendering.
- **Solution**: The application uses **Static Shells** (`○`) for dashboard pages, where layout structures, cards, and headers are prerendered. Upon client mounting, the custom `useStore` hook hydrates state from storage, evaluates route guards, and triggers reactive re-renders.

### 2. URL State Synchronization for SEO & Sharing
On the `/cars` catalogue page, search parameters (`q`, `neighbourhood`, `minPrice`, `maxPrice`, `transmission`, `seats`, `sort`, `page`) are bidirectional:
- They synchronize seamlessly to URL query parameters via `router.replace(..., { scroll: false })`.
- Users can copy and share any filtered search link (e.g. `/cars?neighbourhood=Bole&sort=price-asc`) and receive the exact filtered view.
- To prevent Next.js prerender de-optimization, `CarsContent` is encapsulated inside a `<Suspense>` boundary.

### 3. Dynamic Leaflet & Recharts Rendering
Neither Leaflet nor Recharts support native Node.js server environments:
- **Leaflet**: Relies heavily on `window`, `document`, and HTML5 Canvas. It is loaded exclusively inside client `useEffect` hooks via dynamic `import('react-leaflet')` and `import('leaflet')` with Leaflet marker icon asset fixes.
- **Recharts**: Requires browser layout calculation (`ResponsiveContainer`). It dynamically imports on the client to guarantee zero hydration mismatches.

### 4. Route Group Isolation
The application cleanly partitions layouts into four distinct route groups:
1. `(public)`: Public navigation header, search shortcuts, and comprehensive marketing footer.
2. `(renter)`: Light, focused dashboard shell with Renter navigation sidebar.
3. `(owner)`: Dark slate themed host console with fleet management tools and earnings analytics.
4. `(admin)`: Dark obsidian themed control center with super-admin moderation queues and audit tables.
