import { describe, it, expect, beforeEach } from 'vitest';
import {
  adminUpdateCarRentOutStatus,
  adminBlockCarDates,
  adminUnblockCarDates,
  getCars,
  getBookings
} from '../data';
import { resetDemoData } from '../storage';
import { isCarAvailableForDates } from '../validation';

const mockStorage = {};
const mockSessionStorage = {};
const createMockEngine = (store) => ({
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => {
    store[key] = String(val);
  },
  removeItem: (key) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
});

global.window = {
  localStorage: createMockEngine(mockStorage),
  sessionStorage: createMockEngine(mockSessionStorage),
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

describe('Admin Rent-Out Controls & Availability Integration Suite', () => {
  beforeEach(() => {
    global.window.localStorage.clear();
    resetDemoData();
  });

  it('Scenario 1 & 2: Approved car can be marked unavailable for maintenance and blocks new bookings', () => {
    const cars = getCars();
    const targetCar = cars.find((c) => c.status === 'approved' && c.id === 'car-1');
    expect(targetCar).toBeDefined();

    // Mark unavailable for maintenance
    const res = adminUpdateCarRentOutStatus('user-admin-1', 'car-1', {
      availabilityStatus: 'maintenance',
      isAvailable: false,
      unavailabilityReason: 'Transmission fluid replacement and brake pad inspection',
      availableFrom: '2026-11-10'
    });

    expect(res.success).toBe(true);
    expect(res.car.availabilityStatus).toBe('maintenance');
    expect(res.car.isAvailable).toBe(false);
    expect(res.car.unavailabilityReason).toContain('Transmission fluid');

    // Validation must reject bookings for dates before availableFrom
    const availabilityCheck = isCarAvailableForDates(
      'car-1',
      '2026-11-01',
      '2026-11-05',
      getBookings(),
      null,
      null,
      res.car
    );

    expect(availabilityCheck.available).toBe(false);
    expect(availabilityCheck.reason).toContain('maintenance');
  });

  it('Scenario 4: Admin reactivates the car to available and booking is permitted again', () => {
    // First set maintenance
    adminUpdateCarRentOutStatus('user-admin-1', 'car-1', {
      availabilityStatus: 'maintenance',
      isAvailable: false,
      unavailabilityReason: 'Oil change'
    });

    // Reactivate
    const res = adminUpdateCarRentOutStatus('user-admin-1', 'car-1', {
      availabilityStatus: 'available',
      isAvailable: true,
      unavailabilityReason: '',
      availableFrom: ''
    });

    expect(res.success).toBe(true);
    expect(res.car.availabilityStatus).toBe('available');
    expect(res.car.isAvailable).toBe(true);

    const check = isCarAvailableForDates(
      'car-1',
      '2026-12-01',
      '2026-12-05',
      getBookings(),
      null,
      null,
      res.car
    );

    expect(check.available).toBe(true);
  });

  it('Scenario 5: A currently rented car (in_progress) cannot be marked available prematurely', () => {
    const bookings = getBookings();
    const activeBooking = bookings.find((b) => b.status === 'in_progress');
    expect(activeBooking).toBeDefined();

    const carId = activeBooking.carId;

    // Attempting to set 'available' while on active rental must be rejected
    const res = adminUpdateCarRentOutStatus('user-admin-1', carId, {
      availabilityStatus: 'available',
      isAvailable: true
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/currently on trip with active renter/);
  });

  it('Scenario 6 & 7: Date blocking prevents collisions with bookings and allows bookings outside blocked dates', () => {
    // Add custom blackout range
    const blockRes = adminBlockCarDates('user-admin-1', 'car-2', {
      startDate: '2026-11-15',
      endDate: '2026-11-20',
      reason: 'VIP diplomatic reservation hold'
    });

    expect(blockRes.success).toBe(true);
    expect(blockRes.car.unavailableDates).toBeDefined();
    const foundBlock = blockRes.car.unavailableDates.find((b) => b.reason?.includes('VIP diplomatic'));
    expect(foundBlock).toBeDefined();

    // Conflicting range must be blocked
    const conflictCheck = isCarAvailableForDates(
      'car-2',
      '2026-11-16',
      '2026-11-18',
      getBookings(),
      null,
      null,
      blockRes.car
    );
    expect(conflictCheck.available).toBe(false);
    expect(conflictCheck.reason).toContain('VIP diplomatic');

    // Outside range is permitted
    const outsideCheck = isCarAvailableForDates(
      'car-2',
      '2026-11-25',
      '2026-11-28',
      getBookings(),
      null,
      null,
      blockRes.car
    );
    expect(outsideCheck.available).toBe(true);
  });

  it('Cannot block dates that overlap with an existing confirmed booking', () => {
    const bookings = getBookings();
    const confirmedBooking = bookings.find((b) => b.status === 'confirmed');
    expect(confirmedBooking).toBeDefined();

    // Trying to block over the customer confirmed booking must be rejected
    const blockRes = adminBlockCarDates('user-admin-1', confirmedBooking.carId, {
      startDate: confirmedBooking.startDate,
      endDate: confirmedBooking.endDate,
      reason: 'Attempted administrative block'
    });

    expect(blockRes.success).toBe(false);
    expect(blockRes.error).toMatch(/Conflict: Cannot block dates overlapping with/);
  });

  it('Scenario 8: Unblocking a date range restores availability', () => {
    const blockRes = adminBlockCarDates('user-admin-1', 'car-2', {
      startDate: '2026-11-15',
      endDate: '2026-11-20',
      reason: 'Temporary workshop stay'
    });

    expect(blockRes.success).toBe(true);
    const blockId = blockRes.block.id;

    const unblockRes = adminUnblockCarDates('user-admin-1', 'car-2', blockId);
    expect(unblockRes.success).toBe(true);

    const recheck = isCarAvailableForDates(
      'car-2',
      '2026-11-16',
      '2026-11-18',
      getBookings(),
      null,
      null,
      unblockRes.car
    );
    expect(recheck.available).toBe(true);
  });
});
