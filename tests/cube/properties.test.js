import { describe, it, expect } from 'vitest';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { generateScramble } from '../../src/cube/engine/scramble.js';
import { applyMoves } from '../../src/cube/engine/applyMove.js';
import { inverseAlgorithm } from '../../src/cube/model/notation.js';
import { validate } from '../../src/cube/engine/validation.js';

describe('Cube Mathematical Properties & Invariants', () => {
  it('property: arbitrary scramble sequence inverted returns to original state', () => {
    for (let i = 0; i < 50; i++) {
      const initial = CubeState.createSolved();
      const scramble = generateScramble(25, `prop-seed-${i}`);
      const scrambled = applyMoves(initial, scramble);

      const inverse = inverseAlgorithm(scramble);
      const restored = applyMoves(scrambled, inverse);

      expect(restored.equals(initial)).toBe(true);
      expect(restored.isSolved()).toBe(true);
    }
  });

  it('property: serialization / deserialization roundtrips preserve state identically', () => {
    for (let i = 0; i < 50; i++) {
      const scramble = generateScramble(20, `roundtrip-${i}`);
      const state = applyMoves(CubeState.createSolved(), scramble);

      // String roundtrip
      const str = state.serialize('string');
      const fromStr = CubeState.deserialize(str);
      expect(fromStr.equals(state)).toBe(true);
      expect(fromStr.serialize('string')).toBe(str);

      // JSON roundtrip
      const json = state.serialize('json');
      const fromJson = CubeState.deserialize(json);
      expect(fromJson.equals(state)).toBe(true);

      // Array roundtrip
      const arr = state.serialize('array');
      const fromArr = CubeState.deserialize(arr);
      expect(fromArr.equals(state)).toBe(true);
    }
  });

  it('property: every scrambled state maintains legal cube validity', () => {
    for (let i = 0; i < 50; i++) {
      const scramble = generateScramble(30, `valid-prop-${i}`);
      const state = applyMoves(CubeState.createSolved(), scramble);
      const validation = validate(state);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    }
  });
});
