/**
 * RollHistory.tsx
 *
 * Bonus component: displays a scrollable list of previous rolls.
 */

import type { HistoryEntry } from '../types/game';
import styles from './RollHistory.module.css';

interface RollHistoryProps {
  history: HistoryEntry[];
}

export function RollHistory({ history }: RollHistoryProps) {
  if (history.length === 0) return null;

  const wins  = history.filter((e) => e.isWin).length;
  const total = history.length;
  const pct   = Math.round((wins / total) * 100);

  return (
    <section className={styles.container} aria-label="Roll history">
      <header className={styles.header}>
        <span className={styles.title}>History</span>
        <span className={styles.summary}>
          {wins}/{total} wins &nbsp;·&nbsp; {pct}% win rate
        </span>
      </header>

      <ul className={styles.list} role="list">
        {history.map((entry, i) => (
          <li
            key={entry.id}
            className={`${styles.entry} ${
              entry.isWin ? styles.entryWin : styles.entryLose
            }`}
          >
            <span className={styles.index}>#{total - i}</span>
            <span className={styles.result}>{entry.result}</span>
            <span className={styles.vs}>
              {entry.isWin ? '≤' : '>'} {entry.target}
            </span>
            <span className={styles.badge}>
              {entry.isWin ? 'W' : 'L'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
