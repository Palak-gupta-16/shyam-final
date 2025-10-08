// State machine definitions for order lifecycle
const DISPATCH_STATES = {
  PENDING_GUARD_APPROVAL: 'pending_guard_approval',
  INSIDE_FACTORY_PENDING_EMPTY_WEIGHT: 'inside_factory_pending_empty_weight',
  INSIDE_FACTORY_PENDING_LOADING: 'inside_factory_pending_loading',
  INSIDE_FACTORY_PENDING_FINAL_WEIGHT: 'inside_factory_pending_final_weight',
  READY_FOR_BILLING: 'ready_for_billing',
  READY_FOR_DISPATCH: 'ready_for_dispatch',
  COMPLETED: 'completed'
};

const PURCHASE_STATES = {
  PENDING_GUARD_APPROVAL: 'pending_guard_approval',
  INSIDE_FACTORY_PENDING_EMPTY_WEIGHT_PURCHASE: 'inside_factory_pending_empty_weight_purchase',
  INSIDE_FACTORY_PENDING_UNLOADING: 'inside_factory_pending_unloading',
  INSIDE_FACTORY_PENDING_FINAL_WEIGHT_PURCHASE: 'inside_factory_pending_final_weight_purchase',
  READY_FOR_BILLING_PURCHASE: 'ready_for_billing_purchase',
  READY_FOR_EXIT_PURCHASE: 'ready_for_exit_purchase',
  COMPLETED: 'completed'
};

// Valid state transitions for dispatch orders
const DISPATCH_TRANSITIONS = {
  [DISPATCH_STATES.PENDING_GUARD_APPROVAL]: [DISPATCH_STATES.INSIDE_FACTORY_PENDING_EMPTY_WEIGHT],
  [DISPATCH_STATES.INSIDE_FACTORY_PENDING_EMPTY_WEIGHT]: [DISPATCH_STATES.INSIDE_FACTORY_PENDING_LOADING],
  [DISPATCH_STATES.INSIDE_FACTORY_PENDING_LOADING]: [DISPATCH_STATES.INSIDE_FACTORY_PENDING_FINAL_WEIGHT],
  [DISPATCH_STATES.INSIDE_FACTORY_PENDING_FINAL_WEIGHT]: [DISPATCH_STATES.READY_FOR_BILLING],
  [DISPATCH_STATES.READY_FOR_BILLING]: [DISPATCH_STATES.READY_FOR_DISPATCH],
  [DISPATCH_STATES.READY_FOR_DISPATCH]: [DISPATCH_STATES.COMPLETED],
  [DISPATCH_STATES.COMPLETED]: []
};

// Valid state transitions for purchase orders
const PURCHASE_TRANSITIONS = {
  [PURCHASE_STATES.PENDING_GUARD_APPROVAL]: [PURCHASE_STATES.INSIDE_FACTORY_PENDING_EMPTY_WEIGHT_PURCHASE],
  [PURCHASE_STATES.INSIDE_FACTORY_PENDING_EMPTY_WEIGHT_PURCHASE]: [PURCHASE_STATES.INSIDE_FACTORY_PENDING_UNLOADING],
  [PURCHASE_STATES.INSIDE_FACTORY_PENDING_UNLOADING]: [PURCHASE_STATES.INSIDE_FACTORY_PENDING_FINAL_WEIGHT_PURCHASE],
  [PURCHASE_STATES.INSIDE_FACTORY_PENDING_FINAL_WEIGHT_PURCHASE]: [PURCHASE_STATES.READY_FOR_BILLING_PURCHASE],
  [PURCHASE_STATES.READY_FOR_BILLING_PURCHASE]: [PURCHASE_STATES.READY_FOR_EXIT_PURCHASE],
  [PURCHASE_STATES.READY_FOR_EXIT_PURCHASE]: [PURCHASE_STATES.COMPLETED],
  [PURCHASE_STATES.COMPLETED]: []
};

// Function to validate state transitions
const canTransition = (orderType, fromState, toState) => {
  const transitions = orderType === 'dispatch' ? DISPATCH_TRANSITIONS : PURCHASE_TRANSITIONS;
  
  if (!transitions[fromState]) {
    return false;
  }
  
  return transitions[fromState].includes(toState);
};

// Get initial state for order type
const getInitialState = (orderType) => {
  return orderType === 'dispatch' ? DISPATCH_STATES.PENDING_GUARD_APPROVAL : PURCHASE_STATES.PENDING_GUARD_APPROVAL;
};

// Get all valid states for order type
const getValidStates = (orderType) => {
  return orderType === 'dispatch' ? Object.values(DISPATCH_STATES) : Object.values(PURCHASE_STATES);
};

// Get next possible states from current state
const getNextStates = (orderType, currentState) => {
  const transitions = orderType === 'dispatch' ? DISPATCH_TRANSITIONS : PURCHASE_TRANSITIONS;
  return transitions[currentState] || [];
};

module.exports = {
  DISPATCH_STATES,
  PURCHASE_STATES,
  DISPATCH_TRANSITIONS,
  PURCHASE_TRANSITIONS,
  canTransition,
  getInitialState,
  getValidStates,
  getNextStates
};
