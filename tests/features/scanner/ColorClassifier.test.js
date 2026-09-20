import { describe, it, expect } from 'vitest';
import {
  classifyColor,
  classifyCells,
  rgbToHsl,
  CUBE_COLOR
} from '../../../src/features/scanner/ColorClassifier.js';

describe('ColorClassifier', () => {
  describe('rgbToHsl', () => {
    it('correctly converts primary red', () => {
      const { h, s, l } = rgbToHsl(255, 0, 0);
      expect(h).toBe(0);
      expect(s).toBe(1);
      expect(l).toBe(0.5);
    });

    it('correctly converts pure white', () => {
      const { s, l } = rgbToHsl(255, 255, 255);
      expect(s).toBe(0);
      expect(l).toBe(1);
    });

    it('correctly converts pure black', () => {
      const { s, l } = rgbToHsl(0, 0, 0);
      expect(s).toBe(0);
      expect(l).toBe(0);
    });

    it('correctly converts green', () => {
      const { h } = rgbToHsl(0, 255, 0);
      expect(h).toBe(120);
    });

    it('correctly converts blue', () => {
      const { h } = rgbToHsl(0, 0, 255);
      expect(h).toBe(240);
    });
  });

  describe('classifyColor', () => {
    it('classifies pure white accurately', () => {
      const res = classifyColor({ r: 245, g: 245, b: 245 });
      expect(res.color).toBe(CUBE_COLOR.WHITE);
      expect(res.confidence).toBeGreaterThan(0.5);
    });

    it('classifies representative Rubik yellow accurately', () => {
      const res = classifyColor({ r: 255, g: 220, b: 0 });
      expect(res.color).toBe(CUBE_COLOR.YELLOW);
      expect(res.confidence).toBeGreaterThan(0.5);
    });

    it('classifies representative Rubik red accurately', () => {
      const res = classifyColor({ r: 200, g: 20, b: 30 });
      expect(res.color).toBe(CUBE_COLOR.RED);
      expect(res.confidence).toBeGreaterThan(0.5);
    });

    it('classifies representative Rubik orange accurately', () => {
      const res = classifyColor({ r: 255, g: 110, b: 10 });
      expect(res.color).toBe(CUBE_COLOR.ORANGE);
      expect(res.confidence).toBeGreaterThan(0.5);
    });

    it('classifies representative Rubik blue accurately', () => {
      const res = classifyColor({ r: 0, g: 80, b: 200 });
      expect(res.color).toBe(CUBE_COLOR.BLUE);
      expect(res.confidence).toBeGreaterThan(0.5);
    });

    it('classifies representative Rubik green accurately', () => {
      const res = classifyColor({ r: 10, g: 170, b: 60 });
      expect(res.color).toBe(CUBE_COLOR.GREEN);
      expect(res.confidence).toBeGreaterThan(0.5);
    });

    it('handles ambiguous / dark grey inputs safely', () => {
      const res = classifyColor({ r: 50, g: 50, b: 50 });
      expect(res).toBeDefined();
      expect(res.color).toBeDefined();
      expect(res.confidence).toBeLessThan(0.5);
    });
  });

  describe('classifyCells', () => {
    it('classifies an array of 9 sampled colors', () => {
      const input = [
        { r: 255, g: 255, b: 255 }, // White
        { r: 255, g: 220, b: 0 },   // Yellow
        { r: 200, g: 20, b: 30 },   // Red
        { r: 255, g: 110, b: 10 },  // Orange
        { r: 0, g: 80, b: 200 },    // Blue
        { r: 10, g: 170, b: 60 },   // Green
        { r: 255, g: 255, b: 255 }, // White
        { r: 255, g: 220, b: 0 },   // Yellow
        { r: 0, g: 80, b: 200 }     // Blue
      ];

      const results = classifyCells(input);
      expect(results).toHaveLength(9);
      expect(results[0].color).toBe(CUBE_COLOR.WHITE);
      expect(results[1].color).toBe(CUBE_COLOR.YELLOW);
      expect(results[2].color).toBe(CUBE_COLOR.RED);
      expect(results[3].color).toBe(CUBE_COLOR.ORANGE);
      expect(results[4].color).toBe(CUBE_COLOR.BLUE);
      expect(results[5].color).toBe(CUBE_COLOR.GREEN);
    });
  });
});
