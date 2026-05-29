import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { bus } from '../events/bus';
import { createGameConfig } from '../game/config';
import styles from './DiceGame.module.css';

const PARENT_ID = 'phaser-canvas-host';

type MountState = 'loading' | 'ready' | 'error';

/** Mounts the Phaser canvas and wires scene lifecycle to the event bus. */
export function DiceGame() {
  const gameRef                  = useRef<Phaser.Game | null>(null);
  const [mountState, setMount]   = useState<MountState>('loading');
  const [errorMsg,   setErrorMsg] = useState('');

  useEffect(() => {
    const offReady = bus.on('scene:ready', () => setMount('ready'));
    const offError = bus.on('scene:error', ({ message }) => {
      setMount('error');
      setErrorMsg(message);
    });

    try {
      gameRef.current = new Phaser.Game(createGameConfig({ parentId: PARENT_ID }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMount('error');
      setErrorMsg(`Failed to start game: ${message}`);
      bus.emit('scene:error', { message });
    }

    return () => {
      offReady();
      offError();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div id={PARENT_ID} className={styles.canvas} />

      {mountState === 'loading' && (
        <div className={styles.overlay}>
          <div className={styles.spinner} aria-label="Loading game…" />
          <p className={styles.overlayText}>Loading…</p>
        </div>
      )}

      {mountState === 'error' && (
        <div className={`${styles.overlay} ${styles.errorOverlay}`}>
          <span className={styles.errorIcon}>⚠</span>
          <p className={styles.overlayText}>{errorMsg || 'Game failed to load.'}</p>
        </div>
      )}
    </div>
  );
}
