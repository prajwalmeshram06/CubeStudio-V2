/**
 * CubeStudio V2 — Phase 7A
 * ColorClassifier: HSL-based classification of a sampled RGB color into one of the
 * six standard Rubik's Cube sticker colors.
 *
 * Standard WCA cube colors: White, Yellow, Red, Orange, Blue, Green.
 *
 * Approach:
 *  - Convert RGB → HSL
 *  - Apply hue-range rules first (colored stickers)
 *  - Distinguish white vs. yellow by hue + saturation + lightness
 *  - Return { color, confidence } where confidence ∈ [0, 1]
 *
 * PURE FUNCTION — no side effects, no I/O.
 */

/**
 * The six canonical cube face colors.
 * @enum {string}
 */
export const CUBE_COLOR = {
  WHITE:  'white',
  YELLOW: 'yellow',
  RED:    'red',
  ORANGE: 'orange',
  BLUE:   'blue',
  GREEN:  'green'
};

/**
 * A display-friendly hex color for each cube color, used in the review UI.
 * @type {Record<string, string>}
 */
export const CUBE_COLOR_HEX = {
  [CUBE_COLOR.WHITE]:  '#ffffff',
  [CUBE_COLOR.YELLOW]: '#ffe000',
  [CUBE_COLOR.RED]:    '#c41e3a',
  [CUBE_COLOR.ORANGE]: '#ff6700',
  [CUBE_COLOR.BLUE]:   '#0051a2',
  [CUBE_COLOR.GREEN]:  '#009b48'
};

/**
 * @typedef {Object} ClassifiedColor
 * @property {string} color       - one of CUBE_COLOR values
 * @property {number} confidence  - classification confidence ∈ [0, 1]
 * @property {number} hue         - hue in degrees [0, 360)
 * @property {number} saturation  - saturation [0, 1]
 * @property {number} lightness   - lightness [0, 1]
 */

/**
 * Classify an RGB color into one of the six cube colors.
 *
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {ClassifiedColor}
 */
export function classifyColor(rgb) {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  let color;
  let confidence;

  // ── Low-saturation region → White ──────────────────────────────────────
  if (s < 0.18) {
    if (l > 0.70) {
      color = CUBE_COLOR.WHITE;
      confidence = Math.min(1, (l - 0.70) / 0.30 * 0.8 + 0.2);
    } else {
      // Dark grey — treat as low-confidence white (could be shadow)
      color = CUBE_COLOR.WHITE;
      confidence = 0.25;
    }
    return { color, confidence, hue: h, saturation: s, lightness: l };
  }

  // ── Hue-based classification ────────────────────────────────────────────
  // Hue wheel: 0/360=red, 30=orange, 60=yellow, 120=green, 240=blue, 300=purple

  if ((h >= 0 && h < 18) || h >= 345) {
    // Red
    color = CUBE_COLOR.RED;
    const dist = Math.min(h, 360 - h);
    confidence = Math.min(1, s * (1 - Math.abs(dist) / 18));
  } else if (h >= 18 && h < 45) {
    // Orange
    color = CUBE_COLOR.ORANGE;
    const center = 30;
    confidence = Math.min(1, s * (1 - Math.abs(h - center) / 15));
  } else if (h >= 45 && h < 80) {
    // Yellow
    color = CUBE_COLOR.YELLOW;
    const center = 60;
    confidence = Math.min(1, s * (1 - Math.abs(h - center) / 20));
  } else if (h >= 80 && h < 165) {
    // Green
    color = CUBE_COLOR.GREEN;
    const center = 120;
    confidence = Math.min(1, s * (1 - Math.abs(h - center) / 45));
  } else if (h >= 165 && h < 270) {
    // Blue (includes cyan-blue range for WCA-style cubes)
    color = CUBE_COLOR.BLUE;
    const center = 220;
    confidence = Math.min(1, s * (1 - Math.abs(h - center) / 55));
  } else {
    // Purple/magenta → treat as red (some red stickers have slight purple shift)
    color = CUBE_COLOR.RED;
    confidence = 0.3;
  }

  // White override: even if saturation > 0.18, very high lightness → white
  if (l > 0.85 && s < 0.35) {
    color = CUBE_COLOR.WHITE;
    confidence = Math.min(1, l * 0.9);
  }

  return { color, confidence: Math.max(0, Math.min(1, confidence)), hue: h, saturation: s, lightness: l };
}

/**
 * Classify all 9 cells and return the array of classified colors.
 *
 * @param {{ r: number, g: number, b: number }[]} sampledColors - 9 sampled RGB values
 * @returns {ClassifiedColor[]}
 */
export function classifyCells(sampledColors) {
  return sampledColors.map(rgb => classifyColor(rgb));
}

/**
 * Convert RGB to HSL.
 * @param {number} r - [0, 255]
 * @param {number} g - [0, 255]
 * @param {number} b - [0, 255]
 * @returns {{ h: number, s: number, l: number }} h in [0, 360), s/l in [0, 1]
 */
export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  const l = (max + min) / 2;

  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }

  if (h < 0) h += 360;

  return { h, s, l };
}
