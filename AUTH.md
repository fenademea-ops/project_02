# Authentication, Authorization & Security Architecture (AUTH.md)

This document specifies the session management, role-based access control (RBAC), URL sanitization mechanisms, and verification of all required negative security tests in **Sheggar Wheels**.

---

## 🔒 Session Architecture

Sheggar Wheels implements a secure, credential-free browser session model:

### 1. Storage Key & Isolation
- **Storage Location**: `sessionStorage` (strictly cleared when the browser tab or window closes).
- **Key**: `sw_session_v1`
- **Payload Schema**:
  ```json
  {
    "userId": "user-renter-1",
    "signedInAt": "2026-10-21T10:00:00.000Z"
  }
  ```
- **Strict Credential Rule**: Neither passwords, API keys, tokens, nor payment card credentials are ever stored in `localStorage` or `sessionStorage`.

### 2. Multi-Role RBAC Model
Each user entity contains an array of assigned roles:
```json
{
  "id": "user-dual-1",
  "name": "Dawit Haile",
  "email": "dawit@example.com",
  "roles": ["renter", "owner"],
  "status": "active"
}
```
- **Renter**: Can search, book, pay (mock TeleBirr), view receipts, track trips, submit reviews, and dispute their own rentals.
- **Owner**: Can list vehicles, set daily prices, manage availability, approve/decline incoming requests, view monthly earnings, and reply to reviews.
- **Admin**: Master platform oversight, vehicle listing moderation (approve/reject), user suspension/reinstatement, all-booking ledger, and dispute determinations.

### 3. Public Registration Safeguard
Public sign-up (`/signup`) allows users to register as a `renter`, with an optional checkbox to also become an `owner`. **Public registration can NEVER grant the `admin` role.**

---

## 🛡️ Open Redirect Prevention: `safeReturnPath`

Open redirects are a major web vulnerability where an attacker manipulates login URLs (e.g., `/signin?next=https://malicious-phishing.com`) to steal user credentials or trick users after sign-in.

In Sheggar Wheels, `safeReturnPath(path)` in `src/lib/auth.js` enforces strict sanitization:
```javascript
export function safeReturnPath(path) {
  if (!path || typeof path !== 'string') return '/';

  const trimmed = path.trim();

  // Must begin with a single slash and not followed by a second slash or backslash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/';
  }

  // Reject external protocols or script schemes
  if (
    trimmed.includes('://') ||
    trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:')
  ) {
    return '/';
  }

  return trimmed;
}
```

### Verified Test Cases:
| Input Vector | Sanitized Output | Protection Reason |
|---|---|---|
| `"/dashboard"` | `"/dashboard"` | Permitted internal relative path |
| `"/cars/car-1"` | `"/cars/car-1"` | Permitted internal relative path |
| `"https://example.com"` | `"/"` | Blocked external protocol |
| `"//evil.com"` | `"/"` | Blocked protocol-relative URL attack |
| `"/\\attacker.com"` | `"/"` | Blocked Windows/backslash evasion vector |
| `"javascript:alert(1)"` | `"/"` | Blocked Cross-Site Scripting (XSS) scheme |
| `""`, `null`, `undefined` | `"/"` | Safe fallback to homepage |

---

## 🧪 Required Negative Tests & Enforcement

Sheggar Wheels does not rely solely on UI button hiding. Every mutation helper in `src/lib/data.js` independently validates:
```
Session exists → User not suspended → Correct role → Record ownership → Valid transition
```
On failure, clear errors are returned (`"Not signed in"`, `"Not yours"`, `"Your account is suspended"`, `"Invalid transition"`), and **no write to storage occurs**.

These tests are codified in `src/lib/__tests__/marketplace.test.js` and run via `npm run test`:

### Test 1: Calling booking function without session
- **Scenario**: An unauthenticated request attempts to invoke `createBooking(null, payload)`.
- **Enforcement**: Helper verifies `renterUserId` presence.
- **Result**: Returns `{ success: false, error: 'Not signed in' }`. The booking list in storage remains completely unchanged.

### Test 2: Renter A cancels Renter B's booking
- **Scenario**: An authenticated user (`user-other-99`) attempts to call `transitionBookingStatus` with target state `cancelled` on a booking owned by `user-renter-1`.
- **Enforcement**: Helper cross-checks `booking.renterId === actorUserId` and `booking.ownerId === actorUserId`.
- **Result**: Returns `{ success: false, error: 'Not yours' }`. The target booking state remains unchanged.

### Test 3: Owner editing another owner's vehicle via URL ID
- **Scenario**: Host Dawit Haile (`user-dual-1`) navigates directly to `/owner/cars/car-1/edit` (owned by Bethlehem Tadesse `user-owner-1`) and submits price changes.
- **Enforcement**:
  1. `RouteGuard` and edit page inspect `car.ownerId === currentUser.id`.
  2. Data helper `updateCarListing` checks ownership before saving.
- **Result**: Returns `{ success: false, error: 'Not yours' }`. Storage values remain untouched.

### Test 4: Renter viewing another renter's booking receipt
- **Scenario**: Renter navigates directly to `/bookings/[id]` belonging to a different customer.
- **Enforcement**: The detail page checks `booking.renterId === currentUser.id`, `booking.ownerId === currentUser.id`, or `currentUser.roles.includes('admin')`.
- **Result**: Displays an explicit **Access Restricted** barrier view.

### Test 5: Suspended user lockout
- **Scenario**: A user marked with `status: "suspended"` (`user-suspended-1`) attempts to book a vehicle or sign in.
- **Enforcement**: Both `signInAsDemo` and `createBooking` evaluate `isUserSuspended(user)`.
- **Result**: Returns `{ success: false, error: 'Your account is suspended' }`. The UI renders the **Access Blocked** account restriction screen.

### Test 6: A signed-out visitor cannot perform an admin action
- **Scenario**: Anonymous visitor invokes `adminModerateCar(null, ...)`.
- **Enforcement**: Requires active admin session. Returns `{ success: false, error: 'Not signed in' }`.

### Test 7: A regular renter cannot approve a car listing
- **Scenario**: `user-renter-1` invokes `adminModerateCar`.
- **Enforcement**: Role check ensures `hasRole(user, 'admin')`. Returns `{ success: false, error: 'Unauthorized: Admin role required' }`.

### Test 8: An admin can approve a pending listing
- **Scenario**: `user-admin-1` approves `car-9-pending`.
- **Enforcement**: Validates admin role, writes `status: 'approved'` to `sw_cars_v1`, records action in `sw_activity_v1`.

### Test 9: A rejected or inactive car cannot receive a new booking
- **Scenario**: Booking requested for `car-9-pending` (after rejection) or `car-10-inactive`.
- **Enforcement**: `createBooking` checks vehicle approval status. Returns `{ success: false, error: 'This car is not currently available for booking' }`.

### Test 10: Two overlapping bookings cannot both become confirmed
- **Scenario**: Two bookings for `car-1` with overlapping dates attempt confirmation.
- **Enforcement**: `transitionBookingStatus` checks existing confirmed/in-progress reservations. Second confirmation is rejected with `"Cannot approve: Car is already booked"`.

### Test 11: Invalid lifecycle transitions are rejected
- **Scenario**: Attempting to transition from `requested` directly to `in_progress` or `completed`.
- **Enforcement**: State machine rejects illegal transitions. Record remains in original state.

### Test 12: An eligible mock refund updates the correct payment record
- **Scenario**: Admin processes simulated refund on a paid booking.
- **Enforcement**: Generates `refundRef: "RF-DEMO-XXXXX"`, sets `paymentStatus: 'refunded_mock'`, and logs audit entry.

### Test 13: Resolving a dispute requires a resolution note
- **Scenario**: Admin attempts to resolve dispute with empty string.
- **Enforcement**: Validates required explanation. Returns error if note is missing.

### Test 14: CSV export correctly escapes special characters
- **Scenario**: Car model or description contains commas, double quotes, or newlines.
- **Enforcement**: RFC 4180 cell serializer wraps field in double quotes and escapes internal quotes.

### Test 15: Last usable admin cannot be suspended
- **Scenario**: Admin attempts to suspend their own account or the sole remaining admin.
- **Enforcement**: `updateUserStatus` rejects with `"You cannot suspend your own admin account"`.
