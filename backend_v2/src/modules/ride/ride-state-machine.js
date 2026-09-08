/**
 * Ride State Machine
 *
 * Defines valid ride state transitions and terminal states.
 */

const ALLOWED_TRANSITIONS = {
  requested: ['searching', 'cancelled', 'expired'],
  searching: ['accepted', 'cancelled', 'expired', 'no_driver_found'],
  accepted: ['arriving', 'cancelled'],
  arriving: ['arrived', 'started', 'cancelled'],
  arrived: ['started', 'cancelled'],
  started: ['completed'],
  completed: [],
  cancelled: [],
  expired: [],
  no_driver_found: ['searching', 'cancelled'],
};

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'expired']);

/**
 * Checks whether transitioning from `fromStatus` to `toStatus` is valid.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export function isValidTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Checks if a status is terminal.
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}
