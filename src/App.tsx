import { DiceGame } from './components/DiceGame';
import { ControlPanel } from './components/ControlPanel';
import { useGameBridge } from './hooks/useGameBridge';
import styles from './App.module.css';

export default function App() {
  const { state, actions } = useGameBridge();

  return (
    <div className={styles.layout}>
      <main className={styles.canvasArea}>
        <DiceGame />
      </main>

      <ControlPanel
        state={state}
        onSetTarget={actions.setTarget}
        onRoll={actions.roll}
        onToggleMute={actions.toggleMute}
      />
    </div>
  );
}
