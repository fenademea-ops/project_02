# Data Model, Storage & Validation Specification (DATA.md)

This document specifies the persistence architecture, schema contracts, validation rules, and error recovery mechanisms in **Sheggar Wheels**.

---

## 🔑 Storage Keys Registry

| Key | Storage Engine | Contents | Durability |
|---|---|---|---|
| `sw_users_v1` | `localStorage` | All registered user profiles | Durable across browser sessions |
| `sw_cars_v1` | `localStorage` | Vehicle fleet listings, specs, and status | Durable across browser sessions |
| `sw_bookings_v1` | `localStorage` | Full history of reservations, payments & states | Durable across browser sessions |
| `sw_reviews_v1` | `localStorage` | Verified reviews and owner replies | Durable across browser sessions |
| `sw_disputes_v1` | `localStorage` | Customer claims and admin determinations | Durable across browser sessions |
| `sw_announcements_v1` | `localStorage` | Global broadcast notices created by admins | Durable across browser sessions |
| `sw_activity_v1` | `localStorage` | Administrative action audit log and history | Durable across browser sessions |
| `sw_settings_v1` | `localStorage` | Platform commission, rental rules, and serviced zones | Durable across browser sessions |
| `sw_session_v1` | `sessionStorage` | Active user session (`{ userId, signedInAt }`) | Scoped to active browser tab |
| `sw_checkout_draft_v1` | `sessionStorage` | Selected dates, car summary, and fee total | Scoped to active checkout flow |

---

## 📋 Entity Schemas

### 1. User
```typescript
interface User {
  id: string; // "user-renter-1" or "user-xxxx"
  name: string; // "Abebe Kebede"
  email: string; // "abebe@example.com" (Unique, case-insensitive)
  phone: string; // "+251 91 123 4567"
  roles: Array<'renter' | 'owner' | 'admin'>;
  status: 'active' | 'suspended';
  bio?: string;
  createdAt: string; // ISO 8601
}
```

### 2. Car (Vehicle Listing)
```typescript
interface Car {
  id: string; // "car-1" or "car-xxxx"
  ownerId: string; // Relates to User.id
  make: string; // "Toyota"
  model: string; // "RAV4 Hybrid AWD"
  year: number; // 2023
  transmission: 'Automatic' | 'Manual';
  seats: number; // 4, 5, 7, etc.
  city: string; // Always "Addis Ababa"
  neighbourhood: string; // "Bole", "Kazanchis", "Piassa", etc.
  latitude: number; // e.g. 8.995
  longitude: number; // e.g. 38.788
  pricePerDay: number; // Daily lease in Ethiopian Birr (ETB > 0)
  photos: string[]; // URLs with fallback support
  description: string;
  features: string[]; // ["Apple CarPlay", "Sunroof", "4x4"]
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive';
  unavailableDates: string[]; // Array of YYYY-MM-DD blackout dates
  moderationNotes?: string;
  createdAt: string; // ISO 8601
  updatedAt?: string;
}
```
*Note: Public visitors can only view vehicles with status `approved`.*

### 3. Booking
```typescript
interface Booking {
  id: string; // "booking-xxxx"
  carId: string; // Relates to Car.id
  renterId: string; // Relates to User.id
  ownerId: string; // Snapshot of Car.ownerId
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number; // Positive integer >= 1
  pricePerDay: number; // Snapshot of Car.pricePerDay at booking time
  subtotal: number; // days * pricePerDay
  fee: number; // Math.round(subtotal * 0.1) (10% platform fee)
  total: number; // subtotal + fee
  paymentStatus: 'pending' | 'paid_mock' | 'refunded_mock' | 'cancelled';
  paymentRef?: string; // e.g. "TB-DEMO-98214"
  status: 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'reviewed' | 'cancelled' | 'declined' | 'disputed' | 'resolved';
  cancellationReason?: string;
  declineReason?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### 4. Review
```typescript
interface Review {
  id: string; // "rev-xxxx"
  bookingId: string; // Exactly one review per booking
  carId: string;
  renterId: string;
  ownerId: string;
  rating: number; // Integer between 1 and 5
  comment: string;
  ownerReply?: string | null;
  repliedAt?: string;
  createdAt: string; // ISO 8601
}
```

### 5. Dispute
```typescript
interface Dispute {
  id: string; // "dispute-xxxx"
  bookingId: string;
  openedBy: string; // Renter or Owner User.id
  reason: string; // "Fuel level discrepancy"
  description: string;
  status: 'open' | 'resolved';
  resolutionNotes?: string;
  resolvedBy?: string | null; // Admin User.id
  createdAt: string; // ISO 8601
  resolvedAt?: string | null;
}
```

### 6. Announcement
```typescript
interface Announcement {
  id: string; // "ann-xxxx"
  title: string;
  message: string;
  active: boolean;
  createdAt: string; // ISO 8601
  createdBy: string; // Admin User.id
}
```

---

## 🛠️ Data Helpers (`src/lib/storage.js`, `src/lib/data.js`)

- `readStorage(key, fallback)`: Safely checks for window availability, determines localStorage vs sessionStorage, wraps `JSON.parse` in a `try...catch`, and recovers with fallback on malformed JSON.
- `writeStorage(key, value)`: Serializes object to JSON, catches quota exceptions (`QuotaExceededError`), and fires a window `sheggar_storage_change` CustomEvent.
- `subscribeToStorageChanges(callback)`: Unifies native browser `window.addEventListener('storage')` (cross-tab sync) and in-tab `CustomEvent` dispatching.
- `initializeDemoData()`: Checks if master keys are absent and writes `SEED_USERS`, `SEED_CARS`, `SEED_BOOKINGS`, `SEED_REVIEWS`, `SEED_DISPUTES`, and `SEED_ANNOUNCEMENTS`.
- `resetDemoData()`: Explicit developer and user control that resets durable storage back to initial seed data.

---

## 🔍 Validation & Overlap Prevention (`src/lib/validation.js`)

1. **Email Uniqueness**: `isEmailUnique(email, users, excludeId)` ensures no duplicate user accounts can be registered.
2. **Date Range Correctness**: `validateDateRange(startDate, endDate)` validates strict `YYYY-MM-DD` syntax, ensures `endDate >= startDate`, and calculates accurate rental days.
3. **Double-Booking Overlap Check**:
   ```javascript
   export function checkDateOverlap(startA, endA, startB, endB) {
     return startA <= endB && endA >= startB;
   }
   ```
   `isCarAvailableForDates` scans active bookings (`requested`, `confirmed`, `in_progress`) and owner `unavailableDates` to prevent calendar conflicts before checkout and before host approval.
4. **Positive Pricing**: `isPositivePrice(price)` prevents negative or zero daily rental rates.

---

## 🛡️ Corrupted Data Recovery & Quota Handling

- **JSON Malformation Recovery**: If a user's browser storage contains corrupted or unparseable JSON, `readStorage` logs a clean warning and returns the safe fallback array/null without crashing the UI.
- **QuotaExceeded Catching**: If browser storage exceeds device limits (typically ~5MB), `writeStorage` captures the error gracefully and prevents unhandled promise rejections.
