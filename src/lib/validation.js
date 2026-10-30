/**
 * Sheggar Wheels validation helpers
 */

/**
 * Validate standard email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Check if email is unique among existing users
 * @param {string} email
 * @param {Array<Object>} users
 * @param {string|null} [excludeUserId]
 * @returns {boolean}
 */
export function isEmailUnique(email, users = [], excludeUserId = null) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return !users.some(
    (u) => u.email.toLowerCase() === cleanEmail && (!excludeUserId || u.id !== excludeUserId)
  );
}

/**
 * Validate that a price is positive
 * @param {number|string} price
 * @returns {boolean}
 */
export function isPositivePrice(price) {
  const num = Number(price);
  return !isNaN(num) && num > 0;
}

/**
 * Validate date format YYYY-MM-DD
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

/**
 * Calculate difference in days between two YYYY-MM-DD dates (inclusive or rental day count)
 * For car rentals: same day start/end = 1 day, or end - start days.
 * Standard rental day calculation: Math.max(1, Math.round((end - start) / 86400000))
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
export function calculateRentalDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Validate rental date range
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {{ valid: boolean, days: number, error?: string }}
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, days: 0, error: 'Start date and end date are required' };
  }

  if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    return { valid: false, days: 0, error: 'Dates must be in YYYY-MM-DD format' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return { valid: false, days: 0, error: 'End date cannot be earlier than start date' };
  }

  const days = calculateRentalDays(startDate, endDate);
  return { valid: true, days };
}

/**
 * Check if two date ranges overlap [startA, endA] and [startB, endB]
 * Dates overlap if StartA <= EndB and EndA >= StartB
 * @param {string} startA
 * @param {string} endA
 * @param {string} startB
 * @param {string} endB
 * @returns {boolean}
 */
export function checkDateOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

/**
 * Check if a car is available for a requested date range.
 * Active bookings statuses that lock dates: 'requested', 'confirmed', 'in_progress'
 * @param {string} carId
 * @param {string} startDate
 * @param {string} endDate
 * @param {Array<Object>} existingBookings
 * @param {Array<string>} [carUnavailableDates] - List of specific blocked dates or ranges
 * @param {string|null} [excludeBookingId]
 * @returns {{ available: boolean, reason?: string }}
 */
export function isCarAvailableForDates(
  carId,
  startDate,
  endDate,
  existingBookings = [],
  carUnavailableDates = [],
  excludeBookingId = null,
  carObject = null
) {
  const rangeValidation = validateDateRange(startDate, endDate);
  if (!rangeValidation.valid) {
    return { available: false, reason: rangeValidation.error };
  }

  // If carObject or car is provided, check general operational and rent-out availability
  if (carObject) {
    if (carObject.status !== 'approved') {
      return { available: false, reason: `Vehicle is ${carObject.status} and not approved for hire` };
    }
    if (
      carObject.isAvailable === false ||
      ['maintenance', 'temporarily_unavailable', 'unavailable', 'suspended'].includes(carObject.availabilityStatus)
    ) {
      const reason = carObject.unavailabilityReason ? `: ${carObject.unavailabilityReason}` : '';
      const isMaint = carObject.availabilityStatus === 'maintenance';
      return {
        available: false,
        reason: isMaint
          ? `Vehicle is currently undergoing maintenance${reason}`
          : `Vehicle is temporarily unavailable for rent${reason}`,
      };
    }
    if (carObject.availableFrom && startDate < carObject.availableFrom) {
      return { available: false, reason: `Vehicle is unavailable until ${carObject.availableFrom}` };
    }
  }

  // Check custom owner-blocked dates or admin-blocked maintenance periods
  const effectiveUnavailableDates =
    Array.isArray(carUnavailableDates) && carUnavailableDates.length > 0
      ? carUnavailableDates
      : Array.isArray(carObject?.unavailableDates)
        ? carObject.unavailableDates
        : [];

  if (Array.isArray(effectiveUnavailableDates)) {
    for (const blocked of effectiveUnavailableDates) {
      if (typeof blocked === 'string') {
        // Single blocked date YYYY-MM-DD
        if (startDate <= blocked && endDate >= blocked) {
          return { available: false, reason: `Vehicle is marked unavailable on ${blocked}` };
        }
      } else if (blocked && blocked.startDate && blocked.endDate) {
        if (checkDateOverlap(startDate, endDate, blocked.startDate, blocked.endDate)) {
          const reasonText = blocked.reason ? ` (${blocked.reason})` : '';
          return {
            available: false,
            reason: `Vehicle is blocked from ${blocked.startDate} to ${blocked.endDate}${reasonText}`,
          };
        }
      }
    }
  }

  // Active bookings that block the calendar
  const blockingStatuses = ['requested', 'confirmed', 'in_progress'];
  const overlapping = existingBookings.find((b) => {
    if (b.carId !== carId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (!blockingStatuses.includes(b.status)) return false;
    return checkDateOverlap(startDate, endDate, b.startDate, b.endDate);
  });

  if (overlapping) {
    return {
      available: false,
      reason: `Vehicle is already booked from ${overlapping.startDate} to ${overlapping.endDate} (${overlapping.status === 'in_progress' ? 'active rental' : overlapping.status})`,
    };
  }

  return { available: true };
}

/**
 * Validate fields present on an object
 * @param {Object} obj
 * @param {Array<string>} fields
 * @returns {{ valid: boolean, missing: Array<string> }}
 */
export function validateRequiredFields(obj = {}, fields = []) {
  const missing = [];
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || String(obj[field]).trim() === '') {
      missing.push(field);
    }
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}
