// ---------------------------------------------------------------------------
// Typed event map shared by both the React and Phaser layers.
//
// Convention:
//   'scene:*'  – emitted by Phaser, consumed by React
//   'roll:*'   – crossing both directions
//   'result:*' – React → Phaser
//   'audio:*'  – React → Phaser
// ---------------------------------------------------------------------------

export type GameEvents = {
  // ── Phaser → React ────────────────────────────────────────────────────────
  /** Scene finished create(); safe to send commands. */
  'scene:ready': void;
  /** Unrecoverable Phaser error. */
  'scene:error': { message: string };
  /** Dice animation finished; carries the final rolled value. */
  'roll:complete': { result: number; timestamp: number };

  // ── React → Phaser ────────────────────────────────────────────────────────
  /** Start the dice-roll animation to the given result. */
  'roll:start': { result: number };
  /** Apply win/lose visual after roll:complete. */
  'result:show': { isWin: boolean };
  /** Toggle audio mute state. */
  'audio:mute': { muted: boolean };
  /** Set audio volume 0–1. */
  'audio:volume': { volume: number };
};
