/**
 * Booking Lifecycle State Machine
 *
 * State flow:
 * requested   → confirmed (owner) | declined (owner) | cancelled (renter)
 * confirmed   → in_progress (owner/renter) | cancelled (renter)
 * in_progress → completed (owner/renter) | disputed (renter/owner)
 * completed   → reviewed (renter)
 * disputed    → resolved (admin)
 *
 * Terminal states: declined, cancelled, reviewed, resolved
 */

export const BOOKING_STATES = {
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REVIEWED: 'reviewed',
  DISPUTED: 'disputed',
  RESOLVED: 'resolved',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
};

export const TERMINAL_STATES = [
  BOOKING_STATES.DECLINED,
  BOOKING_STATES.CANCELLED,
  BOOKING_STATES.REVIEWED,
  BOOKING_STATES.RESOLVED,
];

/**
 * Transition rules map:
 * fromState: {
 *   toState: [allowedRoles]
 * }
 */
export const TRANSITIONS = {
  [BOOKING_STATES.REQUESTED]: {
    [BOOKING_STATES.CONFIRMED]: ['owner', 'admin'],
    [BOOKING_STATES.DECLINED]: ['owner', 'admin'],
    [BOOKING_STATES.CANCELLED]: ['renter', 'admin'],
  },
  [BOOKING_STATES.CONFIRMED]: {
    [BOOKING_STATES.IN_PROGRESS]: ['owner', 'renter', 'admin'],
    [BOOKING_STATES.CANCELLED]: ['renter', 'owner', 'admin'],
  },
  [BOOKING_STATES.IN_PROGRESS]: {
    [BOOKING_STATES.COMPLETED]: ['owner', 'renter', 'admin'],
    [BOOKING_STATES.DISPUTED]: ['renter', 'owner', 'admin'],
  },
  [BOOKING_STATES.COMPLETED]: {
    [BOOKING_STATES.REVIEWED]: ['renter', 'admin'],
    [BOOKING_STATES.DISPUTED]: ['renter', 'owner', 'admin'],
  },
  [BOOKING_STATES.DISPUTED]: {
    [BOOKING_STATES.RESOLVED]: ['admin'],
  },
  // Terminal states have no valid transitions
  [BOOKING_STATES.DECLINED]: {},
  [BOOKING_STATES.CANCELLED]: {},
  [BOOKING_STATES.REVIEWED]: {},
  [BOOKING_STATES.RESOLVED]: {},
};

/**
 * Check whether a state transition is permitted for an actor role
 * @param {string} fromState
 * @param {string} toState
 * @param {string} actorRole - 'renter' | 'owner' | 'admin'
 * @returns {boolean}
 */
export function canTransition(fromState, toState, actorRole) {
  if (!fromState || !toState || !actorRole) return false;

  const validTargetStates = TRANSITIONS[fromState];
  if (!validTargetStates) return false;

  const allowedRoles = validTargetStates[toState];
  if (!allowedRoles) return false;

  return allowedRoles.includes(actorRole);
}

/**
 * Get all available transitions from the current state for a given actor role
 * @param {string} currentState
 * @param {string} actorRole
 * @returns {Array<string>} list of next state keys
 */
export function getNextValidTransitions(currentState, actorRole) {
  if (!currentState || !actorRole) return [];
  const targets = TRANSITIONS[currentState] || {};
  return Object.keys(targets).filter((targetState) =>
    targets[targetState].includes(actorRole)
  );
}

/**
 * Check if state is terminal
 * @param {string} state
 * @returns {boolean}
 */
export function isTerminalState(state) {
  return TERMINAL_STATES.includes(state);
}
