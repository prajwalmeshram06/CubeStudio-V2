import { describe, it, expect } from 'vitest';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { applyMove, applyMoves, applyAlgorithm } from '../../src/cube/engine/applyMove.js';
import { STANDARD_MOVES, FACES } from '../../src/cube/model/constants.js';

describe('Apply Move Engine', () => {
  it('preserves solved state when applying no moves', () => {
    const cube = CubeState.createSolved();
    expect(applyMoves(cube, []).isSolved()).toBe(true);
  });

  it('scrambles a solved cube upon any standard move', () => {
    for (const move of STANDARD_MOVES) {
      const cube = CubeState.createSolved();
      const moved = applyMove(cube, move);
      expect(moved.isSolved()).toBe(false);
      // Ensure centers never change position
      for (const face of FACES) {
        expect(moved.getCenter(face)).toBe(face);
      }
    }
  });

  it('verifies 4 quarter turns return to initial state (M^4 = I)', () => {
    const quarterMoves = ['U', 'D', 'L', 'R', 'F', 'B', "U'", "D'", "L'", "R'", "F'", "B'"];
    for (const move of quarterMoves) {
      let cube = CubeState.createSolved();
      for (let i = 0; i < 4; i++) {
        cube = applyMove(cube, move);
      }
      expect(cube.isSolved()).toBe(true);
    }
  });

  it('verifies 2 double turns return to initial state ((M2)^2 = I)', () => {
    const doubleMoves = ['U2', 'D2', 'L2', 'R2', 'F2', 'B2'];
    for (const move of doubleMoves) {
      let cube = CubeState.createSolved();
      cube = applyMove(cube, move);
      cube = applyMove(cube, move);
      expect(cube.isSolved()).toBe(true);
    }
  });

  it('verifies move followed by its inverse returns to initial state', () => {
    for (const move of STANDARD_MOVES) {
      const cube = CubeState.createSolved();
      const moved = applyMove(cube, move);
      // Find inverse
      const invMove = move.endsWith('2')
        ? move
        : move.endsWith("'")
          ? move.slice(0, 1)
          : `${move}'`;
      const restored = applyMove(moved, invMove);
      expect(restored.isSolved()).toBe(true);
    }
  });

  it('verifies Sexy Move order of 6: (R U R\' U\')^6 = I', () => {
    let cube = CubeState.createSolved();
    for (let i = 0; i < 6; i++) {
      cube = applyAlgorithm(cube, "R U R' U'");
    }
    expect(cube.isSolved()).toBe(true);
  });

  it('verifies T-Perm order of 2: (T-Perm)^2 = I', () => {
    const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
    let cube = CubeState.createSolved();
    cube = applyAlgorithm(cube, tPerm);
    expect(cube.isSolved()).toBe(false);
    cube = applyAlgorithm(cube, tPerm);
    expect(cube.isSolved()).toBe(true);
  });

  it('verifies Checkerboard algorithm applied twice returns to solved: (R2 L2 U2 D2 F2 B2)^2 = I', () => {
    const checker = 'R2 L2 U2 D2 F2 B2';
    let cube = CubeState.createSolved();
    cube = applyAlgorithm(cube, checker);
    expect(cube.isSolved()).toBe(false);
    cube = applyAlgorithm(cube, checker);
    expect(cube.isSolved()).toBe(true);
  });

  it('verifies Sune algorithm order of 6: (R U R\' U R U2 R\')^6 = I', () => {
    const sune = "R U R' U R U2 R'";
    let cube = CubeState.createSolved();
    for (let i = 0; i < 6; i++) {
      cube = applyAlgorithm(cube, sune);
    }
    expect(cube.isSolved()).toBe(true);
  });
});
