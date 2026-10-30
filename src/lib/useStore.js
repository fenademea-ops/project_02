'use client';

/**
 * Sheggar Wheels Reactive Storage Hook & State Provider
 * Provides synchronized state for cars, bookings, users, reviews, disputes, announcements,
 * and current auth session with cross-tab and in-tab reactive refresh.
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  STORAGE_KEYS,
  readStorage,
  initializeDemoData,
  resetDemoData,
  subscribeToStorageChanges,
} from './storage';
import {
  getCurrentSession,
  signInAsDemo,
  signInWithEmail,
  registerUser,
  signOut,
} from './auth';
import {
  getApprovedCars,
  getCars,
  getBookings,
  getReviews,
  getDisputes,
  getAnnouncements,
  getUsers,
  createBooking,
  transitionBookingStatus,
  processMockPayment,
  createCarListing,
  updateCarListing,
  toggleCarActiveStatus,
  adminModerateCar,
  adminEditCar,
  adminUpdateCarRentOutStatus,
  adminBlockCarDates,
  adminUnblockCarDates,
  getCarRentalAvailability,
  adminCancelBooking,
  adminCreateBooking,
  adminConfirmBooking,
  adminDeclineBooking,
  adminAddBookingNote,
  adminStartBooking,
  adminCompleteBooking,
  adminProcessPayout,
  adminProcessRefund,
  createReview,
  replyToReview,
  adminModerateReview,
  createDispute,
  resolveDispute,
  createAnnouncement,
  editAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  updateUserStatus,
  getActivityLog,
  getSettings,
  updateSettings,
  resetSettings,
} from './data';
import { BOOKING_STATES } from './bookingMachine';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [settings, setSettings] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  const refreshState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const { session: sess, user } = getCurrentSession();
    setSession(sess);
    setCurrentUser(user);

    setUsers(getUsers());
    setCars(getCars());
    setBookings(getBookings());
    setReviews(getReviews());
    setDisputes(getDisputes());
    setAnnouncements(getAnnouncements());
    setActivityLog(getActivityLog());
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    // 1. Initialize demo data if not present
    initializeDemoData();
    setIsInitialized(true);
    refreshState();

    // 2. Subscribe to reactive storage changes
    const unsubscribe = subscribeToStorageChanges(() => {
      refreshState();
    });

    // 3. Listen for sign-out event — clear state then hard-redirect to home
    const handleSignOut = () => {
      refreshState();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    };
    window.addEventListener('sheggar_signout', handleSignOut);

    return () => {
      unsubscribe();
      window.removeEventListener('sheggar_signout', handleSignOut);
    };
  }, [refreshState]);

  // Auth actions
  const handleSignInAsDemo = (userId) => {
    const res = signInAsDemo(userId);
    if (res.success) {
      refreshState();
      showToast(`Signed in as ${res.user.name}`, 'success');
    } else {
      showToast(res.error || 'Failed to sign in', 'error');
    }
    return res;
  };

  const handleSignInWithEmail = (email) => {
    const res = signInWithEmail(email);
    if (res.success) {
      refreshState();
      showToast(`Welcome back, ${res.user.name}`, 'success');
    } else {
      showToast(res.error || 'Failed to sign in', 'error');
    }
    return res;
  };

  const handleRegister = (payload) => {
    const res = registerUser(payload);
    if (res.success) {
      refreshState();
      showToast(`Account created! Welcome ${res.user.name}`, 'success');
    } else {
      showToast(res.error || 'Registration failed', 'error');
    }
    return res;
  };

  const handleSignOut = () => {
    signOut();
  };

  const handleResetData = () => {
    resetDemoData();
    refreshState();
    showToast('Demo data reset to default seed state', 'info');
  };

  const value = {
    isInitialized,
    session,
    currentUser,
    users,
    cars,
    approvedCars: cars.filter((c) => c.status === 'approved'),
    bookings,
    reviews,
    disputes,
    announcements,
    activeAnnouncements: announcements.filter((a) => a.active),
    activityLog,
    settings,
    getCarAvailability: (carId, date) => getCarRentalAvailability(carId, date),
    toast,
    showToast,
    refreshState,
    // Actions
    signInAsDemo: handleSignInAsDemo,
    signInWithEmail: handleSignInWithEmail,
    register: handleRegister,
    signOut: handleSignOut,
    resetData: handleResetData,
    // Data operations wrapped with UI toast & refresh
    createBooking: (payload) => {
      const res = createBooking(currentUser?.id, payload);
      if (res.success) {
        refreshState();
        showToast('Booking request submitted successfully!', 'success');
      } else {
        showToast(res.error || 'Could not create booking', 'error');
      }
      return res;
    },
    transitionBooking: (bookingId, targetStatus, metadata) => {
      const res = transitionBookingStatus(currentUser?.id, bookingId, targetStatus, metadata);
      if (res.success) {
        refreshState();
        showToast(`Booking updated to ${targetStatus.replace('_', ' ')}`, 'success');
      } else {
        showToast(res.error || 'Action failed', 'error');
      }
      return res;
    },
    payBooking: (bookingId, details) => {
      const res = processMockPayment(currentUser?.id, bookingId, details);
      if (res.success) {
        refreshState();
        showToast('Demo TeleBirr payment confirmed!', 'success');
      } else {
        showToast(res.error || 'Payment failed', 'error');
      }
      return res;
    },
    createCar: (carData) => {
      const res = createCarListing(currentUser?.id, carData);
      if (res.success) {
        refreshState();
        showToast('Car listed! Awaiting admin approval.', 'success');
      } else {
        showToast(res.error || 'Failed to list car', 'error');
      }
      return res;
    },
    updateCar: (carId, updates) => {
      const res = updateCarListing(currentUser?.id, carId, updates);
      if (res.success) {
        refreshState();
        showToast('Car listing updated successfully', 'success');
      } else {
        showToast(res.error || 'Failed to update car', 'error');
      }
      return res;
    },
    toggleCarStatus: (carId) => {
      const res = toggleCarActiveStatus(currentUser?.id, carId);
      if (res.success) {
        refreshState();
        showToast(`Vehicle status changed to ${res.car.status}`, 'info');
      } else {
        showToast(res.error || 'Action failed', 'error');
      }
      return res;
    },
    moderateCar: (carId, status, notes) => {
      const res = adminModerateCar(currentUser?.id, carId, status, notes);
      if (res.success) {
        refreshState();
        showToast(`Car ${status} successfully`, 'success');
      } else {
        showToast(res.error || 'Moderation failed', 'error');
      }
      return res;
    },
    submitReview: (payload) => {
      const res = createReview(currentUser?.id, payload);
      if (res.success) {
        refreshState();
        showToast('Review submitted! Thank you.', 'success');
      } else {
        showToast(res.error || 'Failed to submit review', 'error');
      }
      return res;
    },
    replyReview: (reviewId, text) => {
      const res = replyToReview(currentUser?.id, reviewId, text);
      if (res.success) {
        refreshState();
        showToast('Reply published successfully', 'success');
      } else {
        showToast(res.error || 'Failed to publish reply', 'error');
      }
      return res;
    },
    submitDispute: (payload) => {
      const res = createDispute(currentUser?.id, payload);
      if (res.success) {
        refreshState();
        showToast('Dispute opened. Our admin team will investigate.', 'info');
      } else {
        showToast(res.error || 'Failed to open dispute', 'error');
      }
      return res;
    },
    resolveDisputeAction: (disputeId, notes) => {
      const res = resolveDispute(currentUser?.id, disputeId, notes);
      if (res.success) {
        refreshState();
        showToast('Dispute resolved successfully', 'success');
      } else {
        showToast(res.error || 'Failed to resolve dispute', 'error');
      }
      return res;
    },
    updateUserStatusAction: (targetUserId, newStatus) => {
      const res = updateUserStatus(currentUser?.id, targetUserId, newStatus);
      if (res.success) {
        refreshState();
        showToast(`User status updated to ${newStatus}`, 'info');
      } else {
        showToast(res.error || 'Failed to update user', 'error');
      }
      return res;
    },
    createAnnouncementAction: (data) => {
      const res = createAnnouncement(currentUser?.id, data);
      if (res.success) {
        refreshState();
        showToast('Announcement posted', 'success');
      } else {
        showToast(res.error || 'Failed to post announcement', 'error');
      }
      return res;
    },
    toggleAnnouncementAction: (annId) => {
      const res = toggleAnnouncement(currentUser?.id, annId);
      if (res.success) {
        refreshState();
      }
      return res;
    },
    editAnnouncementAction: (annId, updates) => {
      const res = editAnnouncement(currentUser?.id, annId, updates);
      if (res.success) {
        refreshState();
        showToast('Announcement updated', 'success');
      } else {
        showToast(res.error || 'Failed to update announcement', 'error');
      }
      return res;
    },
    deleteAnnouncementAction: (annId) => {
      const res = deleteAnnouncement(currentUser?.id, annId);
      if (res.success) {
        refreshState();
        showToast('Announcement deleted', 'info');
      } else {
        showToast(res.error || 'Failed to delete announcement', 'error');
      }
      return res;
    },
    adminEditCarAction: (carId, updates) => {
      const res = adminEditCar(currentUser?.id, carId, updates);
      if (res.success) {
        refreshState();
        showToast('Car listing details updated', 'success');
      } else {
        showToast(res.error || 'Failed to edit car', 'error');
      }
      return res;
    },
    adminUpdateCarRentOutStatusAction: (carId, payload) => {
      const res = adminUpdateCarRentOutStatus(currentUser?.id, carId, payload);
      if (res.success) {
        refreshState();
        showToast('Vehicle rent-out and availability controls updated successfully', 'success');
      } else {
        showToast(res.error || 'Failed to update rent-out status', 'error');
      }
      return res;
    },
    adminBlockCarDatesAction: (carId, payload) => {
      const res = adminBlockCarDates(currentUser?.id, carId, payload);
      if (res.success) {
        refreshState();
        showToast('Dates blocked on vehicle calendar successfully', 'success');
      } else {
        showToast(res.error || 'Failed to block dates', 'error');
      }
      return res;
    },
    adminUnblockCarDatesAction: (carId, blockIdOrDate) => {
      const res = adminUnblockCarDates(currentUser?.id, carId, blockIdOrDate);
      if (res.success) {
        refreshState();
        showToast('Blocked dates removed. Vehicle calendar updated', 'info');
      } else {
        showToast(res.error || 'Failed to unblock dates', 'error');
      }
      return res;
    },
    adminCreateBookingAction: (payload) => {
      const res = adminCreateBooking(currentUser?.id, payload);
      if (res.success) {
        refreshState();
        showToast(`Created rent-out agreement #${res.booking.id}`, 'success');
      } else {
        showToast(res.error || 'Failed to create rent-out agreement', 'error');
      }
      return res;
    },
    adminCancelBookingAction: (bookingId, reason) => {
      const res = adminCancelBooking(currentUser?.id, bookingId, reason);
      if (res.success) {
        refreshState();
        showToast('Booking cancelled by administrator', 'info');
      } else {
        showToast(res.error || 'Failed to cancel booking', 'error');
      }
      return res;
    },
    adminConfirmBookingAction: (bookingId, adminNotes) => {
      const res = adminConfirmBooking(currentUser?.id, bookingId, adminNotes);
      if (res.success) {
        refreshState();
        showToast('Booking request approved and confirmed', 'success');
      } else {
        showToast(res.error || 'Failed to approve booking', 'error');
      }
      return res;
    },
    adminDeclineBookingAction: (bookingId, declineReason) => {
      const res = adminDeclineBooking(currentUser?.id, bookingId, declineReason);
      if (res.success) {
        refreshState();
        showToast('Booking request declined', 'info');
      } else {
        showToast(res.error || 'Failed to decline booking', 'error');
      }
      return res;
    },
    adminAddBookingNoteAction: (bookingId, noteText) => {
      const res = adminAddBookingNote(currentUser?.id, bookingId, noteText);
      if (res.success) {
        refreshState();
        showToast('Internal note saved', 'success');
      } else {
        showToast(res.error || 'Failed to add note', 'error');
      }
      return res;
    },
    adminStartBookingAction: (bookingId) => {
      const res = adminStartBooking(currentUser?.id, bookingId);
      if (res.success) {
        refreshState();
        showToast('Rental marked as started / in progress', 'success');
      } else {
        showToast(res.error || 'Action failed', 'error');
      }
      return res;
    },
    adminCompleteBookingAction: (bookingId) => {
      const res = adminCompleteBooking(currentUser?.id, bookingId);
      if (res.success) {
        refreshState();
        showToast('Rental marked as completed', 'success');
      } else {
        showToast(res.error || 'Action failed', 'error');
      }
      return res;
    },
    adminProcessPayoutAction: (bookingId) => {
      const res = adminProcessPayout(currentUser?.id, bookingId);
      if (res.success) {
        refreshState();
        showToast(`Simulated payout processed (Ref: ${res.booking.payoutRef})`, 'success');
      } else {
        showToast(res.error || 'Payout failed', 'error');
      }
      return res;
    },
    adminProcessRefundAction: (bookingId, reason) => {
      const res = adminProcessRefund(currentUser?.id, bookingId, reason);
      if (res.success) {
        refreshState();
        showToast(`Simulated refund processed (Ref: ${res.booking.refundRef})`, 'success');
      } else {
        showToast(res.error || 'Refund failed', 'error');
      }
      return res;
    },
    adminModerateReviewAction: (reviewId, status, reason) => {
      const res = adminModerateReview(currentUser?.id, reviewId, status, reason);
      if (res.success) {
        refreshState();
        showToast(`Review marked as ${status}`, 'info');
      } else {
        showToast(res.error || 'Moderation failed', 'error');
      }
      return res;
    },
    updateSettingsAction: (newSettings) => {
      const res = updateSettings(currentUser?.id, newSettings);
      if (res.success) {
        refreshState();
        showToast('Platform settings saved successfully', 'success');
      } else {
        showToast(res.error || 'Failed to save settings', 'error');
      }
      return res;
    },
    resetSettingsAction: () => {
      const res = resetSettings(currentUser?.id);
      if (res.success) {
        refreshState();
        showToast('Settings reset to default configuration', 'info');
      } else {
        showToast(res.error || 'Failed to reset settings', 'error');
      }
      return res;
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
