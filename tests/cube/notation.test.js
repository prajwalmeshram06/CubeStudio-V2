import { describe, it, expect } from 'vitest';
import {
  parseMove,
  parseAlgorithm,
  formatAlgorithm,
  inverseAlgorithm
} from '../../src/cube/model/notation.js';
import { STANDARD_MOVES } from '../../src/cube/model/constants.js';

describe('Notation & Algorithm Parser', () => {
  it('parses all 18 standard 3x3 moves', () => {
    for (const moveNotation of STANDARD_MOVES) {
      const move = parseMove(moveNotation);
      expect(move.notation).toBe(moveNotation);
    }
  });

  it('parses prime notations with alternative characters', () => {
    expect(parseMove("R'").notation).toBe("R'");
    expect(parseMove('R’').notation).toBe("R'");
    expect(parseMove('Ri').notation).toBe("R'");
  });

  it('rejects malformed move strings', () => {
    expect(() => parseMove('XYZ')).toThrow(/Invalid move notation/);
    expect(() => parseMove('R3')).toThrow(/Invalid move notation/);
    expect(() => parseMove('')).toThrow(/Invalid move notation/);
    expect(() => parseMove(null)).toThrow(/Invalid move input/);
  });

  it('parses algorithm sequences with flexible whitespace and newlines', () => {
    const algo = parseAlgorithm("  R   U  R' \n U'  F2  ");
    expect(algo.map(m => m.notation)).toEqual(['R', 'U', "R'", "U'", 'F2']);
  });

  it('strips inline and line comments', () => {
    const text = `
      // Setup moves
      R U R' U' # Sexy move
      F' // Finish
    `;
    const algo = parseAlgorithm(text);
    expect(formatAlgorithm(algo)).toBe("R U R' U' F'");
  });

  it('expands multiplier grouping notation', () => {
    const algo = parseAlgorithm("(R U R' U')2");
    expect(formatAlgorithm(algo)).toBe("R U R' U' R U R' U'");

    const algoWithStar = parseAlgorithm('(R U)*3');
    expect(formatAlgorithm(algoWithStar)).toBe('R U R U R U');
  });

  it('formats algorithm array back to standard string', () => {
    const parsed = parseAlgorithm("R U R' U'");
    expect(formatAlgorithm(parsed)).toBe("R U R' U'");
  });

  it('inverts algorithm sequence correctly', () => {
    // (A B C)^-1 = C^-1 B^-1 A^-1
    const inverted = inverseAlgorithm("R U R' U'");
    expect(formatAlgorithm(inverted)).toBe("U R U' R'");

    const invertedWithDouble = inverseAlgorithm('F2 R U2');
    expect(formatAlgorithm(invertedWithDouble)).toBe("U2 R' F2");
  });
});
