import Phaser from 'phaser';
import { bus } from '../events/bus';
import {
  DIGIT_SHEET_KEY,
  DIGIT_CELL_W,
  DIGIT_CELL_H,
  buildDigitSheetDataURL,
  charToFrame,
} from '../assets/digitSheet';

// ---------------------------------------------------------------------------
// Procedural audio helpers (Web Audio API – no external files)
// ---------------------------------------------------------------------------

function beep(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  gain = 0.12,
): void {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type          = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLL_DURATION_MS = 2200;
const DICE_BASE_SIZE   = 160;
const DIGIT_MAX_SLOTS  = 3; // supports numbers up to 999

// ---------------------------------------------------------------------------
// DiceScene
// ---------------------------------------------------------------------------

export class DiceScene extends Phaser.Scene {
  // Graphics / display objects
  private bg!:          Phaser.GameObjects.Graphics;
  private decorRing!:   Phaser.GameObjects.Graphics;
  private shadowGfx!:   Phaser.GameObjects.Graphics;
  private diceGfx!:     Phaser.GameObjects.Graphics;
  private glowGfx!:     Phaser.GameObjects.Graphics;
  private labelText!:   Phaser.GameObjects.Text;
  private headerText!:  Phaser.GameObjects.Text;
  private container!:   Phaser.GameObjects.Container;

  // PNG digit sprites (replaces Text – colour via setTint, no CSS)
  private digitSprites:    Phaser.GameObjects.Image[] = [];
  private currentDigitStr = '?';

  // Runtime state
  private isRolling = false;
  private isMuted   = false;
  private volume    = 1;
  private audioCtx: AudioContext | null = null;
  private rollTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'DiceScene' });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Generate the digit PNG spritesheet via Canvas 2D and register it with
   * Phaser's loader.  White glyphs on a transparent background let setTint()
   * handle colour changes at runtime without any extra assets.
   */
  preload(): void {
    this.load.spritesheet(DIGIT_SHEET_KEY, buildDigitSheetDataURL(), {
      frameWidth:  DIGIT_CELL_W,
      frameHeight: DIGIT_CELL_H,
    });
  }

  create(): void {
    this.buildScene();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    // Subscribe to commands published by the React layer.
    const unsubs = [
      bus.on('roll:start',    ({ result }) => this.roll(result)),
      bus.on('result:show',   ({ isWin })  => this.showResult(isWin)),
      bus.on('audio:mute',    ({ muted })  => { this.isMuted = muted; }),
      bus.on('audio:volume',  ({ volume }) => { this.volume  = volume; }),
    ];

    // Clean up bus subscriptions when Phaser destroys the scene.
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      unsubs.forEach((off) => off());
    });

    // Notify the React layer that the scene is ready.
    bus.emit('scene:ready');
  }

  // ---------------------------------------------------------------------------
  // Scene construction
  // ---------------------------------------------------------------------------

  private buildScene(): void {
    const { width, height } = this.scale;

    this.bg = this.add.graphics();
    this.paintBackground(width, height);

    this.decorRing = this.add.graphics();
    this.paintRings(width, height);

    this.headerText = this.add
      .text(width / 2, 20, 'D I C E  R O L L', {
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        color: '#475569',
        letterSpacing: 4,
      })
      .setOrigin(0.5, 0);

    this.container = this.add.container(width / 2, height / 2);

    const s = this.diceSize();

    // Glow ring – painted behind the dice face
    this.glowGfx = this.add.graphics();
    this.container.add(this.glowGfx);

    // Drop shadow
    this.shadowGfx = this.add.graphics();
    this.shadowGfx.fillStyle(0x000000, 0.35);
    this.shadowGfx.fillRoundedRect(-s / 2 + 10, -s / 2 + 10, s, s, 22);
    this.container.add(this.shadowGfx);

    // Dice face
    this.diceGfx = this.add.graphics();
    this.paintDice(0x1e293b, 0xf8fafc);
    this.container.add(this.diceGfx);

    // Digit sprite slots – white PNG glyphs tinted at runtime
    for (let i = 0; i < DIGIT_MAX_SLOTS; i++) {
      const sprite = this.add
        .image(0, -4, DIGIT_SHEET_KEY, 0)
        .setOrigin(0.5, 0.5)
        .setTint(0x1e293b)
        .setVisible(false);
      this.digitSprites.push(sprite);
      this.container.add(sprite);
    }
    this.setDigits('?');

    // Label beneath the dice
    this.labelText = this.add
      .text(0, s / 2 + 28, 'PRESS ROLL', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#64748b',
      })
      .setOrigin(0.5, 0);
    this.container.add(this.labelText);
  }

  // ---------------------------------------------------------------------------
  // Digit display (PNG sprites, no CSS)
  // ---------------------------------------------------------------------------

  /** Scale that keeps all digits within the dice face in both dimensions. */
  private digitScale(numDigits: number): number {
    const s      = this.diceSize();
    const byH    = (s * 0.42) / DIGIT_CELL_H;
    const byW    = (s * 0.88) / (numDigits * DIGIT_CELL_W);
    return Math.min(byH, byW);
  }

  private setDigits(str: string): void {
    this.currentDigitStr = str;
    const scale  = this.digitScale(str.length);
    const cellW  = DIGIT_CELL_W * scale;
    const startX = -(str.length * cellW) / 2 + cellW / 2;

    this.digitSprites.forEach((sp) => sp.setVisible(false));

    for (let i = 0; i < str.length && i < DIGIT_MAX_SLOTS; i++) {
      this.digitSprites[i]
        .setFrame(charToFrame(str[i]))
        .setPosition(startX + i * cellW, -4)
        .setScale(scale)
        .setVisible(true);
    }
  }

  private setDigitTint(color: number): void {
    this.digitSprites.forEach((sp) => sp.setTint(color));
  }

  // ---------------------------------------------------------------------------
  // Paint helpers
  // ---------------------------------------------------------------------------

  private diceSize(): number {
    const shortest = Math.min(this.scale.width, this.scale.height);
    return Math.min(DICE_BASE_SIZE, shortest * 0.42);
  }

  private paintBackground(w: number, h: number): void {
    this.bg.clear();
    this.bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    this.bg.fillRect(0, 0, w, h);
  }

  private paintRings(w: number, h: number): void {
    this.decorRing.clear();
    this.decorRing.lineStyle(1, 0x334155, 0.3);
    [90, 155, 220, 290].forEach((r) => this.decorRing.strokeCircle(w / 2, h / 2, r));
  }

  private paintDice(borderColor: number, fillColor: number): void {
    this.diceGfx.clear();
    const s = this.diceSize();
    const r = 20;

    this.diceGfx.fillStyle(fillColor, 1);
    this.diceGfx.fillRoundedRect(-s / 2, -s / 2, s, s, r);

    // Top-left highlight strip
    this.diceGfx.fillStyle(0xffffff, 0.45);
    this.diceGfx.fillRoundedRect(-s / 2 + 5, -s / 2 + 5, s - 10, 10, {
      tl: r - 2, tr: r - 2, bl: 0, br: 0,
    });

    this.diceGfx.lineStyle(2, borderColor, 0.8);
    this.diceGfx.strokeRoundedRect(-s / 2, -s / 2, s, s, r);

    // Corner pips (decorative)
    this.diceGfx.fillStyle(0xdde1e7, 1);
    const pad = Math.round(s * 0.14);
    const pip = Math.max(3, Math.round(s * 0.04));
    [[-s / 2 + pad, -s / 2 + pad], [s / 2 - pad, -s / 2 + pad],
     [-s / 2 + pad,  s / 2 - pad], [s / 2 - pad,  s / 2 - pad]]
      .forEach(([cx, cy]) => this.diceGfx.fillCircle(cx, cy, pip));
  }

  private paintGlow(color: number, alpha: number): void {
    this.glowGfx.clear();
    const s = this.diceSize();
    for (let i = 5; i >= 1; i--) {
      this.glowGfx.fillStyle(color, alpha * (i / 5) * 0.25);
      const expand = i * 14;
      this.glowGfx.fillRoundedRect(
        -(s / 2 + expand), -(s / 2 + expand),
        s + expand * 2,     s + expand * 2,
        24 + expand / 2,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Commands (arrive via the event bus)
  // ---------------------------------------------------------------------------

  private roll(result: number): void {
    if (this.isRolling) return;
    this.isRolling = true;

    this.glowGfx.clear();
    this.paintDice(0x1e293b, 0xf8fafc);
    this.labelText.setText('ROLLING…').setColor('#64748b').setStyle({ fontStyle: 'normal' });
    this.setDigitTint(0x1e293b);

    this.initAudio();
    this.startRollAnimation(result);
  }

  private showResult(isWin: boolean): void {
    const color     = isWin ? 0x22c55e : 0xef4444;
    const textColor = isWin ? '#22c55e' : '#ef4444';
    const label     = isWin ? '✓  WIN'  : '✗  LOSE';

    this.paintGlow(color, 1);
    this.tweens.add({
      targets: this.glowGfx,
      alpha: { from: 1, to: 0.55 },
      duration: 700,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });

    this.labelText.setText(label).setColor(textColor).setStyle({ fontStyle: 'bold' });
    this.setDigitTint(color);

    this.spawnParticles(isWin, textColor);
    this.playResultSound(isWin);
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  private startRollAnimation(finalResult: number): void {
    let elapsed     = 0;
    let lastTick    = 0;
    let tickInterval = 38;

    this.tweens.add({
      targets: this.container,
      x: `+=${Phaser.Math.Between(-6, 6)}`,
      y: `+=${Phaser.Math.Between(-6, 6)}`,
      duration: 55,
      yoyo: true,
      repeat: 22,
      ease: 'Sine.easeInOut',
      onComplete: () =>
        this.container.setPosition(this.scale.width / 2, this.scale.height / 2),
    });

    this.tweens.add({
      targets: this.container,
      scaleX: { from: 1, to: 1.06 },
      scaleY: { from: 1, to: 0.96 },
      duration: 75,
      yoyo: true,
      repeat: 14,
      ease: 'Sine.easeInOut',
    });

    this.rollTimer = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        const progress = Math.min(elapsed / ROLL_DURATION_MS, 1);
        tickInterval   = 38 + Math.pow(progress, 2.5) * 280;

        if (elapsed - lastTick >= tickInterval) {
          lastTick = elapsed;

          if (progress < 0.8) {
            this.setDigits(String(Phaser.Math.Between(1, 100)));
          } else {
            const spread = Math.round((1 - progress) * 18);
            const lo     = Math.max(1,   finalResult - spread);
            const hi     = Math.min(100, finalResult + spread);
            this.setDigits(String(Phaser.Math.Between(lo, hi)));
          }

          this.playTickSound();
        }

        if (progress >= 1) {
          this.rollTimer?.remove();
          this.landOn(finalResult);
        }
      },
    });
  }

  private landOn(result: number): void {
    this.setDigits(String(result));

    this.tweens.add({
      targets: this.container,
      scaleX: 1.22,
      scaleY: 0.78,
      duration: 80,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.container,
          scaleX: 1,
          scaleY: 1,
          duration: 350,
          ease: 'Elastic.easeOut',
        });

        this.isRolling = false;
        bus.emit('roll:complete', { result, timestamp: Date.now() });
      },
    });

    this.playLandSound();
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------

  private spawnParticles(isWin: boolean, colorHex: string): void {
    const symbols = isWin ? ['★', '◆', '+', '●'] : ['✗', '·', '—'];
    const cx = this.container.x;
    const cy = this.container.y;

    for (let i = 0; i < 14; i++) {
      const x   = cx + Phaser.Math.Between(-70, 70);
      const sym = symbols[i % symbols.length];

      const p = this.add
        .text(x, cy, sym, { fontFamily: 'monospace', fontSize: '18px', color: colorHex })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(10);

      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-80, 80),
        y: cy + (isWin ? Phaser.Math.Between(-130, -50) : Phaser.Math.Between(50, 130)),
        alpha: { from: 1, to: 0 },
        scale: { from: 1.2, to: 0.2 },
        angle: Phaser.Math.Between(-90, 90),
        delay: i * 28,
        duration: 900,
        ease: 'Power2.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Audio
  // ---------------------------------------------------------------------------

  private initAudio(): void {
    if (this.audioCtx) return;
    try { this.audioCtx = new AudioContext(); } catch { /* silently skip */ }
  }

  private playTickSound(): void {
    if (this.isMuted || !this.audioCtx) return;
    beep(this.audioCtx, 440 + Phaser.Math.Between(-80, 80), 0.04, 'square', 0.06 * this.volume);
  }

  private playLandSound(): void {
    if (this.isMuted || !this.audioCtx) return;
    beep(this.audioCtx, 180, 0.12, 'sine', 0.2 * this.volume);
  }

  private playResultSound(isWin: boolean): void {
    if (this.isMuted || !this.audioCtx) return;
    const ctx = this.audioCtx;
    if (isWin) {
      [440, 554, 659, 880].forEach((f, i) =>
        setTimeout(() => beep(ctx, f, 0.25, 'triangle', 0.18 * this.volume), i * 90));
    } else {
      [330, 277, 220].forEach((f, i) =>
        setTimeout(() => beep(ctx, f, 0.3, 'sawtooth', 0.12 * this.volume), i * 100));
    }
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;

    this.paintBackground(width, height);
    this.paintRings(width, height);
    this.headerText.setPosition(width / 2, 20);
    this.container.setPosition(width / 2, height / 2);

    const s = this.diceSize();
    this.shadowGfx.clear();
    this.shadowGfx.fillStyle(0x000000, 0.35);
    this.shadowGfx.fillRoundedRect(-s / 2 + 10, -s / 2 + 10, s, s, 22);

    this.paintDice(0x1e293b, 0xf8fafc);
    this.setDigits(this.currentDigitStr); // re-scale sprites to new dice size
    this.labelText.setY(s / 2 + 28);
  }
}
