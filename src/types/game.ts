// ---------------------------------------------------------------------------
// Shared domain types used by the React layer.
// Phaser-side communication is handled exclusively through the event bus
// (src/events/bus.ts) – there are no bridge interfaces here.
// ---------------------------------------------------------------------------

export type GameStatus = 'loading' | 'ready' | 'rolling' | 'complete' | 'error';

export interface HistoryEntry {
  id: number;
  result: number;
  target: number;
  isWin: boolean;
  timestamp: number;
}
