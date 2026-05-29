import { useCallback, useEffect, useReducer, useRef } from 'react';
import { bus } from '../events/bus';
import type { GameStatus, HistoryEntry } from '../types/game';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface GameState {
  status:       GameStatus;
  target:       number;
  /** Target snapshotted when roll() is called; prevents stale-closure bugs. */
  pendingTarget: number | null;
  result:       number | null;
  isWin:        boolean | null;
  isMuted:      boolean;
  history:      HistoryEntry[];
  winStreak:    number;
  lossStreak:   number;
  errorMessage: string | null;
}

const initialState: GameState = {
  status:        'loading',
  target:        50,
  pendingTarget: null,
  result:        null,
  isWin:         null,
  isMuted:       false,
  history:       [],
  winStreak:     0,
  lossStreak:    0,
  errorMessage:  null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: 'GAME_READY' }
  | { type: 'GAME_ERROR';    message: string }
  | { type: 'SET_TARGET';    value: number }
  | { type: 'ROLL_START';    target: number }
  | { type: 'ROLL_COMPLETE'; result: number }
  | { type: 'TOGGLE_MUTE' };

function reducer(state: GameState, action: Action): GameState {

  switch (action.type) {
    case 'GAME_READY':
      return { ...state, status: 'ready' };

    case 'GAME_ERROR':
      return { ...state, status: 'error', errorMessage: action.message };

    case 'SET_TARGET':
      return { ...state, target: action.value };

    case 'ROLL_START':
      return { ...state, status: 'rolling', pendingTarget: action.target, result: null, isWin: null };

    case 'ROLL_COMPLETE': {
      const lockedTarget = state.pendingTarget ?? state.target;
      const isWin        = action.result <= lockedTarget;
      const entry: HistoryEntry = {
        id:        Date.now(),
        result:    action.result,
        target:    lockedTarget,
        isWin,
        timestamp: Date.now(),
      };
      return {
        ...state,
        status:       'complete',
        result:       action.result,
        isWin,
        pendingTarget: null,
        winStreak:    isWin ? state.winStreak + 1 : 0,
        lossStreak:   isWin ? 0 : state.lossStreak + 1,
        history:      [entry, ...state.history].slice(0, 20),
      };
    }

    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseGameBridgeReturn {
  state: GameState;
  actions: {
    setTarget:   (value: number) => void;
    roll:        () => void;
    toggleMute:  () => void;
  };
}

export function useGameBridge(): UseGameBridgeReturn {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Stable mutable ref so bus callbacks always see the latest state.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Subscribe to Phaser events.  Each subscription is cleaned up when the
  // component that owns this hook unmounts.
  useEffect(() => {
    const unsubs = [
      bus.on('scene:ready', () => dispatch({ type: 'GAME_READY' })),

      bus.on('scene:error', ({ message }) =>
        dispatch({ type: 'GAME_ERROR', message })),

      bus.on('roll:complete', ({ result }) => {
        dispatch({ type: 'ROLL_COMPLETE', result });

        // Publish the win/lose visual command immediately using the target
        // that was locked in at roll time (still in the ref at this point).
        const lockedTarget = stateRef.current.pendingTarget ?? stateRef.current.target;
        bus.emit('result:show', { isWin: result <= lockedTarget });
      }),
    ];

    return () => unsubs.forEach((off) => off());
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const setTarget = useCallback((value: number) => {
    dispatch({ type: 'SET_TARGET', value: Math.max(1, Math.min(100, Math.round(value))) });
  }, []);

  const roll = useCallback(() => {
    if (stateRef.current.status === 'rolling') return;
    const result = Math.floor(Math.random() * 100) + 1;
    dispatch({ type: 'ROLL_START', target: stateRef.current.target });
    bus.emit('roll:start', { result });
  }, []);

  const toggleMute = useCallback(() => {
    const next = !stateRef.current.isMuted;
    dispatch({ type: 'TOGGLE_MUTE' });
    bus.emit('audio:mute', { muted: next });
  }, []);

  return { state, actions: { setTarget, roll, toggleMute } };
}
