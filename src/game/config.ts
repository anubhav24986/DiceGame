import Phaser from 'phaser';
import { DiceScene } from './DiceScene';

export interface GameConfigOptions {
  parentId: string;
}

export function createGameConfig(opts: GameConfigOptions): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: opts.parentId,
    backgroundColor: '#0f172a',
    scene: [DiceScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    audio: {
      noAudio: true, // Web Audio API used directly in DiceScene
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  };
}
