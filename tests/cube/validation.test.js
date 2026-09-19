import { describe, it, expect } from 'vitest';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { validate, VALIDATION_ERRORS } from '../../src/cube/engine/validation.js';
import { applyAlgorithm } from '../../src/cube/engine/applyMove.js';
import { SOLVED_FACELET_STRING } from '../../src/cube/model/constants.js';

describe('Validation Engine', () => {
  it('validates a solved cube as valid', () => {
    const cube = CubeState.createSolved();
    const result = validate(cube);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validates legal scrambled cubes as valid', () => {
    let cube = CubeState.createSolved();
    cube = applyAlgorithm(cube, "R U R' U' F2 D L' B2 U2 R");
    const result = validate(cube);
    expect(result.valid).toBe(true);
  });

  it('rejects malformed inputs and invalid length', () => {
    expect(validate(null).error?.code).toBe(VALIDATION_ERRORS.MALFORMED_DATA);
    expect(validate('UUUU').error?.code).toBe(VALIDATION_ERRORS.MALFORMED_DATA);
    expect(validate(new Array(53).fill('U')).error?.code).toBe(VALIDATION_ERRORS.MALFORMED_DATA);
  });

  it('rejects invalid facelet symbols', () => {
    const chars = SOLVED_FACELET_STRING.split('');
    chars[0] = 'X';
    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.INVALID_SYMBOLS);
  });

  it('rejects incorrect sticker counts', () => {
    const chars = SOLVED_FACELET_STRING.split('');
    // Swap a U with a D: 10 D's and 8 U's
    chars[0] = 'D';
    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.INVALID_COUNTS);
  });

  it('rejects invalid center stickers', () => {
    const chars = SOLVED_FACELET_STRING.split('');
    // Center of U is at index 4, center of D is at index 31
    chars[4] = 'D';
    chars[31] = 'U';
    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.INVALID_CENTERS);
  });

  it('rejects impossible corner piece colors', () => {
    // Corner U-R-F has indices U8 (8), R0 (9), F2 (20).
    // If we put opposing colors U and D on the same corner:
    const chars = SOLVED_FACELET_STRING.split('');
    // Replace F2 (20) with D (yellow), making a U-R-D corner (impossible)
    // To balance counts, change D2 (29) to F
    chars[20] = 'D';
    chars[29] = 'F';
    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.IMPOSSIBLE_PIECE);
  });

  it('rejects duplicate corners', () => {
    // Replace UFL corner with another URF corner, and replace DFR corner with another DLF corner.
    // This perfectly balances all color counts to 9 while having duplicate pieces!
    const chars = SOLVED_FACELET_STRING.split('');
    // UFL slot [6, 18, 38] gets ['U', 'R', 'F'] (duplicate URF)
    chars[18] = 'R';
    chars[38] = 'F';
    // DFR slot [29, 26, 15] gets ['D', 'F', 'L'] (duplicate DLF)
    chars[15] = 'L';

    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.DUPLICATE_PIECES);
  });

  it('rejects duplicate edges', () => {
    // UR: [5, 10] (U, R); UF: [7, 19] (U, F); DR: [32, 16] (D, R); DF: [28, 25] (D, F)
    // Replace UF with duplicate UR, and replace DR with duplicate DF:
    // UR + UR + DF + DF = 2 U, 2 D, 2 R, 2 F (same as UR + UF + DR + DF)
    const chars = SOLVED_FACELET_STRING.split('');
    // UF slot [7, 19] gets ['U', 'R'] (duplicate UR)
    chars[19] = 'R';
    // DR slot [32, 16] gets ['D', 'F'] (duplicate DF)
    chars[16] = 'F';

    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.DUPLICATE_PIECES);
  });

  it('rejects single twisted corner (corner twist parity violation)', () => {
    // Twist URF corner (indices 8, 9, 20) clockwise:
    // Original: U8='U', R0='R', F2='F'
    // Twisted CW: U8='F', R0='U', F2='R'
    const chars = SOLVED_FACELET_STRING.split('');
    chars[8] = 'F';
    chars[9] = 'U';
    chars[20] = 'R';
    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.CORNER_TWIST_PARITY);
  });

  it('rejects single flipped edge (edge flip parity violation)', () => {
    // Flip UR edge (indices U5=5, R1=10):
    // Original: 5='U', 10='R'
    // Flipped: 5='R', 10='U'
    const chars = SOLVED_FACELET_STRING.split('');
    chars[5] = 'R';
    chars[10] = 'U';
    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.EDGE_FLIP_PARITY);
  });

  it('rejects swap of two edges only (permutation parity violation)', () => {
    // Swap UR edge (5, 10) and UF edge (7, 19)
    const chars = SOLVED_FACELET_STRING.split('');
    // UR: 'U', 'R'
    // UF: 'U', 'F'
    chars[10] = 'F';
    chars[19] = 'R';
    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.PERMUTATION_PARITY);
  });

  it('rejects swap of two corners only (permutation parity violation)', () => {
    // Swap URF (8, 9, 20) and UFL (6, 18, 38)
    const chars = SOLVED_FACELET_STRING.split('');
    // URF was U, R, F
    // UFL was U, F, L
    chars[8] = 'U';
    chars[9] = 'F';
    chars[20] = 'L';

    chars[6] = 'U';
    chars[18] = 'R';
    chars[38] = 'F';

    const result = validate(chars);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe(VALIDATION_ERRORS.PERMUTATION_PARITY);
  });
});
