import { describe, it, expect } from 'vitest';
import { sampleCell, sampleCells } from '../../../src/features/scanner/ColorSampler.js';

describe('ColorSampler', () => {
  it('samples a uniform color correctly across a region', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Fill with solid red [200, 50, 50, 255]
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4] = 200;
      pixels[i * 4 + 1] = 50;
      pixels[i * 4 + 2] = 50;
      pixels[i * 4 + 3] = 255;
    }

    const cell = { cx: 5, cy: 5, sampleRadius: 2, row: 1, col: 1, index: 4 };
    const sampled = sampleCell(pixels, width, height, cell);

    expect(sampled.r).toBe(200);
    expect(sampled.g).toBe(50);
    expect(sampled.b).toBe(50);
    expect(sampled.pixelCount).toBe(25); // 5x5 region centered at (5,5)
  });

  it('safely handles frame boundaries without out-of-bounds access', () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Top-left pixel is blue [0, 0, 255, 255]
    pixels[0] = 0;
    pixels[1] = 0;
    pixels[2] = 255;
    pixels[3] = 255;

    // Corner cell at (0, 0)
    const cell = { cx: 0, cy: 0, sampleRadius: 2, row: 0, col: 0, index: 0 };
    const sampled = sampleCell(pixels, width, height, cell);

    expect(sampled.pixelCount).toBeGreaterThan(0);
    expect(sampled.r).toBeDefined();
    expect(sampled.g).toBeDefined();
    expect(sampled.b).toBeDefined();
  });

  it('samples all 9 cells in order', () => {
    const width = 30;
    const height = 30;
    const pixels = new Uint8ClampedArray(width * height * 4);

    const cells = [
      { cx: 5, cy: 5, sampleRadius: 2, row: 0, col: 0, index: 0 },
      { cx: 15, cy: 5, sampleRadius: 2, row: 0, col: 1, index: 1 },
      { cx: 25, cy: 5, sampleRadius: 2, row: 0, col: 2, index: 2 },
      { cx: 5, cy: 15, sampleRadius: 2, row: 1, col: 0, index: 3 },
      { cx: 15, cy: 15, sampleRadius: 2, row: 1, col: 1, index: 4 },
      { cx: 25, cy: 15, sampleRadius: 2, row: 1, col: 2, index: 5 },
      { cx: 5, cy: 25, sampleRadius: 2, row: 2, col: 0, index: 6 },
      { cx: 15, cy: 25, sampleRadius: 2, row: 2, col: 1, index: 7 },
      { cx: 25, cy: 25, sampleRadius: 2, row: 2, col: 2, index: 8 }
    ];

    const results = sampleCells(pixels, width, height, cells);
    expect(results).toHaveLength(9);
    results.forEach((sample) => {
      expect(sample.pixelCount).toBeGreaterThan(0);
    });
  });
});
