# Server vs Client Component Boundary (BOUNDARY.md)

In Next.js App Router, understanding and enforcing the boundary between **Server Components** and **Client Components** is paramount for both performance and data integrity.

---

## 🛑 The Non-Negotiable Boundary Rule

> **Server code cannot access browser storage.**  
> `localStorage`, `sessionStorage`, `window`, and client DOM APIs do not exist on the server.

In Sheggar Wheels, because the entire marketplace operates without an external PostgreSQL/MySQL database, durable demo state is maintained in client-side storage (`localStorage` for entities, `sessionStorage` for sessions and checkout drafts). Consequently:

1. **Storage access, state synchronization, and mutations MUST reside exclusively inside Client Components, custom hooks (`useStore`), and utility helpers called in browser contexts.**
2. **Server Components are strictly utilized for root document shells, SEO metadata generation, sitemap/robots generation, and layout frames.**

---

## 📊 Component Boundary Classification

```
┌────────────────────────────────────────────────────────┐
│                   SERVER COMPONENTS                    │
│                                                        │
│  - src/app/layout.js (HTML shell, viewport, metadata)   │
│  - src/app/sitemap.js (Dynamic XML sitemap generator)  │
│  - src/app/robots.js (Robots.txt generator)           │
│  - Layout frames for route groups                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ Hydration Boundary ('use client')
┌────────────────────────────────────────────────────────┐
│                   CLIENT COMPONENTS                    │
│                                                        │
│  - src/lib/useStore.js (React Context & storage sync)  │
│  - src/components/auth/RouteGuard.js (Auth guards)     │
│  - src/components/navigation/DemoBanner.js             │
│  - src/components/navigation/PublicNavbar.js           │
│  - src/components/navigation/*Sidebar.js               │
│  - src/components/map/CarLocationMap.js (Leaflet)      │
│  - src/components/map/TripTrackingMap.js (Leaflet)     │
│  - src/components/ui/Modal.js, ToastContainer.js       │
│  - Interactive Pages:                                  │
│      • / (Landing page search form)                    │
│      • /cars (Catalogue filtering & sorting)           │
│      • /cars/[id] (Price calculator & booking CTA)     │
│      • /signin & /signup (Auth forms)                  │
│      • /dashboard & /bookings (Renter flows)           │
│      • /checkout (Mock TeleBirr gateway)               │
│      • /owner/* (Fleet & earnings analytics)           │
│      • /admin/* (Moderation, disputes, governance)     │
└────────────────────────────────────────────────────────┘
```

---

## 🔍 Detailed Component Directory

### Server Components
| File Path | Role | Why It Is A Server Component |
|---|---|---|
| `src/app/layout.js` | Root Document Layout | Defines `<html>`, `<body>`, global fonts, and static metadata (`title`, `description`, `openGraph`). |
| `src/app/sitemap.js` | Dynamic Sitemap Generator | Executes during build/request time to produce compliant XML sitemaps for search engines without bundling client code. |
| `src/app/robots.js` | Crawler Directives | Delivers standard `robots.txt` disallowing private portal routes. |

### Client Components (`'use client'`)
| Component / Page | Key Dependencies | Reason for Client Boundary |
|---|---|---|
| `src/lib/useStore.js` | `useState`, `useEffect`, `createContext`, `storage.js` | Reads `localStorage`/`sessionStorage`, attaches `storage` and `CustomEvent` listeners for cross-tab and in-tab synchronization. |
| `src/components/auth/RouteGuard.js` | `useRouter`, `usePathname`, `useStore` | Evaluates current session credentials in `sessionStorage` and conditionally redirects or blocks unauthorized/suspended users. |
| `src/components/navigation/DemoBanner.js` | `useStore`, `useState` | Provides interactive persona switching modal and global broadcast dismissals. |
| `src/components/map/CarLocationMap.js` | `import('leaflet')`, `import('react-leaflet')` | Leaflet requires access to browser Canvas and DOM nodes (`window`, `document`). |
| `src/components/map/TripTrackingMap.js` | `import('leaflet')`, `setInterval` | Real-time GPS path animation and telemetry calculations. |
| `src/app/(public)/cars/page.js` | `useSearchParams`, `useRouter`, `useMemo` | Real-time multi-facet filtering and URL query string synchronization. |
| `src/app/(public)/cars/[id]/page.js` | `useState`, `useStore`, `writeStorage` | Interactive date range validation, live price calculation, photo thumbnail switching, and checkout draft writing. |
| `src/app/(renter)/checkout/page.js` | `readStorage`, `transitionBooking` | Reads `sw_checkout_draft_v1` from `sessionStorage`, handles mock TeleBirr form submission, and advances booking state. |
| `src/app/(owner)/owner/earnings/page.js` | `import('recharts')`, `downloadCsv` | Recharts responsive SVG rendering and client-side CSV Blob generation. |

---

## ⚡ Handling the Prerender Boundary Safely

Next.js App Router enforces strict rules when prerendering Client Components:
1. **Dynamic URL Data**: Accessing `useSearchParams()` or dynamic route `params` outside of a `<Suspense>` boundary triggers prerender errors. Sheggar Wheels wraps all search-driven pages (`/cars`, `/signin`, `/signup`) in `<Suspense>` with loading fallbacks.
2. **Stable Prerendering**: Dynamic time evaluation (such as `new Date()` inside server component bodies) is eliminated or stabilized so static generation can cache layouts deterministically.
3. **Empty Storage Handling**: On the initial server pass, storage helpers safely return fallback values (`null` or `[]`), preventing server crash. Full hydration occurs seamlessly on client mount.
