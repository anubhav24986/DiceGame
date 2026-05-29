import type { GameEvents } from './types';

// Conditional helper: events typed as `void` get a zero-argument handler.
type Handler<T> = T extends void ? () => void : (payload: T) => void;

/**
 * Lightweight, fully-typed pub/sub event bus.
 *
 * Neither React nor Phaser imports the other – they communicate exclusively
 * through this intermediary.  Every subscription returns an `unsubscribe`
 * function so callers clean up in their own teardown (useEffect return,
 * scene DESTROY event, etc.).
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    const fn = handler as (...args: unknown[]) => void;
    set.add(fn);
    return () => set.delete(fn);
  }

  /**
   * Publish an event to all current subscribers.
   * TypeScript enforces the payload type via rest-parameter conditional types.
   */
  emit<K extends keyof GameEvents>(
    ...args: GameEvents[K] extends void ? [event: K] : [event: K, payload: GameEvents[K]]
  ): void {
    const [event, payload] = args as [K, GameEvents[K]];
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }

  /** Remove all listeners – useful for test isolation and full teardown. */
  reset(): void {
    this.listeners.clear();
  }
}

/** Module-level singleton shared by all layers of the application. */
export const bus = new EventBus();
