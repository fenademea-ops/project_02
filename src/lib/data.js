/**
 * Sheggar Wheels Data Store & Business Logic
 * All storage mutations and strict security checks live here.
 * Rule: Session exists → Not suspended → Correct role → Record ownership → Valid transition.
 * UI hiding is not enough — errors are enforced here.
 */

import { STORAGE_KEYS, readStorage, writeStorage, generateId } from './storage';
import { DEFAULT_SETTINGS } from './seed';
import { canTransition, BOOKING_STATES } from './bookingMachine';
import {
  validateDateRange,
  checkDateOverlap,
  isCarAvailableForDates,
  isPositivePrice,
  validateRequiredFields,
} from './validation';
import { hasRole, isUserSuspended } from './auth';

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------

export function getUsers() {
  return readStorage(STORAGE_KEYS.USERS, []);
}

export function getUserById(id) {
  if (!id) return null;
  const users = getUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Suspend or reinstate a user (Admin only)
 * @param {string} adminUserId
 * @param {string} targetUserId
 * @param {'active'|'suspended'} newStatus
 * @param {string} [reason]
 */
export function updateUserStatus(adminUserId, targetUserId, newStatus, reason = '') {
  if (!adminUserId) return { success: false, error: 'Not signed in' };

  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }
  if (adminUserId === targetUserId) {
    return { success: false, error: 'You cannot suspend your own admin account' };
  }

  const users = getUsers();
  const targetIndex = users.findIndex((u) => u.id === targetUserId);
  if (targetIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  const targetUser = users[targetIndex];
  // Guard against suspending the last active administrator
  if (hasRole(targetUser, 'admin') && newStatus === 'suspended') {
    const activeAdmins = users.filter((u) => hasRole(u, 'admin') && u.status === 'active');
    if (activeAdmins.length <= 1) {
      return { success: false, error: 'Cannot suspend the last remaining active platform administrator' };
    }
  }

  targetUser.status = newStatus;
  targetUser.statusUpdatedAt = new Date().toISOString();
  if (newStatus === 'suspended') {
    targetUser.suspensionReason = reason || 'Administrative review';
  } else {
    delete targetUser.suspensionReason;
  }

  users[targetIndex] = targetUser;
  writeStorage(STORAGE_KEYS.USERS, users);

  logAdminActivity(adminUserId, {
    action: newStatus === 'suspended' ? 'user_suspended' : 'user_reinstated',
    recordType: 'user',
    recordId: targetUserId,
    explanation: `${newStatus === 'suspended' ? 'Suspended' : 'Reinstated'} account for ${targetUser.name} (${targetUser.email}). Reason: ${reason || 'Admin action'}`,
  });

  return { success: true, user: targetUser };
}

// -------------------------------------------------------------
// CAR OPERATIONS
// -------------------------------------------------------------

export function getCars() {
  return readStorage(STORAGE_KEYS.CARS, []);
}

/**
 * Publicly visible approved cars
 */
export function getApprovedCars() {
  const cars = getCars();
  return cars.filter((c) => c.status === 'approved');
}

export function getCarById(id) {
  if (!id) return null;
  const cars = getCars();
  return cars.find((c) => c.id === id) || null;
}

/**
 * Create a new car listing (Owner only)
 * Automatically places listing into 'pending' status for admin review.
 */
export function createCarListing(ownerUserId, carData) {
  if (!ownerUserId) return { success: false, error: 'Not signed in' };

  const owner = getUserById(ownerUserId);
  if (!owner) return { success: false, error: 'User not found' };
  if (isUserSuspended(owner)) return { success: false, error: 'Your account is suspended' };
  if (!hasRole(owner, 'owner')) return { success: false, error: 'Owner role required' };

  const required = validateRequiredFields(carData, [
    'make',
    'model',
    'year',
    'transmission',
    'seats',
    'neighbourhood',
    'pricePerDay',
    'description',
  ]);
  if (!required.valid) {
    return { success: false, error: `Missing required field: ${required.missing.join(', ')}` };
  }

  if (!isPositivePrice(carData.pricePerDay)) {
    return { success: false, error: 'Price per day must be a positive number' };
  }

  const cars = getCars();
  const newCar = {
    id: generateId('car'),
    ownerId: ownerUserId,
    make: carData.make.trim(),
    model: carData.model.trim(),
    year: Number(carData.year),
    transmission: carData.transmission,
    seats: Number(carData.seats),
    city: 'Addis Ababa',
    neighbourhood: carData.neighbourhood.trim(),
    latitude: Number(carData.latitude) || 9.01,
    longitude: Number(carData.longitude) || 38.76,
    pricePerDay: Number(carData.pricePerDay),
    photos:
      Array.isArray(carData.photos) && carData.photos.length > 0
        ? carData.photos
        : ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'],
    description: carData.description.trim(),
    features: Array.isArray(carData.features) ? carData.features : ['Air Conditioning', 'Bluetooth'],
    status: 'pending', // New cars always enter 'pending'
    unavailableDates: Array.isArray(carData.unavailableDates) ? carData.unavailableDates : [],
    createdAt: new Date().toISOString(),
  };

  cars.unshift(newCar);
  writeStorage(STORAGE_KEYS.CARS, cars);
  return { success: true, car: newCar };
}

/**
 * Update an existing car listing (Owner only, strictly checks ownership)
 */
export function updateCarListing(ownerUserId, carId, updates) {
  if (!ownerUserId) return { success: false, error: 'Not signed in' };

  const owner = getUserById(ownerUserId);
  if (!owner) return { success: false, error: 'User not found' };
  if (isUserSuspended(owner)) return { success: false, error: 'Your account is suspended' };

  const cars = getCars();
  const index = cars.findIndex((c) => c.id === carId);
  if (index === -1) return { success: false, error: 'Car not found' };

  const car = cars[index];
  // Ownership check
  if (car.ownerId !== ownerUserId && !hasRole(owner, 'admin')) {
    return { success: false, error: 'Not yours' };
  }

  if (updates.pricePerDay !== undefined && !isPositivePrice(updates.pricePerDay)) {
    return { success: false, error: 'Price must be a positive number' };
  }

  // Preserve core immutable properties
  const updatedCar = {
    ...car,
    ...updates,
    id: car.id,
    ownerId: car.ownerId,
    createdAt: car.createdAt,
    updatedAt: new Date().toISOString(),
  };

  cars[index] = updatedCar;
  writeStorage(STORAGE_KEYS.CARS, cars);
  return { success: true, car: updatedCar };
}

/**
 * Toggle car active/inactive status (Owner only, checks ownership)
 */
export function toggleCarActiveStatus(ownerUserId, carId) {
  if (!ownerUserId) return { success: false, error: 'Not signed in' };

  const cars = getCars();
  const car = cars.find((c) => c.id === carId);
  if (!car) return { success: false, error: 'Car not found' };

  if (car.ownerId !== ownerUserId) {
    const user = getUserById(ownerUserId);
    if (!hasRole(user, 'admin')) {
      return { success: false, error: 'Not yours' };
    }
  }

  const nextStatus = car.status === 'inactive' ? 'approved' : 'inactive';
  return updateCarListing(ownerUserId, carId, { status: nextStatus });
}

/**
 * Moderate car listing (Admin only)
 * Supported statuses: 'approved', 'rejected', 'suspended', 'inactive'
 */
export function adminModerateCar(adminUserId, carId, status, moderationNotes = '') {
  if (!adminUserId) return { success: false, error: 'Not signed in' };

  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  if (status === 'rejected' && (!moderationNotes || !moderationNotes.trim())) {
    return { success: false, error: 'A rejection reason is required' };
  }

  const cars = getCars();
  const index = cars.findIndex((c) => c.id === carId);
  if (index === -1) return { success: false, error: 'Car not found' };

  const targetCar = cars[index];
  targetCar.status = status;
  targetCar.moderationNotes = moderationNotes.trim();
  targetCar.moderatedAt = new Date().toISOString();
  targetCar.moderatedBy = adminUserId;

  cars[index] = targetCar;
  writeStorage(STORAGE_KEYS.CARS, cars);

  logAdminActivity(adminUserId, {
    action: `listing_${status}`,
    recordType: 'car',
    recordId: carId,
    explanation: `Set listing status to "${status}" for ${targetCar.make} ${targetCar.model}. Notes: ${moderationNotes || 'Standard review'}`,
  });

  return { success: true, car: targetCar };
}

/**
 * Admin direct edit of vehicle listing details (Admin only)
 */
export function adminEditCar(adminUserId, carId, updates) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const cars = getCars();
  const index = cars.findIndex((c) => c.id === carId);
  if (index === -1) return { success: false, error: 'Car not found' };

  if (updates.pricePerDay !== undefined && !isPositivePrice(updates.pricePerDay)) {
    return { success: false, error: 'Price must be a positive number' };
  }

  const car = cars[index];
  const updated = {
    ...car,
    ...updates,
    id: car.id,
    ownerId: car.ownerId,
    updatedAt: new Date().toISOString(),
    lastEditedBy: adminUserId,
  };

  cars[index] = updated;
  writeStorage(STORAGE_KEYS.CARS, cars);

  logAdminActivity(adminUserId, {
    action: 'listing_edited',
    recordType: 'car',
    recordId: carId,
    explanation: `Admin modified details for ${updated.make} ${updated.model}.`,
  });

  return { success: true, car: updated };
}

/**
 * Admin updates car rent-out and availability controls
 * Enforces safety: Cannot mark available if active rental is currently in progress!
 */
export function adminUpdateCarRentOutStatus(adminUserId, carId, {
  isAvailable,
  availabilityStatus,
  unavailabilityReason = '',
  availableFrom = null,
}) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const cars = getCars();
  const index = cars.findIndex((c) => c.id === carId);
  if (index === -1) return { success: false, error: 'Car not found' };

  const car = cars[index];
  const allBookings = getBookings().filter((b) => b.carId === carId);

  // Safety check: Cannot mark available if vehicle is currently rented out
  const activeTrip = allBookings.find((b) => b.status === BOOKING_STATES.IN_PROGRESS);
  if (activeTrip && (isAvailable === true || availabilityStatus === 'available')) {
    return {
      success: false,
      error: `Cannot mark available: Vehicle is currently on trip with active renter until ${activeTrip.endDate} (Booking #${activeTrip.id}). Custody must be returned and completed first.`,
    };
  }

  const newStatus = availabilityStatus || (isAvailable ? 'available' : 'unavailable');
  const finalIsAvailable = newStatus === 'available';

  const updatedCar = {
    ...car,
    isAvailable: finalIsAvailable,
    availabilityStatus: newStatus,
    unavailabilityReason: !finalIsAvailable ? (unavailabilityReason?.trim() || '') : '',
    availableFrom: !finalIsAvailable && availableFrom ? availableFrom : null,
    updatedAt: new Date().toISOString(),
    lastRentOutControlledBy: adminUserId,
  };

  cars[index] = updatedCar;
  writeStorage(STORAGE_KEYS.CARS, cars);

  logAdminActivity(adminUserId, {
    action: 'car_rent_out_updated',
    recordType: 'car',
    recordId: carId,
    explanation: `Updated rent-out status for ${car.make} ${car.model} to "${newStatus}" (Available: ${finalIsAvailable}). Reason: ${unavailabilityReason || 'None'}`,
  });

  return { success: true, car: updatedCar };
}

/**
 * Admin blocks specific dates on a car calendar (e.g. maintenance, inspection, owner use)
 * Validates no collision with active or confirmed customer reservations
 */
export function adminBlockCarDates(adminUserId, carId, { startDate, endDate, reason = '' }) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const dateCheck = validateDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return { success: false, error: dateCheck.error };
  }

  const cars = getCars();
  const index = cars.findIndex((c) => c.id === carId);
  if (index === -1) return { success: false, error: 'Car not found' };

  const car = cars[index];
  const allBookings = getBookings().filter((b) => b.carId === carId);

  // Check collision with active or confirmed customer reservations
  const conflicting = allBookings.find(
    (b) =>
      ['requested', 'confirmed', 'in_progress'].includes(b.status) &&
      checkDateOverlap(startDate, endDate, b.startDate, b.endDate)
  );

  if (conflicting) {
    return {
      success: false,
      error: `Conflict: Cannot block dates overlapping with ${conflicting.status} booking #${conflicting.id} (${conflicting.startDate} to ${conflicting.endDate}).`,
    };
  }

  const newBlock = {
    id: generateId('block'),
    startDate,
    endDate,
    reason: (reason && reason.trim()) || 'Maintenance / Service',
    createdAt: new Date().toISOString(),
    createdBy: adminUserId,
  };

  const currentBlocked = Array.isArray(car.unavailableDates) ? car.unavailableDates : [];
  car.unavailableDates = [...currentBlocked, newBlock];
  car.updatedAt = new Date().toISOString();

  cars[index] = car;
  writeStorage(STORAGE_KEYS.CARS, cars);

  logAdminActivity(adminUserId, {
    action: 'car_dates_blocked',
    recordType: 'car',
    recordId: carId,
    explanation: `Blocked dates ${startDate} to ${endDate} for ${car.make} ${car.model}. Reason: ${newBlock.reason}`,
  });

  return { success: true, car, block: newBlock };
}

/**
 * Admin removes a blocked date range from a car calendar
 */
export function adminUnblockCarDates(adminUserId, carId, blockIdOrDate) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const cars = getCars();
  const index = cars.findIndex((c) => c.id === carId);
  if (index === -1) return { success: false, error: 'Car not found' };

  const car = cars[index];
  const currentBlocked = Array.isArray(car.unavailableDates) ? car.unavailableDates : [];

  car.unavailableDates = currentBlocked.filter((b) => {
    if (typeof b === 'string') return b !== blockIdOrDate;
    if (b && typeof b === 'object') {
      return b.id !== blockIdOrDate && b.startDate !== blockIdOrDate;
    }
    return true;
  });

  car.updatedAt = new Date().toISOString();
  cars[index] = car;
  writeStorage(STORAGE_KEYS.CARS, cars);

  logAdminActivity(adminUserId, {
    action: 'car_dates_unblocked',
    recordType: 'car',
    recordId: carId,
    explanation: `Unblocked dates for ${car.make} ${car.model}.`,
  });

  return { success: true, car };
}

/**
 * Determine exact rental availability state of a car
 * Separate from listing moderation status!
 * @param {string} carId
 * @param {string} [targetDate] - YYYY-MM-DD
 * @returns {{ state: string, label: string, isAvailable: boolean, activeBooking?: Object, upcomingBookings: Array, reason?: string, availableFrom?: string }}
 */
export function getCarRentalAvailability(carId, targetDate = null) {
  const car = getCarById(carId);
  if (!car) return { state: 'not_found', label: 'Not Found', isAvailable: false, upcomingBookings: [] };

  if (car.status !== 'approved') {
    return {
      state: car.status, // 'pending', 'rejected', 'inactive', 'suspended'
      label: car.status.charAt(0).toUpperCase() + car.status.slice(1).replace('_', ' '),
      isAvailable: false,
      upcomingBookings: [],
    };
  }

  const todayStr = targetDate || new Date().toISOString().split('T')[0];
  const allBookings = getBookings().filter((b) => b.carId === carId);

  // 1. Check if currently rented out (trip in progress)
  const activeTrip = allBookings.find((b) => b.status === BOOKING_STATES.IN_PROGRESS);
  if (activeTrip) {
    return {
      state: 'rented',
      label: 'Currently Rented Out',
      isAvailable: false,
      activeBooking: activeTrip,
      upcomingBookings: allBookings.filter((b) => b.status === BOOKING_STATES.CONFIRMED && b.startDate > todayStr),
    };
  }

  // 2. Check if reserved for today
  const reservedToday = allBookings.find(
    (b) => b.status === BOOKING_STATES.CONFIRMED && b.startDate <= todayStr && b.endDate >= todayStr
  );
  if (reservedToday) {
    return {
      state: 'reserved',
      label: 'Reserved (Awaiting Pickup)',
      isAvailable: false,
      activeBooking: reservedToday,
      upcomingBookings: allBookings.filter((b) => b.status === BOOKING_STATES.CONFIRMED && b.startDate > todayStr),
    };
  }

  // 3. Check admin rent-out availability status / maintenance
  if (
    car.isAvailable === false ||
    ['maintenance', 'temporarily_unavailable', 'unavailable'].includes(car.availabilityStatus)
  ) {
    const isMaint = car.availabilityStatus === 'maintenance';
    return {
      state: isMaint ? 'maintenance' : 'unavailable',
      label: isMaint ? 'In Maintenance' : 'Temporarily Unavailable',
      isAvailable: false,
      reason: car.unavailabilityReason || '',
      availableFrom: car.availableFrom || null,
      upcomingBookings: allBookings.filter((b) => b.status === BOOKING_STATES.CONFIRMED && b.startDate > todayStr),
    };
  }

  // 4. Check blackout / maintenance dates for today
  if (car.unavailableDates && Array.isArray(car.unavailableDates)) {
    const isBlockedToday = car.unavailableDates.some((d) => {
      if (typeof d === 'string') return d === todayStr;
      if (d && d.startDate && d.endDate) return todayStr >= d.startDate && todayStr <= d.endDate;
      return false;
    });
    if (isBlockedToday) {
      return {
        state: 'maintenance',
        label: 'In Maintenance / Blocked',
        isAvailable: false,
        upcomingBookings: allBookings.filter((b) => b.status === BOOKING_STATES.CONFIRMED && b.startDate > todayStr),
      };
    }
  }

  // 5. Check future reservations
  const upcoming = allBookings.filter((b) => b.status === BOOKING_STATES.CONFIRMED && b.startDate > todayStr);

  return {
    state: 'available',
    label: 'Available for Rent',
    isAvailable: true,
    upcomingBookings: upcoming,
  };
}

// -------------------------------------------------------------
// BOOKING OPERATIONS
// -------------------------------------------------------------

export function getBookings() {
  return readStorage(STORAGE_KEYS.BOOKINGS, []);
}

export function getBookingById(id) {
  if (!id) return null;
  const bookings = getBookings();
  return bookings.find((b) => b.id === id) || null;
}

/**
 * Check if an actor is authorized to view a private booking record.
 * Allowed: The booking's renter, the booking's car host, or an admin.
 * Denied: Any other user or unauthenticated visitor.
 * @param {string|null} userId
 * @param {string} bookingId
 * @returns {{ allowed: boolean, booking?: Object, error?: string }}
 */
export function canUserAccessBooking(userId, bookingId) {
  if (!userId) return { allowed: false, error: 'Not signed in' };
  const user = getUserById(userId);
  if (!user) return { allowed: false, error: 'User not found' };
  const booking = getBookingById(bookingId);
  if (!booking) return { allowed: false, error: 'Booking not found' };

  if (hasRole(user, 'admin')) {
    return { allowed: true, booking };
  }
  if (booking.renterId === userId || booking.ownerId === userId) {
    return { allowed: true, booking };
  }
  return { allowed: false, error: 'Not yours' };
}

/**
 * Create a new booking request (Renter only)
 * Negative test rule: Call booking function without session → "Not signed in", no booking created.
 */
export function createBooking(renterUserId, { carId, startDate, endDate }) {
  if (!renterUserId) {
    return { success: false, error: 'Not signed in' };
  }

  const renter = getUserById(renterUserId);
  if (!renter) {
    return { success: false, error: 'User not found' };
  }
  if (isUserSuspended(renter)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const car = getCarById(carId);
  if (!car) {
    return { success: false, error: 'Car not found' };
  }
  if (car.status !== 'approved') {
    return { success: false, error: 'This car is not currently available for booking' };
  }

  if (car.ownerId === renterUserId) {
    return { success: false, error: 'You cannot book your own vehicle' };
  }

  const dateCheck = validateDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return { success: false, error: dateCheck.error };
  }

  const existingBookings = getBookings();
  const availability = isCarAvailableForDates(
    carId,
    startDate,
    endDate,
    existingBookings,
    car.unavailableDates,
    null,
    car
  );
  if (!availability.available) {
    return { success: false, error: availability.reason || 'Car is not available for chosen dates' };
  }

  const days = dateCheck.days;
  const pricePerDay = car.pricePerDay;
  const subtotal = days * pricePerDay;
  const fee = Math.round(subtotal * 0.1); // 10% platform fee
  const total = subtotal + fee;

  const newBooking = {
    id: generateId('booking'),
    carId,
    renterId: renterUserId,
    ownerId: car.ownerId,
    startDate,
    endDate,
    days,
    pricePerDay,
    subtotal,
    fee,
    total,
    paymentStatus: 'pending',
    status: BOOKING_STATES.REQUESTED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  existingBookings.unshift(newBooking);
  writeStorage(STORAGE_KEYS.BOOKINGS, existingBookings);

  return { success: true, booking: newBooking };
}

/**
 * Transition booking lifecycle state
 * Strictly checks: Session → Suspended → Actor Role & Ownership → Valid State Transition.
 */
export function transitionBookingStatus(actorUserId, bookingId, targetStatus, metadata = {}) {
  if (!actorUserId) {
    return { success: false, error: 'Not signed in' };
  }

  const actor = getUserById(actorUserId);
  if (!actor) {
    return { success: false, error: 'User not found' };
  }
  if (isUserSuspended(actor)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const bookings = getBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) {
    return { success: false, error: 'Booking not found' };
  }

  const booking = bookings[index];

  // Determine actor's role relative to this booking
  let actorRole = null;
  if (hasRole(actor, 'admin')) {
    actorRole = 'admin';
  } else if (booking.ownerId === actorUserId) {
    actorRole = 'owner';
  } else if (booking.renterId === actorUserId) {
    actorRole = 'renter';
  } else {
    // Record ownership check failed!
    return { success: false, error: 'Not yours' };
  }

  // Check valid lifecycle transition
  if (!canTransition(booking.status, targetStatus, actorRole)) {
    return {
      success: false,
      error: `Invalid transition: Cannot change booking from "${booking.status}" to "${targetStatus}" as ${actorRole}`,
    };
  }

  // If owner confirms booking, ensure no overlapping confirmed/in_progress bookings exist
  if (targetStatus === BOOKING_STATES.CONFIRMED) {
    const car = getCarById(booking.carId);
    const availability = isCarAvailableForDates(
      booking.carId,
      booking.startDate,
      booking.endDate,
      bookings,
      car?.unavailableDates || [],
      booking.id
    );
    if (!availability.available) {
      return {
        success: false,
        error: `Cannot approve: ${availability.reason}`,
      };
    }
  }

  // Apply transition
  booking.status = targetStatus;
  booking.updatedAt = new Date().toISOString();

  if (metadata.declineReason) booking.declineReason = metadata.declineReason;
  if (metadata.cancellationReason) booking.cancellationReason = metadata.cancellationReason;
  if (metadata.paymentStatus) booking.paymentStatus = metadata.paymentStatus;
  if (metadata.paymentRef) booking.paymentRef = metadata.paymentRef;

  bookings[index] = booking;
  writeStorage(STORAGE_KEYS.BOOKINGS, bookings);

  return { success: true, booking };
}

/**
 * Process mock checkout / TeleBirr payment for a booking
 */
export function processMockPayment(renterUserId, bookingId, paymentDetails = {}) {
  if (!renterUserId) return { success: false, error: 'Not signed in' };

  const booking = getBookingById(bookingId);
  if (!booking) return { success: false, error: 'Booking not found' };

  if (booking.renterId !== renterUserId) {
    return { success: false, error: 'Not yours' };
  }

  const fakeRef = `TB-DEMO-${Math.floor(10000 + Math.random() * 90000)}`;

  return transitionBookingStatus(renterUserId, bookingId, BOOKING_STATES.CONFIRMED, {
    paymentStatus: 'paid_mock',
    paymentRef: fakeRef,
    ...paymentDetails,
  });
}

// -------------------------------------------------------------
// REVIEW OPERATIONS
// -------------------------------------------------------------

export function getReviews() {
  return readStorage(STORAGE_KEYS.REVIEWS, []);
}

export function getReviewsByCarId(carId) {
  const reviews = getReviews();
  return reviews.filter((r) => r.carId === carId);
}

/**
 * Submit a review (Renter only, strictly after completed booking)
 */
export function createReview(renterUserId, { bookingId, rating, comment }) {
  if (!renterUserId) return { success: false, error: 'Not signed in' };

  const booking = getBookingById(bookingId);
  if (!booking) return { success: false, error: 'Booking not found' };

  if (booking.renterId !== renterUserId) {
    return { success: false, error: 'Not yours' };
  }

  if (booking.status !== BOOKING_STATES.COMPLETED) {
    return { success: false, error: 'You can only review completed trips' };
  }

  const existingReviews = getReviews();
  if (existingReviews.some((r) => r.bookingId === bookingId)) {
    return { success: false, error: 'A review has already been submitted for this trip' };
  }

  const numericRating = Number(rating);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5 stars' };
  }

  if (!comment || !comment.trim()) {
    return { success: false, error: 'Please enter a review comment' };
  }

  const newReview = {
    id: generateId('rev'),
    bookingId,
    carId: booking.carId,
    renterId: renterUserId,
    ownerId: booking.ownerId,
    rating: numericRating,
    comment: comment.trim(),
    ownerReply: null,
    createdAt: new Date().toISOString(),
  };

  existingReviews.unshift(newReview);
  writeStorage(STORAGE_KEYS.REVIEWS, existingReviews);

  // Transition booking to reviewed
  transitionBookingStatus(renterUserId, bookingId, BOOKING_STATES.REVIEWED);

  return { success: true, review: newReview };
}

/**
 * Owner reply to a review
 */
export function replyToReview(ownerUserId, reviewId, replyText) {
  if (!ownerUserId) return { success: false, error: 'Not signed in' };

  const reviews = getReviews();
  const index = reviews.findIndex((r) => r.id === reviewId);
  if (index === -1) return { success: false, error: 'Review not found' };

  const review = reviews[index];
  if (review.ownerId !== ownerUserId) {
    return { success: false, error: 'Not yours' };
  }

  if (!replyText || !replyText.trim()) {
    return { success: false, error: 'Reply text cannot be empty' };
  }

  review.ownerReply = replyText.trim();
  review.repliedAt = new Date().toISOString();
  reviews[index] = review;

  writeStorage(STORAGE_KEYS.REVIEWS, reviews);
  return { success: true, review };
}

// -------------------------------------------------------------
// DISPUTE OPERATIONS
// -------------------------------------------------------------

export function getDisputes() {
  return readStorage(STORAGE_KEYS.DISPUTES, []);
}

export function getDisputeById(id) {
  if (!id) return null;
  const disputes = getDisputes();
  return disputes.find((d) => d.id === id) || null;
}

/**
 * Open a dispute (Only related renter or owner)
 */
export function createDispute(actorUserId, { bookingId, reason, description }) {
  if (!actorUserId) return { success: false, error: 'Not signed in' };

  const booking = getBookingById(bookingId);
  if (!booking) return { success: false, error: 'Booking not found' };

  // Check authorization: must be either renter or owner
  if (booking.renterId !== actorUserId && booking.ownerId !== actorUserId) {
    return { success: false, error: 'Not yours' };
  }

  if (!reason || !reason.trim() || !description || !description.trim()) {
    return { success: false, error: 'Reason and description are required' };
  }

  const disputes = getDisputes();
  const newDispute = {
    id: generateId('dispute'),
    bookingId,
    openedBy: actorUserId,
    reason: reason.trim(),
    description: description.trim(),
    status: 'open',
    resolutionNotes: '',
    resolvedBy: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  disputes.unshift(newDispute);
  writeStorage(STORAGE_KEYS.DISPUTES, disputes);

  // Transition booking to disputed
  transitionBookingStatus(actorUserId, bookingId, BOOKING_STATES.DISPUTED);

  return { success: true, dispute: newDispute };
}

/**
 * Resolve dispute (Admin only)
 */
export function resolveDispute(adminUserId, disputeId, resolutionNotes) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };

  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }

  if (!resolutionNotes || !resolutionNotes.trim()) {
    return { success: false, error: 'Resolution notes are required' };
  }

  const disputes = getDisputes();
  const index = disputes.findIndex((d) => d.id === disputeId);
  if (index === -1) return { success: false, error: 'Dispute not found' };

  disputes[index].status = 'resolved';
  disputes[index].resolutionNotes = resolutionNotes.trim();
  disputes[index].resolvedBy = adminUserId;
  disputes[index].resolvedAt = new Date().toISOString();

  writeStorage(STORAGE_KEYS.DISPUTES, disputes);

  // Transition booking to resolved
  transitionBookingStatus(adminUserId, disputes[index].bookingId, BOOKING_STATES.RESOLVED);

  logAdminActivity(adminUserId, {
    action: 'dispute_resolved',
    recordType: 'dispute',
    recordId: disputeId,
    explanation: `Resolved dispute #${disputeId}. Notes: ${resolutionNotes.trim()}`,
  });

  return { success: true, dispute: disputes[index] };
}

// -------------------------------------------------------------
// ADMIN BOOKING & FINANCIAL WORKFLOWS
// -------------------------------------------------------------

/**
 * Admin cancel booking with required explanation (Admin only)
 */
export function adminCancelBooking(adminUserId, bookingId, cancellationReason) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  if (!cancellationReason || !cancellationReason.trim()) {
    return { success: false, error: 'A cancellation reason is required' };
  }

  const booking = getBookingById(bookingId);
  if (!booking) return { success: false, error: 'Booking not found' };

  if (['completed', 'declined', 'cancelled', 'resolved'].includes(booking.status)) {
    return { success: false, error: `Cannot cancel a booking in "${booking.status}" state` };
  }

  const updates = {
    cancellationReason: `[Admin Policy] ${cancellationReason.trim()}`,
  };

  // If already paid mock, auto-flag for refund
  if (booking.paymentStatus === 'paid_mock') {
    updates.paymentStatus = 'refunded_mock';
    updates.refundRef = `RF-DEMO-${Math.floor(10000 + Math.random() * 90000)}`;
    updates.refundedAt = new Date().toISOString();
  }

  const res = transitionBookingStatus(adminUserId, bookingId, BOOKING_STATES.CANCELLED, updates);
  if (res.success) {
    logAdminActivity(adminUserId, {
      action: 'booking_cancelled',
      recordType: 'booking',
      recordId: bookingId,
      explanation: `Admin cancelled booking. Reason: ${cancellationReason.trim()}`,
    });
  }

  return res;
}

/**
 * Admin directly creates a new rent-out / booking agreement (walk-in or offline reservation)
 */
export function adminCreateBooking(adminUserId, {
  carId,
  renterId,
  renterName,
  renterEmail,
  renterPhone,
  startDate,
  endDate,
  status = BOOKING_STATES.CONFIRMED,
  paymentStatus = 'paid_mock',
  paymentMethod = 'TeleBirr Demo',
  notes = '',
}) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const car = getCarById(carId);
  if (!car) return { success: false, error: 'Selected vehicle not found' };

  const dateCheck = validateDateRange(startDate, endDate);
  if (!dateCheck.valid) {
    return { success: false, error: dateCheck.error };
  }

  const bookings = getBookings();
  const availability = isCarAvailableForDates(
    carId,
    startDate,
    endDate,
    bookings,
    car.unavailableDates || [],
    null,
    car
  );
  if (!availability.available) {
    return { success: false, error: availability.reason || 'Vehicle is not available for selected dates' };
  }

  let finalRenterId = renterId;
  if (!finalRenterId && renterName && renterName.trim()) {
    const users = getUsers();
    const existingUser = users.find((u) => u.email === renterEmail?.trim());
    if (existingUser) {
      finalRenterId = existingUser.id;
    } else {
      const newUser = {
        id: generateId('user-renter'),
        name: renterName.trim(),
        email: renterEmail?.trim() || `walkin-${Date.now()}@sheggarwheels.et`,
        phone: renterPhone?.trim() || '+251 91 000 0000',
        roles: ['renter'],
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      writeStorage(STORAGE_KEYS.USERS, users);
      finalRenterId = newUser.id;
    }
  }

  if (!finalRenterId) {
    return { success: false, error: 'A renter must be selected or specified' };
  }

  const days = dateCheck.days;
  const pricePerDay = car.pricePerDay;
  const subtotal = days * pricePerDay;
  const fee = Math.round(subtotal * 0.1);
  const total = subtotal + fee;

  const notesList = [];
  if (notes && notes.trim()) {
    notesList.push({
      id: generateId('note'),
      note: notes.trim(),
      authorId: adminUserId,
      authorName: admin.name || 'Administrator',
      createdAt: new Date().toISOString(),
    });
  }

  const newBooking = {
    id: generateId('booking'),
    carId,
    renterId: finalRenterId,
    ownerId: car.ownerId,
    startDate,
    endDate,
    days,
    pricePerDay,
    subtotal,
    fee,
    total,
    paymentStatus,
    paymentRef: paymentStatus === 'paid_mock' ? `TB-WALKIN-${Math.floor(10000 + Math.random() * 90000)}` : null,
    paymentMethod,
    status: [BOOKING_STATES.CONFIRMED, BOOKING_STATES.IN_PROGRESS].includes(status) ? status : BOOKING_STATES.CONFIRMED,
    adminNotesList: notesList,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdByAdmin: adminUserId,
  };

  bookings.unshift(newBooking);
  writeStorage(STORAGE_KEYS.BOOKINGS, bookings);

  logAdminActivity(adminUserId, {
    action: 'booking_created_by_admin',
    recordType: 'booking',
    recordId: newBooking.id,
    explanation: `Admin created manual rent-out agreement #${newBooking.id} for ${car.make} ${car.model}. Total: ETB ${total}`,
  });

  return { success: true, booking: newBooking };
}

/**
 * Admin confirm/approve booking request (requested -> confirmed)
 */
export function adminConfirmBooking(adminUserId, bookingId, adminNotes = '') {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const booking = getBookingById(bookingId);
  if (!booking) return { success: false, error: 'Booking not found' };

  if (booking.status !== BOOKING_STATES.REQUESTED) {
    return { success: false, error: `Cannot approve a booking in "${booking.status}" state` };
  }

  const updates = {};
  if (adminNotes && adminNotes.trim()) {
    updates.adminNotes = adminNotes.trim();
  }

  const res = transitionBookingStatus(adminUserId, bookingId, BOOKING_STATES.CONFIRMED, updates);
  if (res.success) {
    logAdminActivity(adminUserId, {
      action: 'booking_confirmed',
      recordType: 'booking',
      recordId: bookingId,
      explanation: `Admin approved and confirmed booking #${bookingId}.${adminNotes ? ` Note: ${adminNotes.trim()}` : ''}`,
    });
  }
  return res;
}

/**
 * Admin decline booking request (requested -> declined)
 */
export function adminDeclineBooking(adminUserId, bookingId, declineReason) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  if (!declineReason || !declineReason.trim()) {
    return { success: false, error: 'A decline reason is required' };
  }

  const booking = getBookingById(bookingId);
  if (!booking) return { success: false, error: 'Booking not found' };

  if (booking.status !== BOOKING_STATES.REQUESTED) {
    return { success: false, error: `Cannot decline a booking in "${booking.status}" state` };
  }

  const res = transitionBookingStatus(adminUserId, bookingId, BOOKING_STATES.DECLINED, {
    declineReason: `[Admin Decision] ${declineReason.trim()}`,
  });

  if (res.success) {
    logAdminActivity(adminUserId, {
      action: 'booking_declined',
      recordType: 'booking',
      recordId: bookingId,
      explanation: `Admin declined booking #${bookingId}. Reason: ${declineReason.trim()}`,
    });
  }
  return res;
}

/**
 * Admin add internal note to a booking / rental
 */
export function adminAddBookingNote(adminUserId, bookingId, noteText) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  if (!noteText || !noteText.trim()) {
    return { success: false, error: 'Note text cannot be empty' };
  }

  const bookings = getBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) return { success: false, error: 'Booking not found' };

  const booking = bookings[index];
  const notesList = Array.isArray(booking.adminNotesList) ? [...booking.adminNotesList] : [];
  const newNote = {
    id: generateId('note'),
    note: noteText.trim(),
    authorId: adminUserId,
    authorName: admin.name,
    createdAt: new Date().toISOString(),
  };
  notesList.unshift(newNote);
  booking.adminNotesList = notesList;
  booking.updatedAt = new Date().toISOString();

  bookings[index] = booking;
  writeStorage(STORAGE_KEYS.BOOKINGS, bookings);

  logAdminActivity(adminUserId, {
    action: 'booking_note_added',
    recordType: 'booking',
    recordId: bookingId,
    explanation: `Added internal admin note on booking #${bookingId}: "${noteText.trim().slice(0, 50)}..."`,
  });

  return { success: true, booking, note: newNote };
}

/**
 * Admin start rental trip (confirmed -> in_progress)
 */
export function adminStartBooking(adminUserId, bookingId) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const res = transitionBookingStatus(adminUserId, bookingId, BOOKING_STATES.IN_PROGRESS);
  if (res.success) {
    logAdminActivity(adminUserId, {
      action: 'booking_started',
      recordType: 'booking',
      recordId: bookingId,
      explanation: 'Admin marked booking as in-progress (vehicle handed over).',
    });
  }
  return res;
}

/**
 * Admin complete rental trip (in_progress -> completed)
 */
export function adminCompleteBooking(adminUserId, bookingId) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const res = transitionBookingStatus(adminUserId, bookingId, BOOKING_STATES.COMPLETED, {
    payoutStatus: 'payout_pending',
  });

  if (res.success) {
    logAdminActivity(adminUserId, {
      action: 'booking_completed',
      recordType: 'booking',
      recordId: bookingId,
      explanation: 'Admin marked booking as completed (vehicle returned).',
    });
  }
  return res;
}

/**
 * Admin process simulated payout to host (Admin only)
 */
export function adminProcessPayout(adminUserId, bookingId) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const bookings = getBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) return { success: false, error: 'Booking not found' };

  const booking = bookings[index];
  if (booking.payoutStatus === 'paid_out') {
    return { success: false, error: 'Payout has already been settled for this booking' };
  }

  const payoutRef = `PO-ETB-${Math.floor(10000 + Math.random() * 90000)}`;
  booking.payoutStatus = 'paid_out';
  booking.payoutRef = payoutRef;
  booking.payoutAt = new Date().toISOString();
  booking.payoutProcessedBy = adminUserId;

  bookings[index] = booking;
  writeStorage(STORAGE_KEYS.BOOKINGS, bookings);

  logAdminActivity(adminUserId, {
    action: 'payout_processed',
    recordType: 'booking',
    recordId: bookingId,
    explanation: `Processed simulated host payout of ETB ${booking.subtotal} (Ref: ${payoutRef}).`,
  });

  return { success: true, booking };
}

/**
 * Admin process simulated refund to renter (Admin only)
 */
export function adminProcessRefund(adminUserId, bookingId, refundReason) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const bookings = getBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) return { success: false, error: 'Booking not found' };

  const booking = bookings[index];
  if (booking.paymentStatus === 'refunded_mock') {
    return { success: false, error: 'Booking has already been refunded' };
  }

  const refundRef = `RF-DEMO-${Math.floor(10000 + Math.random() * 90000)}`;
  booking.paymentStatus = 'refunded_mock';
  booking.refundRef = refundRef;
  booking.refundReason = refundReason || 'Admin issued simulated refund';
  booking.refundedAt = new Date().toISOString();

  bookings[index] = booking;
  writeStorage(STORAGE_KEYS.BOOKINGS, bookings);

  logAdminActivity(adminUserId, {
    action: 'refund_processed',
    recordType: 'booking',
    recordId: bookingId,
    explanation: `Issued simulated refund of ETB ${booking.total} to renter (Ref: ${refundRef}).`,
  });

  return { success: true, booking };
}

/**
 * Admin moderate review (published, hidden, flagged)
 */
export function adminModerateReview(adminUserId, reviewId, status, moderationReason = '') {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const reviews = getReviews();
  const index = reviews.findIndex((r) => r.id === reviewId);
  if (index === -1) return { success: false, error: 'Review not found' };

  reviews[index].status = status; // 'published' | 'hidden' | 'flagged'
  reviews[index].moderationReason = moderationReason.trim();
  reviews[index].moderatedBy = adminUserId;
  reviews[index].moderatedAt = new Date().toISOString();

  writeStorage(STORAGE_KEYS.REVIEWS, reviews);

  logAdminActivity(adminUserId, {
    action: `review_${status}`,
    recordType: 'review',
    recordId: reviewId,
    explanation: `Moderated review status to "${status}". Reason: ${moderationReason || 'Policy review'}`,
  });

  return { success: true, review: reviews[index] };
}

// -------------------------------------------------------------
// ANNOUNCEMENT OPERATIONS
// -------------------------------------------------------------

export function getAnnouncements() {
  return readStorage(STORAGE_KEYS.ANNOUNCEMENTS, []);
}

export function getActiveAnnouncements() {
  const announcements = getAnnouncements();
  return announcements.filter((a) => a.active);
}

export function createAnnouncement(adminUserId, { title, message }) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };

  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  if (!title || !message) {
    return { success: false, error: 'Title and message are required' };
  }

  const announcements = getAnnouncements();
  const newAnn = {
    id: generateId('ann'),
    title: title.trim(),
    message: message.trim(),
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: adminUserId,
  };

  announcements.unshift(newAnn);
  writeStorage(STORAGE_KEYS.ANNOUNCEMENTS, announcements);

  logAdminActivity(adminUserId, {
    action: 'announcement_published',
    recordType: 'announcement',
    recordId: newAnn.id,
    explanation: `Published announcement: "${title.trim()}".`,
  });

  return { success: true, announcement: newAnn };
}

export function editAnnouncement(adminUserId, announcementId, updates) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };

  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const announcements = getAnnouncements();
  const index = announcements.findIndex((a) => a.id === announcementId);
  if (index === -1) return { success: false, error: 'Announcement not found' };

  announcements[index] = {
    ...announcements[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeStorage(STORAGE_KEYS.ANNOUNCEMENTS, announcements);

  logAdminActivity(adminUserId, {
    action: 'announcement_edited',
    recordType: 'announcement',
    recordId: announcementId,
    explanation: `Edited announcement #${announcementId}.`,
  });

  return { success: true, announcement: announcements[index] };
}

export function toggleAnnouncement(adminUserId, announcementId) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };

  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const announcements = getAnnouncements();
  const index = announcements.findIndex((a) => a.id === announcementId);
  if (index === -1) return { success: false, error: 'Announcement not found' };

  announcements[index].active = !announcements[index].active;
  writeStorage(STORAGE_KEYS.ANNOUNCEMENTS, announcements);

  logAdminActivity(adminUserId, {
    action: announcements[index].active ? 'announcement_activated' : 'announcement_deactivated',
    recordType: 'announcement',
    recordId: announcementId,
    explanation: `${announcements[index].active ? 'Activated' : 'Deactivated'} announcement #${announcementId}.`,
  });

  return { success: true, announcement: announcements[index] };
}

export function deleteAnnouncement(adminUserId, announcementId) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };

  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  let announcements = getAnnouncements();
  announcements = announcements.filter((a) => a.id !== announcementId);
  writeStorage(STORAGE_KEYS.ANNOUNCEMENTS, announcements);

  logAdminActivity(adminUserId, {
    action: 'announcement_deleted',
    recordType: 'announcement',
    recordId: announcementId,
    explanation: `Deleted announcement #${announcementId}.`,
  });

  return { success: true };
}

// -------------------------------------------------------------
// ADMIN AUDIT LOG OPERATIONS
// -------------------------------------------------------------

export function getActivityLog() {
  return readStorage(STORAGE_KEYS.ACTIVITY, []);
}

/**
 * Record an action in the browser activity audit log
 */
export function logAdminActivity(adminUserId, { action, recordType, recordId, explanation }) {
  if (!adminUserId) return;
  const admin = getUserById(adminUserId);
  const activities = getActivityLog();

  const newEntry = {
    id: generateId('act'),
    action,
    actorId: adminUserId,
    actorName: admin?.name || 'Administrator',
    recordType,
    recordId,
    timestamp: new Date().toISOString(),
    explanation: explanation || `${action} on ${recordType} #${recordId}`,
  };

  activities.unshift(newEntry);
  // Cap at 200 items to safeguard storage
  writeStorage(STORAGE_KEYS.ACTIVITY, activities.slice(0, 200));
  return newEntry;
}

// -------------------------------------------------------------
// PLATFORM CONFIGURATION & SETTINGS
// -------------------------------------------------------------

export function getSettings() {
  const current = readStorage(STORAGE_KEYS.SETTINGS, null);
  return current ? { ...DEFAULT_SETTINGS, ...current } : DEFAULT_SETTINGS;
}

export function updateSettings(adminUserId, newSettings) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }
  if (isUserSuspended(admin)) {
    return { success: false, error: 'Your account is suspended' };
  }

  const commission = Number(newSettings.commissionPercent);
  if (isNaN(commission) || commission < 0 || commission > 50) {
    return { success: false, error: 'Commission rate must be between 0% and 50%' };
  }

  const minDays = Number(newSettings.minRentalDays);
  const maxDays = Number(newSettings.maxRentalDays);
  if (isNaN(minDays) || minDays < 1) {
    return { success: false, error: 'Minimum rental duration must be at least 1 day' };
  }
  if (isNaN(maxDays) || maxDays < minDays) {
    return { success: false, error: 'Maximum rental duration must be greater than minimum duration' };
  }

  const current = getSettings();
  const merged = {
    ...current,
    ...newSettings,
    commissionPercent: commission,
    minRentalDays: minDays,
    maxRentalDays: maxDays,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUserId,
  };

  writeStorage(STORAGE_KEYS.SETTINGS, merged);

  logAdminActivity(adminUserId, {
    action: 'settings_updated',
    recordType: 'settings',
    recordId: 'global',
    explanation: `Updated platform settings (commission: ${commission}%, min: ${minDays}d, max: ${maxDays}d).`,
  });

  return { success: true, settings: merged };
}

export function resetSettings(adminUserId) {
  if (!adminUserId) return { success: false, error: 'Not signed in' };
  const admin = getUserById(adminUserId);
  if (!admin || !hasRole(admin, 'admin')) {
    return { success: false, error: 'Unauthorized: Admin role required' };
  }

  writeStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

  logAdminActivity(adminUserId, {
    action: 'settings_reset',
    recordType: 'settings',
    recordId: 'global',
    explanation: 'Reset platform settings to default parameters.',
  });

  return { success: true, settings: DEFAULT_SETTINGS };
}
