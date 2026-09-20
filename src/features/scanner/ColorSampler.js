/**
 * CubeStudio V2 — Phase 7A
 * ColorSampler: Multi-pixel color sampling for each sticker cell.
 *
 * For each cell, samples a square block of pixels centered on (cx, cy)
 * with side length 2*sampleRadius+1, averaging the RGB values.
 * This smooths out noise and reduces sensitivity to individual pixels.
 *
 * PURE FUNCTION — no side effects, no I/O.
 */

import { clamp } from './GridDetector.js';

/**
 * @typedef {Object} SampledColor
 * @property {number} r  - red channel [0, 255]
 * @property {number} g  - green channel [0, 255]
 * @property {number} b  - blue channel [0, 255]
 * @property {number} pixelCount - number of pixels averaged
 */

/**
 * Sample the average color for each of the 9 cells.
 *
 * @param {Uint8ClampedArray} pixels - RGBA pixel data
 * @param {number} frameWidth        - width of the frame in pixels
 * @param {number} frameHeight       - height of the frame in pixels
 * @param {import('./GridDetector.js').CellDescriptor[]} cells - 9 cell descriptors
 * @returns {SampledColor[]} array of 9 sampled colors, in the same order as cells
 */
export function sampleCells(pixels, frameWidth, frameHeight, cells) {
  return cells.map(cell => sampleCell(pixels, frameWidth, frameHeight, cell));
}

/**
 * Sample the average color for a single cell.
 *
 * @param {Uint8ClampedArray} pixels
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @param {import('./GridDetector.js').CellDescriptor} cell
 * @returns {SampledColor}
 */
export function sampleCell(pixels, frameWidth, frameHeight, cell) {
  const { cx, cy, sampleRadius } = cell;
  const r = Math.max(1, sampleRadius);

  let sumR = 0, sumG = 0, sumB = 0, count = 0;

  const xMin = clamp(cx - r, 0, frameWidth - 1);
  const xMax = clamp(cx + r, 0, frameWidth - 1);
  const yMin = clamp(cy - r, 0, frameHeight - 1);
  const yMax = clamp(cy + r, 0, frameHeight - 1);

  for (let py = yMin; py <= yMax; py++) {
    for (let px = xMin; px <= xMax; px++) {
      const idx = (py * frameWidth + px) * 4;
      sumR += pixels[idx];
      sumG += pixels[idx + 1];
      sumB += pixels[idx + 2];
      count++;
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0, pixelCount: 0 };

  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count),
    pixelCount: count
  };
}
