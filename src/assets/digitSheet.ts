// ---------------------------------------------------------------------------
// Digit spritesheet – generated as a PNG at runtime via the Canvas 2D API.
//
// Frame layout (left → right):
//   0  : '?' (idle / loading state)
//   1  : '0'
//   2  : '1'
//   …
//   10 : '9'
//
// White glyphs on a transparent background let Phaser's setTint() recolour
// them at runtime (dark default, green win, red lose) with no extra assets.
// ---------------------------------------------------------------------------

export const DIGIT_SHEET_KEY  = 'dice-digits' as const;
export const DIGIT_CELL_W     = 54;
export const DIGIT_CELL_H     = 80;

const CHARS = '?0123456789'; // 11 frames

/**
 * Draws every glyph onto an off-screen canvas and returns the result as a
 * `image/png` data URL.  Phaser's loader accepts data URLs the same way it
 * accepts HTTP URLs, so this integrates directly with `this.load.spritesheet`.
 */
export function buildDigitSheetDataURL(): string {
  const canvas = document.createElement('canvas');
  canvas.width  = DIGIT_CELL_W * CHARS.length;
  canvas.height = DIGIT_CELL_H;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold 62px "Courier New", monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  CHARS.split('').forEach((ch, i) => {
    ctx.fillText(ch, DIGIT_CELL_W * i + DIGIT_CELL_W / 2, DIGIT_CELL_H / 2);
  });

  return canvas.toDataURL('image/png');
}

/** Map a character to its spritesheet frame index. */
export function charToFrame(ch: string): number {
  if (ch === '?') return 0;
  const digit = parseInt(ch, 10);
  return isNaN(digit) ? 0 : digit + 1;
}
