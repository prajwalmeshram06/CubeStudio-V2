import { describe, it, expect } from 'vitest';
import { buildGrid, clamp } from '../../../src/features/scanner/GridDetector.js';

describe('GridDetector', () => {
  describe('clamp', () => {
    it('clamps values below min and above max', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(7, 0, 10)).toBe(7);
    });
  });

  describe('buildGrid', () => {
    it('produces exactly 9 cells for a detected region', () => {
      const region = { x: 30, y: 30, w: 90, h: 90 };
      const cells = buildGrid(region);

      expect(cells).toHaveLength(9);
    });

    it('generates correct row/column indices in row-major order', () => {
      const region = { x: 0, y: 0, w: 300, h: 300 };
      const cells = buildGrid(region);

      // Top row (row 0)
      expect(cells[0]).toMatchObject({ row: 0, col: 0, index: 0 });
      expect(cells[1]).toMatchObject({ row: 0, col: 1, index: 1 });
      expect(cells[2]).toMatchObject({ row: 0, col: 2, index: 2 });

      // Middle row (row 1)
      expect(cells[3]).toMatchObject({ row: 1, col: 0, index: 3 });
      expect(cells[4]).toMatchObject({ row: 1, col: 1, index: 4 }); // Center facelet
      expect(cells[5]).toMatchObject({ row: 1, col: 2, index: 5 });

      // Bottom row (row 2)
      expect(cells[6]).toMatchObject({ row: 2, col: 0, index: 6 });
      expect(cells[7]).toMatchObject({ row: 2, col: 1, index: 7 });
      expect(cells[8]).toMatchObject({ row: 2, col: 2, index: 8 });
    });

    it('computes correct center coordinates and sampling radii inside the region', () => {
      const region = { x: 100, y: 100, w: 300, h: 300 };
      const cells = buildGrid(region);

      // Center of facelet [0,0] should be around (150, 150)
      expect(cells[0].cx).toBe(150);
      expect(cells[0].cy).toBe(150);

      // Center of facelet [1,1] (center of cube face) should be (250, 250)
      expect(cells[4].cx).toBe(250);
      expect(cells[4].cy).toBe(250);

      // Sample radius stays within each 100x100 cell
      expect(cells[0].sampleRadius).toBeGreaterThan(0);
      expect(cells[0].sampleRadius).toBeLessThan(50);
    });
  });
});
