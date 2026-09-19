import { describe, it, expect } from 'vitest';
import { generateScramble, generateScrambleString } from '../../src/cube/engine/scramble.js';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { applyMoves } from '../../src/cube/engine/applyMove.js';
import { validate } from '../../src/cube/engine/validation.js';

describe('Scramble Generator', () => {
  it('generates standard 20-move scramble by default', () => {
    const scramble = generateScramble();
    expect(scramble.length).toBe(20);
  });

  it('generates scramble with custom lengths', () => {
    expect(generateScramble(10).length).toBe(10);
    expect(generateScramble(30).length).toBe(30);
    expect(generateScramble(0)).toEqual([]);
    expect(generateScramble(-5)).toEqual([]);
  });

  it('never contains consecutive moves on the same face', () => {
    for (let testRun = 0; testRun < 20; testRun++) {
      const scramble = generateScramble(30);
      for (let i = 1; i < scramble.length; i++) {
        expect(scramble[i].face).not.toBe(scramble[i - 1].face);
      }
    }
  });

  it('produces identical scrambles with identical seeds', () => {
    const s1 = generateScrambleString(25, 'cubestudio-seed-123');
    const s2 = generateScrambleString(25, 'cubestudio-seed-123');
    expect(s1).toBe(s2);
  });

  it('produces different scrambles with different seeds', () => {
    const s1 = generateScrambleString(25, 'seed-A');
    const s2 = generateScrambleString(25, 'seed-B');
    expect(s1).not.toBe(s2);
  });

  it('always produces legally solvable states when applied', () => {
    for (let i = 0; i < 10; i++) {
      const scramble = generateScramble(25);
      const solved = CubeState.createSolved();
      const scrambled = applyMoves(solved, scramble);
      const result = validate(scrambled);
      expect(result.valid).toBe(true);
    }
  });
});
