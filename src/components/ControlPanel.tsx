import { useEffect, useRef } from 'react';
import type { GameState } from '../hooks/useGameBridge';
import { RollHistory } from './RollHistory';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  state:        GameState;
  onSetTarget:  (value: number) => void;
  onRoll:       () => void;
  onToggleMute: () => void;
}

export function ControlPanel({ state, onSetTarget, onRoll, onToggleMute }: ControlPanelProps) {
  const rollBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard shortcut: Space / Enter
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (state.status !== 'ready' && state.status !== 'complete') return;
      e.preventDefault();
      onRoll();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state.status, onRoll]);

  const canRoll  = state.status === 'ready' || state.status === 'complete';
  const isLoading = state.status === 'loading';
  const isRolling = state.status === 'rolling';
  const isError   = state.status === 'error';

  return (
    <aside className={styles.panel} aria-label="Game controls">
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Dice Game</h1>
        <p className={styles.subtitle}>Roll under your target to win</p>
      </header>

      {/* Status badge */}
      <div
        className={`${styles.statusBadge} ${
          isLoading ? styles.badgeLoading :
          isError   ? styles.badgeError   :
          isRolling ? styles.badgeRolling :
                      styles.badgeReady
        }`}
        role="status"
        aria-live="polite"
      >
        {isLoading              && '⟳ Initialising'}
        {isError                && '⚠ Error'}
        {isRolling              && '🎲 Rolling…'}
        {state.status === 'ready'    && '● Ready'}
        {state.status === 'complete' && '● Done'}
      </div>

      {/* Target input */}
      <section className={styles.section}>
        <label htmlFor="target-input" className={styles.label}>
          Target number<span className={styles.hint}> (1 – 100)</span>
        </label>
        <div className={styles.targetRow}>
          <input
            id="target-input"
            type="number"
            min={1}
            max={100}
            value={state.target}
            disabled={isRolling || isLoading || isError}
            className={styles.input}
            onChange={(e) => onSetTarget(Number(e.target.value))}
            aria-label="Target number"
          />
          <input
            type="range"
            min={1}
            max={100}
            value={state.target}
            disabled={isRolling || isLoading || isError}
            className={styles.slider}
            onChange={(e) => onSetTarget(Number(e.target.value))}
            aria-label="Target slider"
          />
        </div>
        <p className={styles.targetHint}>
          Roll <strong>≤ {state.target}</strong> to win &nbsp;({state.target}% chance)
        </p>
      </section>

      {/* Roll button */}
      <section className={styles.section}>
        <button
          ref={rollBtnRef}
          className={`${styles.rollBtn} ${isRolling ? styles.rollBtnRolling : ''}`}
          disabled={!canRoll || isRolling}
          onClick={onRoll}
          aria-label={isRolling ? 'Rolling…' : 'Roll dice (Space / Enter)'}
        >
          {isRolling ? (
            <span className={styles.rollBtnInner}>
              <span className={styles.rollDot} />
              <span className={styles.rollDot} />
              <span className={styles.rollDot} />
            </span>
          ) : (
            '🎲 Roll'
          )}
        </button>
        <p className={styles.shortcutHint}>Space / Enter to roll</p>
      </section>

      {/* Result */}
      {state.status === 'complete' && state.result !== null && (
        <section
          className={`${styles.result} ${state.isWin ? styles.resultWin : styles.resultLose}`}
          role="alert"
          aria-live="assertive"
        >
          <div className={styles.resultScore}>
            <span className={styles.resultNumber}>{state.result}</span>
            <span className={styles.resultVs}>
              {state.isWin ? '≤' : '>'} {state.pendingTarget ?? state.target}
            </span>
          </div>
          <div className={styles.resultLabel}>
            {state.isWin ? '✓ You Win!' : '✗ You Lose'}
          </div>
        </section>
      )}

      {/* Streaks */}
      {(state.winStreak > 1 || state.lossStreak > 1) && (
        <div className={styles.streaks}>
          {state.winStreak  > 1 && <span className={styles.streakWin}>🔥 {state.winStreak}  win streak</span>}
          {state.lossStreak > 1 && <span className={styles.streakLose}>💀 {state.lossStreak} loss streak</span>}
        </div>
      )}

      {/* Error */}
      {isError && state.errorMessage && (
        <div className={styles.errorBox} role="alert">{state.errorMessage}</div>
      )}

      {/* Roll history */}
      {state.history.length > 0 && (
        <div className={styles.historyWrapper}>
          <RollHistory history={state.history} />
        </div>
      )}

      {/* Mute toggle */}
      <footer className={styles.footer}>
        <button
          className={styles.muteBtn}
          onClick={onToggleMute}
          aria-pressed={state.isMuted}
          aria-label={state.isMuted ? 'Unmute sound' : 'Mute sound'}
          title={state.isMuted ? 'Unmute' : 'Mute'}
        >
          {state.isMuted ? '🔇 Muted' : '🔊 Sound on'}
        </button>
      </footer>
    </aside>
  );
}
