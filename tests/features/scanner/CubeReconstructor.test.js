import { describe, it, expect } from 'vitest';
import {
  reconstructCube,
  normalizeStickerColor,
  diagnoseValidationFailure
} from '../../../src/features/scanner/CubeReconstructor.js';
import { CubeState } from '../../../src/cube/model/CubeState.js';
import { applyAlgorithm } from '../../../src/cube/engine/applyMove.js';
import { SOLVED_FACELET_STRING, FACES, FACE_COLORS } from '../../../src/cube/model/constants.js';

describe('CubeReconstructor', () => {
  describe('normalizeStickerColor', () => {
    it('normalizes color names to canonical face letters', () => {
      expect(normalizeStickerColor('white')).toBe('U');
      expect(normalizeStickerColor('red')).toBe('R');
      expect(normalizeStickerColor('green')).toBe('F');
      expect(normalizeStickerColor('yellow')).toBe('D');
      expect(normalizeStickerColor('orange')).toBe('L');
      expect(normalizeStickerColor('blue')).toBe('B');
    });

    it('normalizes object payloads with color property', () => {
      expect(normalizeStickerColor({ color: 'white' })).toBe('U');
      expect(normalizeStickerColor({ color: 'green', confidence: 0.95 })).toBe('F');
    });

    it('handles uppercase face letters directly', () => {
      expect(normalizeStickerColor('U')).toBe('U');
      expect(normalizeStickerColor('R')).toBe('R');
    });

    it('throws on unknown colors', () => {
      expect(() => normalizeStickerColor('purple')).toThrow();
      expect(() => normalizeStickerColor('')).toThrow();
      expect(() => normalizeStickerColor(null)).toThrow();
    });
  });

  describe('reconstructCube - Solved State', () => {
    it('reconstructs an exact solved CubeState from 6 solved face captures', () => {
      const solvedScans = {
        U: Array(9).fill({ color: 'white', confidence: 0.95 }),
        R: Array(9).fill({ color: 'red', confidence: 0.95 }),
        F: Array(9).fill({ color: 'green', confidence: 0.95 }),
        D: Array(9).fill({ color: 'yellow', confidence: 0.95 }),
        L: Array(9).fill({ color: 'orange', confidence: 0.95 }),
        B: Array(9).fill({ color: 'blue', confidence: 0.95 })
      };

      const result = reconstructCube(solvedScans);
      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(true);
      expect(result.cubeState).toBeInstanceOf(CubeState);
      expect(result.cubeState.isSolved()).toBe(true);
      expect(result.cubeState.toString()).toBe(SOLVED_FACELET_STRING);
    });
  });

  describe('reconstructCube - Known Scrambles', () => {
    it('reconstructs a known scrambled state from algorithm (R U R\' U\')', () => {
      let expectedCube = CubeState.createSolved();
      expectedCube = applyAlgorithm(expectedCube, "R U R' U'");

      // Extract 6 facelet arrays from expectedCube to simulate 6 camera scans
      const scannedFaces = {};
      for (const face of FACES) {
        const faceStickers = expectedCube.getFace(face);
        scannedFaces[face] = faceStickers.map(sym => ({
          color: sym,
          confidence: 0.9
        }));
      }

      const result = reconstructCube(scannedFaces);
      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(true);
      expect(result.cubeState.equals(expectedCube)).toBe(true);
    });

    it('reconstructs a known scrambled state from Checkerboard algorithm (R2 L2 U2 D2 F2 B2)', () => {
      let expectedCube = CubeState.createSolved();
      expectedCube = applyAlgorithm(expectedCube, 'R2 L2 U2 D2 F2 B2');

      const scannedFaces = {};
      for (const face of FACES) {
        const faceStickers = expectedCube.getFace(face);
        scannedFaces[face] = faceStickers.map(sym => ({
          color: sym,
          confidence: 0.9
        }));
      }

      const result = reconstructCube(scannedFaces);
      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(true);
      expect(result.cubeState.equals(expectedCube)).toBe(true);
    });

    it('reconstructs a known scrambled state from T-Perm algorithm', () => {
      let expectedCube = CubeState.createSolved();
      expectedCube = applyAlgorithm(expectedCube, "R U R' U' R' F R2 U' R' U' R U R' F'");

      const scannedFaces = {};
      for (const face of FACES) {
        const faceStickers = expectedCube.getFace(face);
        scannedFaces[face] = faceStickers.map(sym => ({
          color: sym,
          confidence: 0.9
        }));
      }

      const result = reconstructCube(scannedFaces);
      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(true);
      expect(result.cubeState.equals(expectedCube)).toBe(true);
    });
  });

  describe('reconstructCube - Validation Errors', () => {
    it('fails when fewer than 6 faces are provided', () => {
      const incompleteScans = {
        U: Array(9).fill('white'),
        R: Array(9).fill('red')
      };

      const result = reconstructCube(incompleteScans);
      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
      expect(result.diagnostic.affectedFaces).toContain('F');
    });

    it('fails when a face contains fewer than 9 stickers', () => {
      const invalidCountScans = {
        U: Array(8).fill('white'), // only 8 stickers
        R: Array(9).fill('red'),
        F: Array(9).fill('green'),
        D: Array(9).fill('yellow'),
        L: Array(9).fill('orange'),
        B: Array(9).fill('blue')
      };

      const result = reconstructCube(invalidCountScans);
      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
      expect(result.diagnostic.affectedFaces).toContain('U');
    });

    it('fails when color counts are unbalanced (e.g. 10 reds, 8 whites)', () => {
      const unbalancedScans = {
        U: ['red', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white'], // 1 red on U face
        R: Array(9).fill('red'), // 9 reds on R face = total 10 reds
        F: Array(9).fill('green'),
        D: Array(9).fill('yellow'),
        L: Array(9).fill('orange'),
        B: Array(9).fill('blue')
      };

      const result = reconstructCube(unbalancedScans);
      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
      expect(result.diagnostic.affectedFaces).toContain('U');
    });

    it('fails when corner orientation parity is violated (single twisted corner)', () => {
      let expectedCube = CubeState.createSolved();
      // Twist URF corner (facelets 8, 9, 20)
      const facelets = expectedCube.getFacelets();
      const temp = facelets[8];
      facelets[8] = facelets[9];
      facelets[9] = facelets[20];
      facelets[20] = temp;

      const scannedFaces = {
        U: facelets.slice(0, 9),
        R: facelets.slice(9, 18),
        F: facelets.slice(18, 27),
        D: facelets.slice(27, 36),
        L: facelets.slice(36, 45),
        B: facelets.slice(45, 54)
      };

      const result = reconstructCube(scannedFaces);
      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
      expect(result.validation.error.code).toBe('CORNER_TWIST_PARITY');
    });
  });
});
