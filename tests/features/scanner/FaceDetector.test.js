import { describe, it, expect } from 'vitest';
import {
  detectFace,
  computeAverageBrightness,
  MIN_DETECTION_CONFIDENCE
} from '../../../src/features/scanner/FaceDetector.js';

describe('FaceDetector', () => {
  describe('computeAverageBrightness', () => {
    it('returns 0 for empty or invalid inputs', () => {
      expect(computeAverageBrightness(null, 0, 0)).toBe(0);
      expect(computeAverageBrightness(new Uint8ClampedArray(0), 0, 0)).toBe(0);
    });

    it('calculates average brightness for white image', () => {
      const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255);
      const avg = computeAverageBrightness(pixels, 4, 4);
      expect(avg).toBeCloseTo(255, 0);
    });

    it('calculates average brightness for black image', () => {
      const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(0);
      const avg = computeAverageBrightness(pixels, 4, 4);
      expect(avg).toBe(0);
    });
  });

  describe('detectFace', () => {
    it('returns null for invalid or empty input', () => {
      expect(detectFace(null, 0, 0)).toBeNull();
      expect(detectFace(new Uint8ClampedArray(0), 10, 10)).toBeNull();
      expect(detectFace(new Uint8ClampedArray(100), 0, 0)).toBeNull();
    });

    it('falls back to center crop when uniform image provides no contrast edges', () => {
      const w = 100;
      const h = 100;
      const pixels = new Uint8ClampedArray(w * h * 4).fill(128);

      const result = detectFace(pixels, w, h);
      expect(result).toBeDefined();
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.w).toBeGreaterThan(0);
      expect(result.h).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(MIN_DETECTION_CONFIDENCE);
    });

    it('detects a high-contrast square region with elevated confidence', () => {
      const w = 100;
      const h = 100;
      const pixels = new Uint8ClampedArray(w * h * 4);

      // Create a background of 0, and a 40x40 square with alternating black/white stripes in the middle (x:30..70, y:30..70)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          if (x >= 30 && x < 70 && y >= 30 && y < 70) {
            const val = (x + y) % 2 === 0 ? 255 : 0;
            pixels[idx] = val;
            pixels[idx + 1] = val;
            pixels[idx + 2] = val;
            pixels[idx + 3] = 255;
          } else {
            pixels[idx] = 128;
            pixels[idx + 1] = 128;
            pixels[idx + 2] = 128;
            pixels[idx + 3] = 255;
          }
        }
      }

      const result = detectFace(pixels, w, h);
      expect(result).toBeDefined();
      expect(result.w).toBeGreaterThan(0);
      expect(result.h).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });
});
